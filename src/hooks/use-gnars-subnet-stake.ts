"use client";

// Stake / withdraw MOR on the Gnars Builder subnet (Base). deposit() locks MOR
// into the subnet (7-day withdraw lock); withdraw() pulls principal back after
// the lock. Rewards accrue at the subnet level (builder-claimed), so there's no
// per-staker claim here. Mirrors use-morpheus-stake.ts but on Base.

import { useCallback, useRef, useState } from "react";
import { prepareTransaction, sendTransaction, waitForReceipt } from "thirdweb";
import { base as thirdwebBase } from "thirdweb/chains";
import { createPublicClient, http, fallback, encodeFunctionData, parseUnits, type Address } from "viem";
import { base } from "viem/chains";
import { useWriteAccount } from "@/hooks/use-write-account";
import { ensureOnChain } from "@/lib/thirdweb-tx";
import { getThirdwebClient } from "@/lib/thirdweb";
import {
  BUILDERS, GNARS_SUBNET_ID, MOR_BASE, MOR_DECIMALS, BASE_RPCS, buildersAbi, erc20AbiMin,
} from "@/lib/morpheus-builder";

const rpc = createPublicClient({ chain: base, transport: fallback(BASE_RPCS.map((u) => http(u))) });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitForAllowance(owner: Address, needed: bigint, tries = 12): Promise<void> {
  for (let i = 0; i < tries; i++) {
    try {
      const a = await rpc.readContract({ address: MOR_BASE, abi: erc20AbiMin, functionName: "allowance", args: [owner, BUILDERS] });
      if (a >= needed) return;
    } catch { /* keep polling */ }
    await sleep(1500);
  }
}

export type SubnetPhase = "idle" | "approve" | "stake" | "withdraw" | "done" | "error";

export function useGnarsSubnetStake() {
  const writer = useWriteAccount();
  const [phase, setPhase] = useState<SubnetPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);

  /** Lock `amount` MOR into the Gnars subnet (approve first if needed). */
  const stake = useCallback(
    async (amount: string): Promise<boolean> => {
      if (pending.current) return false;
      const client = getThirdwebClient();
      if (!client) { setError("Thirdweb not configured."); setPhase("error"); return false; }
      if (!writer) { setError("Connect your wallet."); setPhase("error"); return false; }

      let amt: bigint;
      try { amt = parseUnits(amount, MOR_DECIMALS); } catch { setError("Invalid amount."); setPhase("error"); return false; }
      if (amt <= BigInt(0)) { setError("Invalid amount."); setPhase("error"); return false; }

      const account = writer.account;
      setError(null);
      pending.current = true;
      try {
        await ensureOnChain(writer.wallet, thirdwebBase);

        const allowance = await rpc.readContract({ address: MOR_BASE, abi: erc20AbiMin, functionName: "allowance", args: [account.address as Address, BUILDERS] });
        if (allowance < amt) {
          setPhase("approve");
          const approveData = encodeFunctionData({ abi: erc20AbiMin, functionName: "approve", args: [BUILDERS, amt] });
          const approveTx = prepareTransaction({ client, chain: thirdwebBase, to: MOR_BASE, data: approveData });
          const hash = (await sendTransaction({ account, transaction: approveTx })).transactionHash;
          await waitForReceipt({ client, chain: thirdwebBase, transactionHash: hash });
          await waitForAllowance(account.address as Address, amt);
        }

        setPhase("stake");
        const depositData = encodeFunctionData({ abi: buildersAbi, functionName: "deposit", args: [GNARS_SUBNET_ID, amt] });
        const tx = prepareTransaction({ client, chain: thirdwebBase, to: BUILDERS, data: depositData });
        const stakeHash = (await sendTransaction({ account, transaction: tx })).transactionHash;
        await waitForReceipt({ client, chain: thirdwebBase, transactionHash: stakeHash });

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

  /** Withdraw `amount` MOR principal (reverts before the 7-day lock lifts). */
  const withdraw = useCallback(
    async (amount: string): Promise<boolean> => {
      if (pending.current) return false;
      const client = getThirdwebClient();
      if (!client) { setError("Thirdweb not configured."); setPhase("error"); return false; }
      if (!writer) { setError("Connect your wallet."); setPhase("error"); return false; }

      let amt: bigint;
      try { amt = parseUnits(amount, MOR_DECIMALS); } catch { setError("Invalid amount."); setPhase("error"); return false; }

      const account = writer.account;
      setError(null);
      pending.current = true;
      try {
        await ensureOnChain(writer.wallet, thirdwebBase);
        setPhase("withdraw");
        const data = encodeFunctionData({ abi: buildersAbi, functionName: "withdraw", args: [GNARS_SUBNET_ID, amt] });
        const tx = prepareTransaction({ client, chain: thirdwebBase, to: BUILDERS, data });
        const hash = (await sendTransaction({ account, transaction: tx })).transactionHash;
        await waitForReceipt({ client, chain: thirdwebBase, transactionHash: hash });
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

  return { stake, withdraw, phase, error, isBusy: phase === "approve" || phase === "stake" || phase === "withdraw" };
}
