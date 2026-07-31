"use client";

// Second half of the MOR loop, on ARBITRUM: once a staker's claimed MOR has
// bridged to their deterministic 3-way split, deploy the split (lazily, if it
// doesn't exist yet) and `distribute` it — pushing staker 50 / Gnars 25 /
// athlete 25 straight to their wallets (PushSplit, no warehouse withdraw).
//
// The split address is deterministic and was set as the claim receiver at stake
// time, so the MOR is already sitting there. distribute() is permissionless —
// whoever clicks pays the (tiny) Arbitrum gas.

import { useCallback, useRef, useState } from "react";
import { prepareTransaction, sendTransaction, waitForReceipt } from "thirdweb";
import { arbitrum } from "thirdweb/chains";
import { encodeFunctionData, type Address } from "viem";
import { useWriteAccount } from "@/hooks/use-write-account";
import { ensureOnChain } from "@/lib/thirdweb-tx";
import { getThirdwebClient } from "@/lib/thirdweb";
import { ARBITRUM_PUSH_SPLIT_FACTORY, MOR_TOKEN } from "@/lib/morpheus";
import {
  splitParamsFor, predictSplitAddress, isSplitDeployed,
  pushSplitFactoryAbi, splitWalletAbi, SPLIT_OWNER, SPLIT_SALT,
} from "@/lib/mor-split";

export type DistributePhase = "idle" | "deploy" | "distribute" | "done" | "error";

export function useMorDistribute() {
  const writer = useWriteAccount();
  const [phase, setPhase] = useState<DistributePhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);

  /**
   * Deploy (if needed) and distribute the caller's 3-way split for `athlete`,
   * paying out any MOR that has arrived at the split address.
   */
  const distribute = useCallback(
    async (athlete: Address): Promise<boolean> => {
      if (pending.current) return false;
      const client = getThirdwebClient();
      if (!client) { setError("Thirdweb not configured."); setPhase("error"); return false; }
      if (!writer) { setError("Connect your wallet."); setPhase("error"); return false; }
      const account = writer.account;
      const staker = account.address as Address;
      const params = splitParamsFor(staker, athlete);

      setError(null);
      pending.current = true;
      try {
        await ensureOnChain(writer.wallet, arbitrum);
        const split = await predictSplitAddress(staker, athlete);

        // Deploy the split the first time — same params/owner/salt reproduce the
        // predicted address the MOR was sent to.
        if (!(await isSplitDeployed(staker, athlete))) {
          setPhase("deploy");
          const deployData = encodeFunctionData({
            abi: pushSplitFactoryAbi, functionName: "createSplitDeterministic",
            args: [params, SPLIT_OWNER, staker, SPLIT_SALT],
          });
          const deployTx = prepareTransaction({ client, chain: arbitrum, to: ARBITRUM_PUSH_SPLIT_FACTORY, data: deployData });
          const dHash = (await sendTransaction({ account, transaction: deployTx })).transactionHash;
          await waitForReceipt({ client, chain: arbitrum, transactionHash: dHash });
        }

        setPhase("distribute");
        const distData = encodeFunctionData({
          abi: splitWalletAbi, functionName: "distribute",
          args: [params, MOR_TOKEN, staker],
        });
        const distTx = prepareTransaction({ client, chain: arbitrum, to: split, data: distData });
        const hash = (await sendTransaction({ account, transaction: distTx })).transactionHash;
        await waitForReceipt({ client, chain: arbitrum, transactionHash: hash });

        setPhase("done");
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Distribute failed.");
        setPhase("error");
        return false;
      } finally {
        pending.current = false;
      }
    },
    [writer],
  );

  return {
    distribute,
    phase,
    error,
    isBusy: phase === "deploy" || phase === "distribute",
  };
}
