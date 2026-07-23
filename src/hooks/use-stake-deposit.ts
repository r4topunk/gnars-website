"use client";

// Stake into a rider's sponsorship vault: approve USDC, then deposit. Shares go
// to the depositor, so the principal stays theirs and they can withdraw any
// time — only the yield is split (50% depositor / 25% Gnars / 25% athlete).
//
// USDC only: the vaults are Morpho V2 USDC vaults. The ETH option on /stake has
// no vault behind it yet.

import { useCallback, useState } from "react";
import { prepareTransaction, sendTransaction, waitForReceipt } from "thirdweb";
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
}] as const;

export type StakePhase = "idle" | "approve" | "deposit" | "done" | "error";

export function useStakeDeposit() {
  const writer = useWriteAccount();
  const [phase, setPhase] = useState<StakePhase>("idle");
  const [error, setError] = useState<string | null>(null);

  const stake = useCallback(
    async (vault: Address, amountUsdc: string): Promise<boolean> => {
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

      try {
        await ensureOnChain(writer.wallet, base);

        setPhase("approve");
        const approveData = encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [vault, assets] });
        const approveTx = prepareTransaction({ client, chain: base, to: USDC, data: approveData });
        const approveHash = (await sendTransaction({ account, transaction: approveTx })).transactionHash;
        await waitForReceipt({ client, chain: base, transactionHash: approveHash });

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
      }
    },
    [writer],
  );

  return { stake, phase, error, isStaking: phase === "approve" || phase === "deposit" };
}
