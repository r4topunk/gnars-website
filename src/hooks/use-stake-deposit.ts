"use client";

// Stake into a rider's sponsorship vault: approve USDC, then deposit. Shares go
// to the depositor, so the principal stays theirs and they can withdraw any
// time — only the yield is split (50% depositor / 25% Gnars / 25% athlete).
//
// USDC only: the vaults are Morpho V2 USDC vaults. The ETH option on /stake has
// no vault behind it yet.

import { useCallback, useRef, useState } from "react";
import { prepareTransaction, sendTransaction, waitForReceipt, readContract, getContract } from "thirdweb";
import { base } from "thirdweb/chains";
import { encodeFunctionData, parseUnits, type Address } from "viem";
import { useWriteAccount } from "@/hooks/use-write-account";
import { ensureOnChain } from "@/lib/thirdweb-tx";
import { getThirdwebClient } from "@/lib/thirdweb";
import { USDC } from "@/lib/sponsorship-vaults";

const erc20Abi = [{
  type: "function", name: "approve", stateMutability: "nonpayable",
  inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }],
}] as const;

const vaultAbi = [{
  type: "function", name: "deposit", stateMutability: "nonpayable",
  inputs: [{ type: "uint256" }, { type: "address" }], outputs: [{ type: "uint256" }],
}, {
  // Redeem by shares (not withdraw by assets): redeeming the exact share balance
  // can't leave a rounding remainder that reverts a "withdraw everything".
  type: "function", name: "redeem", stateMutability: "nonpayable",
  inputs: [{ type: "uint256" }, { type: "address" }, { type: "address" }], outputs: [{ type: "uint256" }],
}] as const;

// Reads used to skip a redundant approve and to refuse deposits that would
// round down to zero shares.
const ALLOWANCE = "function allowance(address owner, address spender) view returns (uint256)" as const;
const PREVIEW_DEPOSIT = "function previewDeposit(uint256 assets) view returns (uint256)" as const;

export type StakePhase = "idle" | "approve" | "deposit" | "withdraw" | "done" | "error";

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
      if (!client) { setError("Thirdweb não configurado."); setPhase("error"); return false; }
      if (!writer) { setError("Conecte a carteira."); setPhase("error"); return false; }

      let assets: bigint;
      try {
        assets = parseUnits(amountUsdc, 6); // USDC has 6 decimals
      } catch {
        setError("Valor inválido."); setPhase("error"); return false;
      }
      if (assets <= BigInt(0)) { setError("Valor inválido."); setPhase("error"); return false; }

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
          setError("Valor muito pequeno — não geraria posição no cofre.");
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
          const approveData = encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [vault, assets] });
          const approveTx = prepareTransaction({ client, chain: base, to: USDC, data: approveData });
          const approveHash = (await sendTransaction({ account, transaction: approveTx })).transactionHash;
          await waitForReceipt({ client, chain: base, transactionHash: approveHash });
        }

        setPhase("deposit");
        const depositData = encodeFunctionData({
          abi: vaultAbi, functionName: "deposit", args: [assets, account.address as Address],
        });
        const depositTx = prepareTransaction({ client, chain: base, to: vault, data: depositData });
        const depositHash = (await sendTransaction({ account, transaction: depositTx })).transactionHash;
        await waitForReceipt({ client, chain: base, transactionHash: depositHash });

        setPhase("done");
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha no depósito.");
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
      if (!client) { setError("Thirdweb não configurado."); setPhase("error"); return false; }
      if (!writer) { setError("Conecte a carteira."); setPhase("error"); return false; }
      if (shares <= BigInt(0)) { setError("Nada para sacar."); setPhase("error"); return false; }

      const account = writer.account;
      setError(null);
      pending.current = true;

      try {
        await ensureOnChain(writer.wallet, base);
        setPhase("withdraw");
        const data = encodeFunctionData({
          abi: vaultAbi, functionName: "redeem",
          args: [shares, account.address as Address, account.address as Address],
        });
        const tx = prepareTransaction({ client, chain: base, to: vault, data });
        const hash = (await sendTransaction({ account, transaction: tx })).transactionHash;
        await waitForReceipt({ client, chain: base, transactionHash: hash });
        setPhase("done");
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha no saque.");
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
    phase,
    error,
    isStaking: phase === "approve" || phase === "deposit" || phase === "withdraw",
    /** The account that deposits/withdraws — read positions for this one. */
    account: writer?.account.address ?? null,
  };
}
