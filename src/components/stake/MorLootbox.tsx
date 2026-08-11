"use client";

// Floating "lootbox" trigger on /stake. It surfaces whenever the connected
// wallet has MOR to act on, and tapping it opens the RewardClaimModal — a 3D
// chest + a Claim → Bridge → Distribute stepper. All the on-chain logic lives
// HERE (read position, claim, distribute, withdraw); the modal is presentation.
//
// The Morpheus loop it drives:
//   1. Claim  — pull accrued MOR from mainnet to your 3-way split (LayerZero).
//   2. Split  — once it lands on Arbitrum, deploy (if needed) + distribute:
//               you keep 50%, Gnars 25%, athlete 25%.
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Gift } from "lucide-react";
import { toast } from "sonner";
import { getAddress, type Address } from "viem";
import { RewardClaimModal } from "@/components/stake/RewardClaimModal";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useMorDistribute } from "@/hooks/use-mor-distribute";
import { useMorpheusPosition } from "@/hooks/use-morpheus-position";
import { useMorpheusStake } from "@/hooks/use-morpheus-stake";
import { useStakeDeposit } from "@/hooks/use-stake-deposit";
import { useUserAddress } from "@/hooks/use-user-address";
import { useVaultRewards } from "@/hooks/use-vault-rewards";
import { Link } from "@/i18n/navigation";
import { predictSplitAddress, splitMorBalance, warehouseMorBalance } from "@/lib/mor-split";
import { MOR_GNARS_RECIPIENT, type MorpheusAsset } from "@/lib/morpheus";

const ZERO = "0x0000000000000000000000000000000000000000";
const LOOT_MIN_MOR = 0.0001; // ignore dust
const MOR_GREEN = "#2be58b";

/**
 * The same chest the claim dialog opens with, shrunk into the trigger.
 *
 * Loaded lazily and never on the server: it is a react-three-fiber scene, so
 * pulling it into the initial bundle of every route would be the wrong trade for
 * a 56px button. Until it arrives the Gift glyph stands in, which is also what
 * renders if WebGL is unavailable.
 */
const ChestArt = dynamic(() => import("@/components/lootbox/AnimatedChest3D"), {
  ssr: false,
  loading: () => <Gift className="h-6 w-6" style={{ color: MOR_GREEN }} />,
});

/**
 * `pointer-events-none` matters: the chest ships its own OrbitControls and click
 * target, and inside a button both would swallow the press. The wrapper also
 * hides the scene's absolutely-positioned "[ GNARS REWARDS ]" corner label,
 * which is sized for the dialog and overflows at this scale.
 */
function ChestIcon({ size }: { size: number }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none block [&_.absolute]:hidden"
      style={{ width: size, height: size }}
    >
      <ChestArt onOpen={() => {}} tier="gold" disabled />
    </span>
  );
}

/**
 * `open`/`onOpenChange` are optional: unmanaged, the box keeps its own state and
 * behaves exactly as before; passed, the parent owns it. This exists so a second
 * entry point (a row button in PositionsHub) can open THIS modal instead of a
 * duplicate claim flow — the standard controlled/uncontrolled pair, so no caller is
 * forced to hold state it does not care about.
 *
 * Note the early `return null` below: a controlled parent can request `open` and
 * still get nothing if the wallet has no action pending. That is intentional — the
 * only rows that offer an action come from a staked pool, which is itself one of
 * the conditions that make `hasAction` true.
 */
export function MorLootbox({
  open: openProp,
  onOpenChange,
  showEnablePrompt = false,
}: {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  /**
   * When the wallet has nothing to act on, render a muted button that points at
   * /stake instead of rendering nothing. Only the site-wide mount asks for this:
   * on /stake itself the prompt would be inviting you to the page you are on.
   */
  showEnablePrompt?: boolean;
} = {}) {
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
  const { distribute, collect, isBusy: distributing, collecting } = useMorDistribute();
  // Morpho (USDC vault) yield — the OTHER reward type, claimable per rider vault.
  const { claimRewards, isStaking: claimingVault } = useStakeDeposit();
  const vaultRewards = useVaultRewards(you, nonce);

  const [openLocal, setOpenLocal] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : openLocal;
  const setOpen = useCallback(
    (v: boolean) => {
      // Keep the local copy untouched while controlled, so unmounting the parent's
      // state does not resurrect a stale `true`.
      if (!isControlled) setOpenLocal(v);
      onOpenChange?.(v);
    },
    [isControlled, onOpenChange],
  );
  const [splitBalances, setSplitBalances] = useState<Partial<Record<MorpheusAsset, number>>>({});
  const [collectItems, setCollectItems] = useState<{ owner: Address; amount: number }[]>([]);
  const [busyAsset, setBusyAsset] = useState<MorpheusAsset | null>(null);
  const [busyVault, setBusyVault] = useState<string | null>(null);
  // Read the clock once at mount (a lazy initializer is pure-in-render safe) —
  // the 7-day unlock doesn't need a live tick; a refresh re-reads it.
  const [nowSec] = useState(() => Math.floor(Date.now() / 1000));

  // Read what's already sitting at each position's split on Arbitrum.
  useEffect(() => {
    if (!you || !position) {
      setSplitBalances({});
      return;
    }
    let cancelled = false;
    (async () => {
      const eligible = position.pools.filter(
        (p) => p.staked > 0 && p.referrer && p.referrer.toLowerCase() !== ZERO,
      );
      const entries = await Promise.all(
        eligible.map(
          async (p) => [p.asset, await splitMorBalance(you as Address, p.referrer)] as const,
        ),
      );
      if (!cancelled) setSplitBalances(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [you, position, nonce]);

  // Every recipient's MOR credited in the SplitsWarehouse (staker + Gnars +
  // athletes) still to be collected — the last hop. One Collect click withdraws
  // them all in a single batched tx (Multicall3).
  useEffect(() => {
    if (!you) {
      setCollectItems([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const referrers = (position?.pools ?? [])
        .filter((p) => p.staked > 0 && p.referrer && p.referrer.toLowerCase() !== ZERO)
        .map((p) => getAddress(p.referrer));
      const owners = [...new Set([getAddress(you as Address), MOR_GNARS_RECIPIENT, ...referrers])];
      const amounts = await Promise.all(owners.map((o) => warehouseMorBalance(o)));
      const items = owners
        .map((owner, i) => ({ owner, amount: amounts[i] }))
        .filter((x) => x.amount > LOOT_MIN_MOR);
      if (!cancelled) setCollectItems(items);
    })();
    return () => {
      cancelled = true;
    };
  }, [you, position, nonce]);

  const collectable = collectItems.reduce((s, x) => s + x.amount, 0);

  const pools = position?.pools ?? [];
  const claimable = pools.filter(
    (p) => p.pendingMor > LOOT_MIN_MOR && p.referrer && p.referrer.toLowerCase() !== ZERO,
  );
  const distributable = pools.filter((p) => (splitBalances[p.asset] ?? 0) > LOOT_MIN_MOR);
  const stakedPools = pools.filter((p) => p.staked > 0);
  // The box surfaces whenever there's anything to act on — MOR rewards (claim,
  // distribute, collect), Morpho vault yield to harvest, OR a principal position
  // to manage (7-day lock).
  const hasAction =
    claimable.length > 0 ||
    distributable.length > 0 ||
    collectable > LOOT_MIN_MOR ||
    vaultRewards.length > 0 ||
    stakedPools.length > 0;

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

  const onCollect = useCallback(async () => {
    if (collectItems.length === 0) return;
    const ok = await collect(collectItems.map((x) => x.owner));
    if (ok) {
      toast.success(t("lootbox.collectedTitle"));
      refresh();
    } else toast.error(t("lootbox.failed"));
  }, [collectItems, collect, t]);

  // Harvest a rider vault's Morpho yield — withdraws only the earned amount,
  // leaving the principal. USDC on Base; one click, no stepper.
  const onClaimVault = useCallback(
    async (vault: Address, earnedRaw: bigint) => {
      setBusyVault(vault);
      try {
        const ok = await claimRewards(vault, earnedRaw);
        if (ok) {
          toast.success(t("lootbox.vaultClaimed"));
          refresh();
        } else toast.error(t("lootbox.failed"));
      } finally {
        setBusyVault(null);
      }
    },
    [claimRewards, t],
  );

  const onWithdraw = useCallback(
    async (asset: MorpheusAsset, staked: number) => {
      setBusyAsset(asset);
      try {
        const ok = await morpheus.withdraw(asset, String(staked));
        if (ok) {
          toast.success(t("lootbox.withdrawn"));
          refresh();
        } else toast.error(t("lootbox.failed"), { description: morpheus.error ?? undefined });
      } finally {
        setBusyAsset(null);
      }
    },
    [morpheus, t],
  );

  // Nothing to act on — either no wallet, or a wallet with nothing accrued yet.
  //
  // Both get the same invitation from the site-wide mount. Gating the prompt on
  // a connected wallet meant the one audience most likely to need the pointer,
  // someone who has not staked at all, was the one audience that never saw it.
  // The controlled /stake instance still renders nothing here: the prompt would
  // be inviting you to the page you are already on.
  if (!you || !hasAction) {
    if (!showEnablePrompt) return null;
    return (
      <div className="fixed bottom-5 right-5 z-50">
        <Tooltip>
          <TooltipTrigger asChild>
            {/* No plate behind the chest — it is a rendered object with its own
                silhouette, and boxing it in a bordered rounded rectangle read as
                chrome around an icon rather than as the object itself. A drop
                shadow keeps it legible over light page content. */}
            <Link
              href="/stake"
              aria-label={t("lootbox.enableRewards")}
              className="relative block cursor-pointer opacity-70 drop-shadow-[0_6px_14px_rgba(0,0,0,.55)] transition-opacity hover:opacity-100"
            >
              <ChestIcon size={60} />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="left">{t("lootbox.enableRewards")}</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  const totalClaimable = claimable.reduce((s, p) => s + p.pendingMor, 0);
  const totalDistributable = distributable.reduce((s, p) => s + (splitBalances[p.asset] ?? 0), 0);
  const badge = totalClaimable + totalDistributable + collectable;

  return (
    <>
      {open && (
        <RewardClaimModal
          claimable={claimable}
          distributable={distributable}
          collectable={collectable}
          vaultRewards={vaultRewards}
          stakedPools={stakedPools}
          splitBalances={splitBalances}
          busyAsset={busyAsset}
          busyVault={busyVault}
          claimingVault={claimingVault}
          morpheusBusy={morpheus.isBusy}
          morpheusPhase={morpheus.phase}
          distributing={distributing}
          collecting={collecting}
          nowSec={nowSec}
          onClaim={onClaim}
          onDistribute={onDistribute}
          onCollect={onCollect}
          onClaimVault={onClaimVault}
          onWithdraw={onWithdraw}
          onClose={() => setOpen(false)}
        />
      )}

      {/* Floating trigger */}
      <div className="fixed bottom-5 right-5 z-50">
        <motion.button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("lootbox.title")}
          className="relative flex cursor-pointer items-center justify-center drop-shadow-[0_6px_14px_rgba(0,0,0,.55)]"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
        >
          {/* The pulse is a soft radial behind the chest rather than a glowing
              rounded-rectangle outline — with the plate gone, a box-shadow on a
              rounded box would have drawn back the very rectangle it lit. */}
          <motion.span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 size-[112%] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background: `radial-gradient(circle, ${MOR_GREEN}55 0%, ${MOR_GREEN}00 68%)`,
            }}
            animate={{ opacity: [0.35, 0.8, 0.35] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="relative">
            <ChestIcon size={68} />
          </span>
          <span
            className="absolute -right-1.5 -top-1.5 flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black"
            style={{ backgroundColor: MOR_GREEN, color: "#04140d" }}
          >
            {badge >= 1 ? Math.floor(badge) : "!"}
          </span>
        </motion.button>
      </div>
    </>
  );
}
