"use client";

/**
 * Gnars Migration — execution.
 *
 * Converts the selected Zora coins into old $gnars, the pre-Clanker end state
 * (holding old $gnars is the ticket into the Upgrader deposit later). Routing is
 * per coin, matching the preview quotes:
 *
 *   gnars-paired coin → tradeCoin(coin → $gnars)   (one hop)
 *   everything else   → tradeCoin(coin → ZORA), then one tradeCoin(ΣZORA → $gnars)
 *
 * Sequential (one signature per step) — correct and testable. Atomic one-tx
 * batching (thirdweb SA sendBatchTransaction) is a later optimization. Signs via
 * useWriteAccount (EOA for external wallets — where the funds are), same Zora
 * SDK path as use-trade-creator-coin.ts.
 */
import { useState } from "react";
import { setApiKey, tradeCoin, type TradeParameters } from "@zoralabs/coins-sdk";
import { toast } from "sonner";
import { viemAdapter } from "thirdweb/adapters/viem";
import { base } from "thirdweb/chains";
import { erc20Abi, type Address, type PublicClient, type WalletClient } from "viem";
import { useWriteAccount } from "@/hooks/use-write-account";
import { GNARS_CREATOR_COIN, ZORA_TOKEN_BASE } from "@/lib/config";
import { getThirdwebClient } from "@/lib/thirdweb";
import { normalizeTxError } from "@/lib/thirdweb-tx";

if (typeof window !== "undefined") {
  const key = process.env.NEXT_PUBLIC_ZORA_API_KEY;
  if (key) setApiKey(key);
}

const GNARS_LOWER = GNARS_CREATOR_COIN.toLowerCase();

export interface CoinToMigrate {
  address: Address;
  symbol: string;
  /** Raw balance (BigInt-safe string). */
  balance: string;
  /** Pool pairing address — used to pick the route (direct to $gnars vs via ZORA). */
  pairedWith: string | null;
}

export type StepStatus = "pending" | "active" | "done" | "failed";

export interface MigrationStep {
  label: string;
  status: StepStatus;
}

export function useExecuteMigration() {
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<MigrationStep[]>([]);
  // useWriteAccount honors the user's view mode: for an external wallet in EOA
  // view it signs from the EOA (where the funds are), not the sponsored smart
  // account. Using useActiveAccount would always resolve to the SA under AA and
  // spend from an empty smart wallet → OutOfFunds.
  const writer = useWriteAccount();

  const execute = async (coins: CoinToMigrate[], slippage = 0.15) => {
    if (coins.length === 0) return;
    if (!writer) {
      toast.error("Please connect your wallet");
      return;
    }
    const client = getThirdwebClient();
    if (!client) {
      toast.error("Thirdweb client not configured");
      return;
    }
    const { account, wallet } = writer;

    setIsRunning(true);

    // Route per coin: gnars-paired coins swap straight to $gnars (one hop);
    // everything else goes to ZORA, then a single consolidated ZORA→$gnars hop.
    const plan = coins.map((c) => ({
      coin: c,
      direct: c.pairedWith?.toLowerCase() === GNARS_LOWER,
    }));
    const hasViaZora = plan.some((p) => !p.direct);

    const initial: MigrationStep[] = [
      ...plan.map((p) => ({
        label: `${p.coin.symbol} → ${p.direct ? "$GNARS" : "ZORA"}`,
        status: "pending" as StepStatus,
      })),
      ...(hasViaZora ? [{ label: "ZORA → $GNARS", status: "pending" as StepStatus }] : []),
    ];
    setSteps(initial);
    const finalIdx = hasViaZora ? plan.length : -1;
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
      const zoraBefore = hasViaZora ? await readZora() : 0n;

      // Sell each coin toward its target: direct → $gnars, or → ZORA.
      let anyViaZoraSold = false;
      let anyDirectDone = false;
      for (let i = 0; i < plan.length; i++) {
        setStatus(i, "active");
        try {
          const buyAddress = plan[i].direct ? (GNARS_CREATOR_COIN as Address) : ZORA_TOKEN_BASE;
          const params: TradeParameters = {
            sell: { type: "erc20", address: plan[i].coin.address },
            buy: { type: "erc20", address: buyAddress },
            amountIn: BigInt(plan[i].coin.balance),
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
          if (plan[i].direct) anyDirectDone = true;
          else anyViaZoraSold = true;
        } catch (err) {
          console.error(`[migration] swap failed for ${plan[i].coin.symbol}`, err);
          setStatus(i, "failed");
        }
      }

      // Consolidate any ZORA gained from the non-direct coins into $gnars.
      if (hasViaZora) {
        if (!anyViaZoraSold) throw new Error("None of the coins could be sold to ZORA");
        setStatus(finalIdx, "active");
        const gained = (await readZora()) - zoraBefore;
        if (gained <= 0n) throw new Error("No ZORA received from the sells");
        await tradeCoin({
          tradeParameters: {
            sell: { type: "erc20", address: ZORA_TOKEN_BASE },
            buy: { type: "erc20", address: GNARS_CREATOR_COIN as Address },
            amountIn: gained,
            slippage,
            sender,
          },
          walletClient,
          account: walletClient.account!,
          publicClient,
        });
        setStatus(finalIdx, "done");
      } else if (!anyDirectDone) {
        throw new Error("No coins could be migrated");
      }

      toast.success("Migrated into $gnars!", { id: toastId });
      return true;
    } catch (err) {
      if (finalIdx >= 0) setStatus(finalIdx, "failed");
      const { message } = normalizeTxError(err);
      toast.error(message || "Migration failed", { id: toastId });
      return false;
    } finally {
      setIsRunning(false);
    }
  };

  return { execute, isRunning, steps };
}
