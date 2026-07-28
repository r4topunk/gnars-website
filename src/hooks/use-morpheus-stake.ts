"use client";

// Morpheus stake / withdraw on Ethereum MAINNET (phases 1–2).
//
// stake() passes the athlete's wallet as `referrer_`, so the athlete accrues a
// protocol-funded referral bonus (3–15% tiered) at zero cost to the depositor —
// this is the athlete's "cut", since Morpheus has no fee skim to route through a
// split. The claim flow (MOR out, LayerZero fee) and the opt-in donate split
// come in a later phase.
//
// Everything is a real mainnet tx (gas is not cheap) — the UI flags that.
import { useCallback, useRef, useState } from "react";
import {
  getContract,
  prepareTransaction,
  readContract,
  sendTransaction,
  waitForReceipt,
  type ThirdwebClient,
} from "thirdweb";
import { ethereum } from "thirdweb/chains";
import {
  createPublicClient,
  encodeAbiParameters,
  encodeFunctionData,
  erc20Abi,
  fallback,
  http,
  parseUnits,
  type Address,
} from "viem";
import { mainnet } from "viem/chains";
import { useWriteAccount } from "@/hooks/use-write-account";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { predictSplitAddress } from "@/lib/mor-split";
import {
  depositPoolAbi,
  L1_SENDER,
  LZ_ADAPTER_PARAMS,
  LZ_DST_CHAIN_ID,
  LZ_GATEWAY,
  lzEndpointAbi,
  MOR_REWARD_POOL_INDEX,
  MORPHEUS_DISTRIBUTOR,
  MORPHEUS_POOLS,
  type MorpheusAsset,
} from "@/lib/morpheus";
import { requestRevalidation } from "@/lib/request-revalidation";
import { getThirdwebClient } from "@/lib/thirdweb";
import { ensureOnChain } from "@/lib/thirdweb-tx";

/** Quote the LayerZero native fee for a claim (payload is fixed-size, so amount is nominal). */
async function quoteClaimFee(user: Address, amount: bigint): Promise<bigint> {
  const payload = encodeAbiParameters([{ type: "address" }, { type: "uint256" }], [user, amount]);
  const [nativeFee] = await rpc.readContract({
    address: LZ_GATEWAY,
    abi: lzEndpointAbi,
    functionName: "estimateFees",
    args: [LZ_DST_CHAIN_ID, L1_SENDER, payload, false, LZ_ADAPTER_PARAMS],
  });
  return (nativeFee * BigInt(120)) / BigInt(100); // +20% margin; excess is refunded on-chain
}

const rpc = createPublicClient({
  chain: mainnet,
  transport: fallback([
    http("https://ethereum.publicnode.com"),
    http("https://eth.llamarpc.com"),
    http("https://rpc.ankr.com/eth"),
  ]),
});
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// A mainnet tx that never confirms (dropped / underpriced / left unsigned) would
// otherwise leave the button spinning on "approving" forever. Bound the wait so
// it surfaces a clear, retryable error instead — a later confirmation just sets
// the allowance, so the retry skips straight to the stake.
const RECEIPT_TIMEOUT_MS = 120_000;
async function waitReceipt(client: ThirdwebClient, transactionHash: `0x${string}`): Promise<void> {
  await Promise.race([
    waitForReceipt({ client, chain: ethereum, transactionHash }),
    new Promise((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              "Transaction is taking too long to confirm — check your wallet and tap again.",
            ),
          ),
        RECEIPT_TIMEOUT_MS,
      ),
    ),
  ]);
}

const ALLOWANCE =
  "function allowance(address owner, address spender) view returns (uint256)" as const;

/**
 * Confirm the pool's allowance is high enough *on the RPC that will estimate the
 * stake* before we send it. Mainnet is ~12s/block and the free fallback RPCs lag
 * each other, so we treat thirdweb's node (the one that gas-estimates the write)
 * as the source of truth and use the viem fallback only as a secondary signal.
 * Returns false if the allowance never propagates in the poll window — the
 * caller then aborts with a friendly "try again" instead of broadcasting a tx
 * that reverts with "transfer amount exceeds allowance".
 */
async function confirmAllowance(
  client: ThirdwebClient,
  token: Address,
  owner: Address,
  spender: Address,
  needed: bigint,
  tries = 24,
): Promise<boolean> {
  const contract = getContract({ client, chain: ethereum, address: token });
  for (let i = 0; i < tries; i++) {
    try {
      const a = await readContract({ contract, method: ALLOWANCE, params: [owner, spender] });
      if (a >= needed) return true;
    } catch {
      /* keep polling */
    }
    try {
      const a = await rpc.readContract({
        address: token,
        abi: erc20Abi,
        functionName: "allowance",
        args: [owner, spender],
      });
      if (a >= needed) return true;
    } catch {
      /* keep polling */
    }
    await sleep(2000);
  }
  return false;
}

export type MorpheusPhase =
  | "idle"
  | "approve"
  | "stake"
  | "setReceiver"
  | "withdraw"
  | "claim"
  | "done"
  | "error";

export function useMorpheusStake() {
  const writer = useWriteAccount();
  const [phase, setPhase] = useState<MorpheusPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);

  /** Stake `amount` of the asset, crediting the athlete as referrer. `claimLockEnd`
   * (unix seconds, 0 = none) is the optional power-factor lock: it defers when the
   * MOR can be CLAIMED, boosting the reward multiplier — it does NOT lock the
   * deposit (that follows the 7-day withdraw rule). */
  const stake = useCallback(
    async (
      asset: MorpheusAsset,
      amount: string,
      athlete: Address,
      claimLockEnd = 0,
    ): Promise<boolean> => {
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
      const { pool, token, decimals } = MORPHEUS_POOLS[asset];

      let assets: bigint;
      try {
        assets = parseUnits(amount, decimals);
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
        await ensureOnChain(writer.wallet, ethereum);

        // The Distributor (not the DepositPool we call `stake` on) is what pulls
        // the deposit token, so the approval must name the distributor as spender.
        const spender = MORPHEUS_DISTRIBUTOR;
        const allowance = await rpc.readContract({
          address: token,
          abi: erc20Abi,
          functionName: "allowance",
          args: [account.address as Address, spender],
        });
        if (allowance < assets) {
          setPhase("approve");
          const approveData = encodeFunctionData({
            abi: erc20Abi,
            functionName: "approve",
            args: [spender, assets],
          });
          const approveTx = prepareTransaction({
            client,
            chain: ethereum,
            to: token,
            data: approveData,
          });
          const hash = (await sendTransaction({ account, transaction: approveTx })).transactionHash;
          await waitReceipt(client, hash);
          // Wait until the allowance is actually visible on the estimation RPC —
          // otherwise the stake reverts with "transfer amount exceeds allowance".
          // If it never propagates, abort cleanly rather than broadcasting a
          // doomed tx.
          const ok = await confirmAllowance(
            client,
            token,
            account.address as Address,
            spender,
            assets,
          );
          if (!ok) {
            setError(
              "Approval is still confirming on-chain — give it a few seconds and tap Stake again.",
            );
            setPhase("error");
            return false;
          }
        }

        setPhase("stake");
        // claimLockEnd > 0 → defer MOR claims until then for a bigger reward
        // multiplier (power factor); 0 keeps only the protocol's 7-day default.
        const stakeData = encodeFunctionData({
          abi: depositPoolAbi,
          functionName: "stake",
          args: [
            MOR_REWARD_POOL_INDEX,
            assets,
            BigInt(Math.max(0, Math.floor(claimLockEnd))),
            athlete,
          ],
        });
        const sendStake = async () => {
          const tx = prepareTransaction({ client, chain: ethereum, to: pool, data: stakeData });
          return (await sendTransaction({ account, transaction: tx })).transactionHash;
        };
        let stakeHash: `0x${string}`;
        try {
          stakeHash = await sendStake();
        } catch {
          await sleep(4000);
          stakeHash = await sendStake();
        }
        await waitReceipt(client, stakeHash);

        // Route this position's MOR to the staker's deterministic 3-way split by
        // default (opt-out): staker 50 / Gnars 25 / athlete 25. Only the staker
        // can set their own receiver, so this is a 2nd signature. Non-fatal: the
        // stake already succeeded, and the receiver can also be set at claim time.
        try {
          setPhase("setReceiver");
          const split = await predictSplitAddress(account.address as Address, athlete);
          const rData = encodeFunctionData({
            abi: depositPoolAbi,
            functionName: "setClaimReceiver",
            args: [MOR_REWARD_POOL_INDEX, split],
          });
          const rTx = prepareTransaction({ client, chain: ethereum, to: pool, data: rData });
          const rHash = (await sendTransaction({ account, transaction: rTx })).transactionHash;
          await waitReceipt(client, rHash);
        } catch {
          /* receiver not set; claim can still target the split explicitly */
        }

        // A MOR stake shows up in the orbit as a green stream — drop the server
        // `stake` cache so other users see it without waiting out the TTL.
        requestRevalidation([CACHE_TAGS.stake]);
        setPhase("done");
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Stake failed.");
        setPhase("error");
        return false;
      } finally {
        pending.current = false;
      }
    },
    [writer],
  );

  /** Withdraw staked principal (reverts before the 7-day lock lifts). */
  const withdraw = useCallback(
    async (asset: MorpheusAsset, amount: string): Promise<boolean> => {
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
      const { pool, decimals } = MORPHEUS_POOLS[asset];

      let assets: bigint;
      try {
        assets = parseUnits(amount, decimals);
      } catch {
        setError("Invalid amount.");
        setPhase("error");
        return false;
      }

      const account = writer.account;
      setError(null);
      pending.current = true;
      try {
        await ensureOnChain(writer.wallet, ethereum);
        setPhase("withdraw");
        const data = encodeFunctionData({
          abi: depositPoolAbi,
          functionName: "withdraw",
          args: [MOR_REWARD_POOL_INDEX, assets],
        });
        const tx = prepareTransaction({ client, chain: ethereum, to: pool, data });
        const hash = (await sendTransaction({ account, transaction: tx })).transactionHash;
        await waitReceipt(client, hash);
        requestRevalidation([CACHE_TAGS.stake]);
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
   * Claim accrued MOR to `receiver` (own wallet for self-claim, or a Gnars/athlete
   * split for donate mode). Pays the quoted LayerZero fee; excess is refunded.
   */
  const claim = useCallback(
    async (asset: MorpheusAsset, receiver: Address): Promise<boolean> => {
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
      const { pool } = MORPHEUS_POOLS[asset];
      const account = writer.account;
      setError(null);
      pending.current = true;
      try {
        await ensureOnChain(writer.wallet, ethereum);
        setPhase("claim");
        const pending_ = await rpc.readContract({
          address: pool,
          abi: depositPoolAbi,
          functionName: "getLatestUserReward",
          args: [MOR_REWARD_POOL_INDEX, account.address as Address],
        });
        if (pending_ <= BigInt(0)) {
          setError("No MOR to claim yet.");
          setPhase("error");
          return false;
        }
        const fee = await quoteClaimFee(account.address as Address, pending_);
        const data = encodeFunctionData({
          abi: depositPoolAbi,
          functionName: "claim",
          args: [MOR_REWARD_POOL_INDEX, receiver],
        });
        const tx = prepareTransaction({ client, chain: ethereum, to: pool, data, value: fee });
        const hash = (await sendTransaction({ account, transaction: tx })).transactionHash;
        await waitReceipt(client, hash);
        requestRevalidation([CACHE_TAGS.stake]);
        setPhase("done");
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Claim failed.");
        setPhase("error");
        return false;
      } finally {
        pending.current = false;
      }
    },
    [writer],
  );

  /**
   * Donate mode: point this pool's claim receiver at a Gnars/athlete split.
   * Once set, every future claim (self OR a permissionless keeper `claimFor`)
   * routes 100% of this position's MOR to the split. Set receiver = own wallet
   * to turn donate mode off.
   */
  const setDonateReceiver = useCallback(
    async (asset: MorpheusAsset, receiver: Address): Promise<boolean> => {
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
      const { pool } = MORPHEUS_POOLS[asset];
      const account = writer.account;
      setError(null);
      pending.current = true;
      try {
        await ensureOnChain(writer.wallet, ethereum);
        setPhase("stake");
        const data = encodeFunctionData({
          abi: depositPoolAbi,
          functionName: "setClaimReceiver",
          args: [MOR_REWARD_POOL_INDEX, receiver],
        });
        const tx = prepareTransaction({ client, chain: ethereum, to: pool, data });
        const hash = (await sendTransaction({ account, transaction: tx })).transactionHash;
        await waitReceipt(client, hash);
        requestRevalidation([CACHE_TAGS.stake]);
        setPhase("done");
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to set donate mode.");
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
    withdraw,
    claim,
    setDonateReceiver,
    phase,
    error,
    isBusy:
      phase === "approve" ||
      phase === "stake" ||
      phase === "setReceiver" ||
      phase === "withdraw" ||
      phase === "claim",
  };
}
