"use client";

/**
 * Gnars Migration — execution.
 *
 * Converts the selected Zora coins into old $gnars, the pre-Clanker end state
 * (holding old $gnars is the ticket into the Upgrader deposit later). Runs the
 * same route the preview quotes:
 *
 *   for each coin:  tradeCoin(coin → ZORA)     (V4 hooks auto-hop content→creator→ZORA)
 *   once:           tradeCoin(ΣZORA → $gnars)  (creator-coin trade)
 *
 * Sequential (one signature per step) — correct and testable. Atomic one-tx
 * batching (thirdweb SA sendBatchTransaction) is a later optimization; this is
 * the version you can exercise end-to-end today. Uses the same thirdweb +
 * Zora SDK path as use-trade-creator-coin.ts (proven to work on Base).
 */
import { useState } from "react";
import { setApiKey, tradeCoin, type TradeParameters } from "@zoralabs/coins-sdk";
import { toast } from "sonner";
import { viemAdapter } from "thirdweb/adapters/viem";
import { base } from "thirdweb/chains";
import { useActiveAccount, useActiveWallet } from "thirdweb/react";
import { erc20Abi, type Address, type PublicClient, type WalletClient } from "viem";
import { GNARS_CREATOR_COIN, ZORA_TOKEN_BASE } from "@/lib/config";
import { getThirdwebClient } from "@/lib/thirdweb";
import { normalizeTxError } from "@/lib/thirdweb-tx";

if (typeof window !== "undefined") {
  const key = process.env.NEXT_PUBLIC_ZORA_API_KEY;
  if (key) setApiKey(key);
}

export interface CoinToMigrate {
  address: Address;
  symbol: string;
  /** Raw balance (BigInt-safe string). */
  balance: string;
}

export type StepStatus = "pending" | "active" | "done" | "failed";

export interface MigrationStep {
  label: string;
  status: StepStatus;
}

export function useExecuteMigration() {
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<MigrationStep[]>([]);
  const account = useActiveAccount();
  const wallet = useActiveWallet();

  const execute = async (coins: CoinToMigrate[], slippage = 0.15) => {
    if (coins.length === 0) return;
    if (!account || !wallet) {
      toast.error("Please connect your wallet");
      return;
    }
    const client = getThirdwebClient();
    if (!client) {
      toast.error("Thirdweb client not configured");
      return;
    }

    setIsRunning(true);
    const initial: MigrationStep[] = [
      ...coins.map((c) => ({ label: `${c.symbol} → ZORA`, status: "pending" as StepStatus })),
      { label: "ZORA → $GNARS", status: "pending" as StepStatus },
    ];
    setSteps(initial);
    const finalIdx = coins.length;
    const setStatus = (i: number, status: StepStatus) =>
      setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, status } : s)));

    // viemAdapter clients are typed against thirdweb's bundled viem; cast via
    // unknown so the Zora SDK (project viem types) accepts them — same as
    // use-trade-creator-coin.ts. Structurally identical at runtime.
    const walletClient = viemAdapter.wallet.toViem({
      wallet,
      chain: base,
      client,
    }) as unknown as WalletClient;
    const publicClient = viemAdapter.publicClient.toViem({
      chain: base,
      client,
    }) as unknown as PublicClient;
    const sender = account.address as Address;

    const readZora = async (): Promise<bigint> => {
      try {
        return (await publicClient.readContract({
          address: ZORA_TOKEN_BASE,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [sender],
        })) as bigint;
      } catch {
        return 0n;
      }
    };

    const toastId = toast.loading("Migrating into $gnars…");
    try {
      const zoraBefore = await readZora();

      // Phase 1: sell each coin → ZORA.
      let anySold = false;
      for (let i = 0; i < coins.length; i++) {
        setStatus(i, "active");
        try {
          const params: TradeParameters = {
            sell: { type: "erc20", address: coins[i].address },
            buy: { type: "erc20", address: ZORA_TOKEN_BASE },
            amountIn: BigInt(coins[i].balance),
            slippage,
            sender,
          };
          await tradeCoin({
            tradeParameters: params,
            walletClient,
            account: walletClient.account!,
            publicClient,
          });
          setStatus(i, "done");
          anySold = true;
        } catch (err) {
          console.error(`[migration] sell failed for ${coins[i].symbol}`, err);
          setStatus(i, "failed");
        }
      }

      if (!anySold) throw new Error("No coins could be sold");

      // Phase 2: swap the ZORA we gained → $gnars.
      setStatus(finalIdx, "active");
      const gained = (await readZora()) - zoraBefore;
      if (gained <= 0n) throw new Error("No ZORA received from the sells");

      const finalParams: TradeParameters = {
        sell: { type: "erc20", address: ZORA_TOKEN_BASE },
        buy: { type: "erc20", address: GNARS_CREATOR_COIN as Address },
        amountIn: gained,
        slippage,
        sender,
      };
      await tradeCoin({
        tradeParameters: finalParams,
        walletClient,
        account: walletClient.account!,
        publicClient,
      });
      setStatus(finalIdx, "done");

      toast.success("Migrated into $gnars!", { id: toastId });
      return true;
    } catch (err) {
      setStatus(finalIdx, "failed");
      const { message } = normalizeTxError(err);
      toast.error(message || "Migration failed", { id: toastId });
      return false;
    } finally {
      setIsRunning(false);
    }
  };

  return { execute, isRunning, steps };
}
