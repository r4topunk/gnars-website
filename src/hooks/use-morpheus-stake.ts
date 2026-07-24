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
import { prepareTransaction, sendTransaction, waitForReceipt } from "thirdweb";
import { ethereum } from "thirdweb/chains";
import {
  createPublicClient, http, fallback, encodeFunctionData, parseUnits, erc20Abi, type Address,
} from "viem";
import { mainnet } from "viem/chains";
import { useWriteAccount } from "@/hooks/use-write-account";
import { ensureOnChain } from "@/lib/thirdweb-tx";
import { getThirdwebClient } from "@/lib/thirdweb";
import { MORPHEUS_POOLS, MOR_REWARD_POOL_INDEX, depositPoolAbi, type MorpheusAsset } from "@/lib/morpheus";

const rpc = createPublicClient({
  chain: mainnet,
  transport: fallback([
    http("https://ethereum.publicnode.com"),
    http("https://eth.llamarpc.com"),
    http("https://rpc.ankr.com/eth"),
  ]),
});
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitForAllowance(token: Address, owner: Address, spender: Address, needed: bigint, tries = 12): Promise<void> {
  for (let i = 0; i < tries; i++) {
    try {
      const a = await rpc.readContract({ address: token, abi: erc20Abi, functionName: "allowance", args: [owner, spender] });
      if (a >= needed) return;
    } catch { /* keep polling */ }
    await sleep(1500);
  }
}

export type MorpheusPhase = "idle" | "approve" | "stake" | "withdraw" | "done" | "error";

export function useMorpheusStake() {
  const writer = useWriteAccount();
  const [phase, setPhase] = useState<MorpheusPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);

  /** Stake `amount` of the asset, crediting the athlete as referrer. */
  const stake = useCallback(
    async (asset: MorpheusAsset, amount: string, athlete: Address): Promise<boolean> => {
      if (pending.current) return false;
      const client = getThirdwebClient();
      if (!client) { setError("Thirdweb not configured."); setPhase("error"); return false; }
      if (!writer) { setError("Connect your wallet."); setPhase("error"); return false; }
      const { pool, token, decimals } = MORPHEUS_POOLS[asset];

      let assets: bigint;
      try { assets = parseUnits(amount, decimals); } catch { setError("Invalid amount."); setPhase("error"); return false; }
      if (assets <= BigInt(0)) { setError("Invalid amount."); setPhase("error"); return false; }

      const account = writer.account;
      setError(null);
      pending.current = true;
      try {
        await ensureOnChain(writer.wallet, ethereum);

        const allowance = await rpc.readContract({ address: token, abi: erc20Abi, functionName: "allowance", args: [account.address as Address, pool] });
        if (allowance < assets) {
          setPhase("approve");
          const approveData = encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [pool, assets] });
          const approveTx = prepareTransaction({ client, chain: ethereum, to: token, data: approveData });
          const hash = (await sendTransaction({ account, transaction: approveTx })).transactionHash;
          await waitForReceipt({ client, chain: ethereum, transactionHash: hash });
          await waitForAllowance(token, account.address as Address, pool, assets);
        }

        setPhase("stake");
        // claimLockEnd = 0 → no extra lock beyond the protocol's 7-day default.
        const stakeData = encodeFunctionData({
          abi: depositPoolAbi, functionName: "stake",
          args: [MOR_REWARD_POOL_INDEX, assets, BigInt(0), athlete],
        });
        const sendStake = async () => {
          const tx = prepareTransaction({ client, chain: ethereum, to: pool, data: stakeData });
          return (await sendTransaction({ account, transaction: tx })).transactionHash;
        };
        let stakeHash: `0x${string}`;
        try { stakeHash = await sendStake(); } catch { await sleep(4000); stakeHash = await sendStake(); }
        await waitForReceipt({ client, chain: ethereum, transactionHash: stakeHash });

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
      if (!client) { setError("Thirdweb not configured."); setPhase("error"); return false; }
      if (!writer) { setError("Connect your wallet."); setPhase("error"); return false; }
      const { pool, decimals } = MORPHEUS_POOLS[asset];

      let assets: bigint;
      try { assets = parseUnits(amount, decimals); } catch { setError("Invalid amount."); setPhase("error"); return false; }

      const account = writer.account;
      setError(null);
      pending.current = true;
      try {
        await ensureOnChain(writer.wallet, ethereum);
        setPhase("withdraw");
        const data = encodeFunctionData({ abi: depositPoolAbi, functionName: "withdraw", args: [MOR_REWARD_POOL_INDEX, assets] });
        const tx = prepareTransaction({ client, chain: ethereum, to: pool, data });
        const hash = (await sendTransaction({ account, transaction: tx })).transactionHash;
        await waitForReceipt({ client, chain: ethereum, transactionHash: hash });
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
