"use client";

// Floating "lootbox" that appears when the connected wallet has MOR to collect.
// One tap closes the Morpheus loop:
//   1. Claim  — pull accrued MOR from mainnet to your 3-way split (LayerZero).
//   2. Split  — once it lands on Arbitrum, deploy (if needed) + distribute:
//               you keep 50%, Gnars 25%, athlete 25%.
// Because the claim bridges cross-chain, the box shows a "bridging" beat between
// the two steps, and re-surfaces the Split action whenever a split is funded —
// even on a later visit, without another claim.

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { Gift, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { type Address } from "viem";
import { Button } from "@/components/ui/button";
import { useUserAddress } from "@/hooks/use-user-address";
import { useMorpheusPosition } from "@/hooks/use-morpheus-position";
import { useMorpheusStake } from "@/hooks/use-morpheus-stake";
import { useMorDistribute } from "@/hooks/use-mor-distribute";
import { predictSplitAddress, splitMorBalance } from "@/lib/mor-split";
import type { MorpheusAsset } from "@/lib/morpheus";

const ZERO = "0x0000000000000000000000000000000000000000";
const LOOT_MIN_MOR = 0.0001; // ignore dust
const MOR_GREEN = "#2be58b";
const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 4 });

export function MorLootbox() {
  const t = useTranslations("stake");
  // Read off the EFFECTIVE user address (EOA for external wallets), not the raw
  // active account — with account-abstraction thirdweb's active account is the
  // Smart Account wrap, but stakes/claims live on the user's EOA. Keying reads
  // off the SA made the box find no position and never appear. Writes still sign
  // through the active account inside the morpheus/distribute hooks.
  const { address: you } = useUserAddress();
  const [nonce, setNonce] = useState(0);
  const position = useMorpheusPosition(you, nonce);
  const morpheus = useMorpheusStake();
  const { distribute, isBusy: distributing } = useMorDistribute();

  const [open, setOpen] = useState(false);
  const [splitBalances, setSplitBalances] = useState<Partial<Record<MorpheusAsset, number>>>({});
  const [busyAsset, setBusyAsset] = useState<MorpheusAsset | null>(null);
  // Read the clock once at mount (a lazy initializer is pure-in-render safe) —
  // the 7-day unlock doesn't need a live tick; a refresh re-reads it.
  const [nowSec] = useState(() => Math.floor(Date.now() / 1000));

  // Read what's already sitting at each position's split on Arbitrum.
  useEffect(() => {
    if (!you || !position) { setSplitBalances({}); return; }
    let cancelled = false;
    (async () => {
      const eligible = position.pools.filter((p) => p.staked > 0 && p.referrer && p.referrer.toLowerCase() !== ZERO);
      const entries = await Promise.all(
        eligible.map(async (p) => [p.asset, await splitMorBalance(you as Address, p.referrer)] as const),
      );
      if (!cancelled) setSplitBalances(Object.fromEntries(entries));
    })();
    return () => { cancelled = true; };
  }, [you, position, nonce]);

  const pools = position?.pools ?? [];
  const claimable = pools.filter((p) => p.pendingMor > LOOT_MIN_MOR && p.referrer && p.referrer.toLowerCase() !== ZERO);
  const distributable = pools.filter((p) => (splitBalances[p.asset] ?? 0) > LOOT_MIN_MOR);
  const stakedPools = pools.filter((p) => p.staked > 0);
  // The box surfaces whenever there's any MOR to act on — rewards to collect OR
  // a principal position to manage (withdraw after the 7-day lock).
  const hasAction = claimable.length > 0 || distributable.length > 0 || stakedPools.length > 0;

  const refresh = () => setNonce((n) => n + 1);

  const onClaim = useCallback(
    async (asset: MorpheusAsset, referrer: Address) => {
      if (!you) return;
      setBusyAsset(asset);
      try {
        const split = await predictSplitAddress(you as Address, referrer);
        const ok = await morpheus.claim(asset, split);
        if (ok) {
          toast.success(t("lootbox.claimedTitle"), { description: t("lootbox.bridging") });
          refresh();
        } else {
          toast.error(t("lootbox.failed"), { description: morpheus.error ?? undefined });
        }
      } finally {
        setBusyAsset(null);
      }
    },
    [you, morpheus, t],
  );

  const onDistribute = useCallback(
    async (asset: MorpheusAsset, referrer: Address) => {
      setBusyAsset(asset);
      try {
        const ok = await distribute(referrer);
        if (ok) {
          toast.success(t("lootbox.distributedTitle"), { description: t("lootbox.hint") });
          refresh();
        } else {
          toast.error(t("lootbox.failed"));
        }
      } finally {
        setBusyAsset(null);
      }
    },
    [distribute, t],
  );

  const onWithdraw = useCallback(
    async (asset: MorpheusAsset, staked: number) => {
      setBusyAsset(asset);
      try {
        const ok = await morpheus.withdraw(asset, String(staked));
        if (ok) { toast.success(t("lootbox.withdrawn")); refresh(); }
        else toast.error(t("lootbox.failed"), { description: morpheus.error ?? undefined });
      } finally {
        setBusyAsset(null);
      }
    },
    [morpheus, t],
  );

  if (!you || !hasAction) return null;

  const totalClaimable = claimable.reduce((s, p) => s + p.pendingMor, 0);
  const totalDistributable = distributable.reduce((s, p) => s + (splitBalances[p.asset] ?? 0), 0);
  const badge = totalClaimable + totalDistributable;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="w-[300px] rounded-2xl border border-border bg-surface p-4 shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                <Sparkles className="h-4 w-4" style={{ color: MOR_GREEN }} />
                {t("lootbox.title")}
              </span>
              <button type="button" onClick={() => setOpen(false)} className="cursor-pointer text-foreground-subtle hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              {claimable.map((p) => (
                <div key={`c-${p.asset}`} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-surface-elevated px-3 py-2">
                  <span className="text-xs text-foreground-muted">
                    <b className="font-mono text-foreground">{fmt(p.pendingMor)}</b> MOR · {p.symbol}
                  </span>
                  <Button
                    size="sm"
                    disabled={busyAsset === p.asset || morpheus.isBusy}
                    onClick={() => onClaim(p.asset, p.referrer)}
                    className="h-7 gap-1 text-white"
                    style={{ backgroundColor: MOR_GREEN, color: "#04140d" }}
                  >
                    {busyAsset === p.asset && morpheus.isBusy ? t("lootbox.claiming") : t("lootbox.claim")}
                  </Button>
                </div>
              ))}

              {distributable.map((p) => (
                <div key={`d-${p.asset}`} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-surface-elevated px-3 py-2">
                  <span className="text-xs text-foreground-muted">
                    <b className="font-mono text-foreground">{fmt(splitBalances[p.asset] ?? 0)}</b> MOR · {p.symbol}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyAsset === p.asset || distributing}
                    onClick={() => onDistribute(p.asset, p.referrer)}
                    className="h-7"
                  >
                    {busyAsset === p.asset && distributing ? t("lootbox.distributing") : t("lootbox.distribute")}
                  </Button>
                </div>
              ))}
            </div>

            {stakedPools.length > 0 && (
              <div className="mt-3 border-t border-border/40 pt-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-foreground-subtle">
                  {t("lootbox.positions")}
                </p>
                <div className="space-y-2">
                  {stakedPools.map((p) => {
                    const unlocked = p.unlockAt > 0 && nowSec >= p.unlockAt;
                    return (
                      <div key={`w-${p.asset}`} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-surface-elevated px-3 py-2">
                        <span className="text-xs text-foreground-muted">
                          <b className="font-mono text-foreground">{fmt(p.staked)}</b> {p.symbol}
                          {!unlocked && p.unlockAt > 0 && (
                            <span className="ml-1 text-foreground-subtle">
                              · {t("lootbox.locked", { date: new Date(p.unlockAt * 1000).toLocaleDateString() })}
                            </span>
                          )}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!unlocked || busyAsset === p.asset || morpheus.isBusy}
                          onClick={() => onWithdraw(p.asset, p.staked)}
                          className="h-7"
                        >
                          {busyAsset === p.asset && morpheus.phase === "withdraw" ? t("lootbox.withdrawing") : t("lootbox.withdraw")}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="mt-3 text-[11px] leading-snug text-foreground-subtle">{t("lootbox.hint")}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating lootbox trigger */}
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("lootbox.title")}
        className="relative flex h-16 w-16 cursor-pointer items-center justify-center rounded-2xl shadow-xl"
        style={{ background: "linear-gradient(160deg,#123, #04140d)", border: `1px solid ${MOR_GREEN}55` }}
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
      >
        {/* pulsing glow */}
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-2xl"
          style={{ boxShadow: `0 0 24px 2px ${MOR_GREEN}` }}
          animate={{ opacity: [0.35, 0.8, 0.35] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <Gift className="relative h-7 w-7" style={{ color: MOR_GREEN }} />
        <span
          className="absolute -right-1.5 -top-1.5 flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black"
          style={{ backgroundColor: MOR_GREEN, color: "#04140d" }}
        >
          {badge >= 1 ? Math.floor(badge) : "!"}
        </span>
      </motion.button>
    </div>
  );
}
