"use client";

// Stake into a rider's sponsorship vault: approve USDC, then deposit. Shares go
// to the depositor, so the principal stays theirs and they can withdraw any
// time — only the yield is split (50% depositor / 25% Gnars / 25% athlete).
//
// USDC only: the vaults are Morpho V2 USDC vaults. The ETH option on /stake has
// no vault behind it yet.
import { useCallback, useRef, useState } from "react";
import {
  getContract,
  prepareTransaction,
  readContract,
  sendTransaction,
  waitForReceipt,
  type ThirdwebClient,
} from "thirdweb";
import { base } from "thirdweb/chains";
import {
  createPublicClient,
  encodeFunctionData,
  fallback,
  http,
  parseUnits,
  erc20Abi as viemErc20Abi,
  type Address,
} from "viem";
import { base as viemBase } from "viem/chains";
import { useWriteAccount } from "@/hooks/use-write-account";
import { USDC } from "@/lib/sponsorship-vaults";
import { getThirdwebClient } from "@/lib/thirdweb";
import { ensureOnChain } from "@/lib/thirdweb-tx";

// Our own multi-endpoint client — after the approve is mined, the wallet's RPC
// can still be a block behind, so the deposit's gas estimation doesn't see the
// fresh allowance and reverts (the "click twice" bug). Confirm propagation here
// before sending the deposit.
const rpc = createPublicClient({
  chain: viemBase,
  transport: fallback([
    http("https://mainnet.base.org"),
    http("https://base-rpc.publicnode.com"),
    http("https://base.drpc.org"),
  ]),
});
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Confirm the vault's allowance is visible on the RPC that estimates the deposit
// (thirdweb's node) — not just the viem fallback, which can lag out of sync and
// let a doomed "transfer amount exceeds allowance" tx through. Returns false if
// it never propagates so the caller can abort cleanly.
async function confirmAllowance(
  client: ThirdwebClient,
  owner: Address,
  spender: Address,
  needed: bigint,
  tries = 16,
): Promise<boolean> {
  const contract = getContract({ client, chain: base, address: USDC });
  for (let i = 0; i < tries; i++) {
    try {
      const a = await readContract({ contract, method: ALLOWANCE, params: [owner, spender] });
      if (a >= needed) return true;
    } catch {
      /* keep polling */
    }
    try {
      const a = await rpc.readContract({
        address: USDC,
        abi: viemErc20Abi,
        functionName: "allowance",
        args: [owner, spender],
      });
      if (a >= needed) return true;
    } catch {
      /* keep polling */
    }
    await sleep(1500);
  }
  return false;
}

const erc20Abi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [{ type: "address" }, { type: "uint256" }],
    outputs: [{ type: "bool" }],
  },
] as const;

const vaultAbi = [
  {
    type: "function",
    name: "deposit",
    stateMutability: "nonpayable",
    inputs: [{ type: "uint256" }, { type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    // Redeem by shares (not withdraw by assets): redeeming the exact share balance
    // can't leave a rounding remainder that reverts a "withdraw everything".
    type: "function",
    name: "redeem",
    stateMutability: "nonpayable",
    inputs: [{ type: "uint256" }, { type: "address" }, { type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    // Withdraw by assets — used to pull only the earned amount, leaving principal.
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [{ type: "uint256" }, { type: "address" }, { type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

// Reads used to skip a redundant approve and to refuse deposits that would
// round down to zero shares.
const ALLOWANCE =
  "function allowance(address owner, address spender) view returns (uint256)" as const;
const PREVIEW_DEPOSIT = "function previewDeposit(uint256 assets) view returns (uint256)" as const;

export type StakePhase = "idle" | "approve" | "deposit" | "withdraw" | "claim" | "done" | "error";

export function useStakeDeposit() {
  const writer = useWriteAccount();
  const [phase, setPhase] = useState<StakePhase>("idle");
  const [error, setError] = useState<string | null>(null);
  // Guards against a second concurrent run — a double-click, or closing and
  // reopening the dialog (which remounts the hook and resets `phase` while the
  // previous promise is still in flight). A rendered `disabled` prop lags React's
  // state commit, so it can't be the only protection.
  const pending = useRef(false);

  const stake = useCallback(
    async (vault: Address, amountUsdc: string): Promise<boolean> => {
      if (pending.current) return false;
      const client = getThirdwebClient();
      if (!client) {
        setError("Thirdweb not configured.");
        setPhase("error");
        return false;
      }
      if (!writer) {
        setError("Connect your wallet.");
        setPhase("error");
        return false;
      }

      let assets: bigint;
      try {
        assets = parseUnits(amountUsdc, 6); // USDC has 6 decimals
      } catch {
        setError("Invalid amount.");
        setPhase("error");
        return false;
      }
      if (assets <= BigInt(0)) {
        setError("Invalid amount.");
        setPhase("error");
        return false;
      }

      const account = writer.account;
      setError(null);
      pending.current = true;

      try {
        await ensureOnChain(writer.wallet, base);

        // previewDeposit rounds down, so a small enough amount mints 0 shares
        // while the USDC still leaves the wallet. Refuse instead of swallowing it.
        const shares = await readContract({
          contract: getContract({ client, chain: base, address: vault }),
          method: PREVIEW_DEPOSIT,
          params: [assets],
        });
        if (shares <= BigInt(0)) {
          setError("Amount too small — it wouldn't create a position.");
          setPhase("error");
          return false;
        }

        // Skip the approve when the allowance already covers this deposit —
        // saves a signature on retries and avoids a redundant on-chain tx.
        const allowance = await readContract({
          contract: getContract({ client, chain: base, address: USDC }),
          method: ALLOWANCE,
          params: [account.address as Address, vault],
        });

        if (allowance < assets) {
          setPhase("approve");
          const approveData = encodeFunctionData({
            abi: erc20Abi,
            functionName: "approve",
            args: [vault, assets],
          });
          const approveTx = prepareTransaction({
            client,
            chain: base,
            to: USDC,
            data: approveData,
          });
          const approveHash = (await sendTransaction({ account, transaction: approveTx }))
            .transactionHash;
          await waitForReceipt({ client, chain: base, transactionHash: approveHash });
          // Don't send the deposit until the allowance is actually visible — this
          // is what makes a single click work instead of failing with a scary
          // "insufficient allowance" and needing a second try.
          const ok = await confirmAllowance(client, account.address as Address, vault, assets);
          if (!ok) {
            setError(
              "Approval is still confirming on-chain — give it a few seconds and tap Stake again.",
            );
            setPhase("error");
            return false;
          }
        }

        setPhase("deposit");
        const depositData = encodeFunctionData({
          abi: vaultAbi,
          functionName: "deposit",
          args: [assets, account.address as Address],
        });
        const sendDeposit = async () => {
          const depositTx = prepareTransaction({
            client,
            chain: base,
            to: vault,
            data: depositData,
          });
          return (await sendTransaction({ account, transaction: depositTx })).transactionHash;
        };
        let depositHash: `0x${string}`;
        try {
          depositHash = await sendDeposit();
        } catch {
          // Estimation can still trip on a lagging RPC right after the approve;
          // give it a moment and try once more before surfacing an error.
          await sleep(4000);
          depositHash = await sendDeposit();
        }
        await waitForReceipt({ client, chain: base, transactionHash: depositHash });

        setPhase("done");
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Deposit failed.");
        setPhase("error");
        return false;
      } finally {
        pending.current = false;
      }
    },
    [writer],
  );

  /**
   * Withdraw the caller's whole position by redeeming every share they hold.
   * The principal was always theirs — this is the path that makes that true in
   * the product, not just on-chain.
   */
  const withdrawAll = useCallback(
    async (vault: Address, shares: bigint): Promise<boolean> => {
      if (pending.current) return false;
      const client = getThirdwebClient();
      if (!client) {
        setError("Thirdweb not configured.");
        setPhase("error");
        return false;
      }
      if (!writer) {
        setError("Connect your wallet.");
        setPhase("error");
        return false;
      }
      if (shares <= BigInt(0)) {
        setError("Nothing to withdraw.");
        setPhase("error");
        return false;
      }

      const account = writer.account;
      setError(null);
      pending.current = true;

      try {
        await ensureOnChain(writer.wallet, base);
        setPhase("withdraw");
        const data = encodeFunctionData({
          abi: vaultAbi,
          functionName: "redeem",
          args: [shares, account.address as Address, account.address as Address],
        });
        const tx = prepareTransaction({ client, chain: base, to: vault, data });
        const hash = (await sendTransaction({ account, transaction: tx })).transactionHash;
        await waitForReceipt({ client, chain: base, transactionHash: hash });
        setPhase("done");
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Withdrawal failed.");
        setPhase("error");
        return false;
      } finally {
        pending.current = false;
      }
    },
    [writer],
  );

  /**
   * Withdraw only the earned amount (in USDC micro-units), leaving the principal
   * staked and still earning. The yield lives in the share price, so this burns
   * just the shares worth `earnedRaw`.
   */
  const claimRewards = useCallback(
    async (vault: Address, earnedRaw: bigint): Promise<boolean> => {
      if (pending.current) return false;
      const client = getThirdwebClient();
      if (!client) {
        setError("Thirdweb not configured.");
        setPhase("error");
        return false;
      }
      if (!writer) {
        setError("Connect your wallet.");
        setPhase("error");
        return false;
      }
      if (earnedRaw <= BigInt(0)) {
        setError("No earnings to claim.");
        setPhase("error");
        return false;
      }

      const account = writer.account;
      setError(null);
      pending.current = true;
      try {
        await ensureOnChain(writer.wallet, base);
        setPhase("claim");
        const data = encodeFunctionData({
          abi: vaultAbi,
          functionName: "withdraw",
          args: [earnedRaw, account.address as Address, account.address as Address],
        });
        const tx = prepareTransaction({ client, chain: base, to: vault, data });
        const hash = (await sendTransaction({ account, transaction: tx })).transactionHash;
        await waitForReceipt({ client, chain: base, transactionHash: hash });
        setPhase("done");
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to claim earnings.");
        setPhase("error");
        return false;
      } finally {
        pending.current = false;
      }
    },
    [writer],
  );

  return {
    stake,
    withdrawAll,
    claimRewards,
    phase,
    error,
    isStaking:
      phase === "approve" || phase === "deposit" || phase === "withdraw" || phase === "claim",
    /** The account that deposits/withdraws — read positions for this one. */
    account: writer?.account.address ?? null,
  };
}
