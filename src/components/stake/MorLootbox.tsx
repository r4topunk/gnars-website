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
import { motion } from "framer-motion";
import { Gift } from "lucide-react";
import { toast } from "sonner";
import { getAddress, type Address } from "viem";
import { useUserAddress } from "@/hooks/use-user-address";
import { useMorpheusPosition } from "@/hooks/use-morpheus-position";
import { useMorpheusStake } from "@/hooks/use-morpheus-stake";
import { useMorDistribute } from "@/hooks/use-mor-distribute";
import { predictSplitAddress, splitMorBalance, warehouseMorBalance } from "@/lib/mor-split";
import { MOR_GNARS_RECIPIENT, type MorpheusAsset } from "@/lib/morpheus";
import { RewardClaimModal } from "@/components/stake/RewardClaimModal";
import { useStakeDeposit } from "@/hooks/use-stake-deposit";
import { useVaultRewards } from "@/hooks/use-vault-rewards";

const ZERO = "0x0000000000000000000000000000000000000000";
const LOOT_MIN_MOR = 0.0001; // ignore dust
const MOR_GREEN = "#2be58b";

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
  const { distribute, collect, isBusy: distributing, collecting } = useMorDistribute();
  // Morpho (USDC vault) yield — the OTHER reward type, claimable per rider vault.
  const { claimRewards, isStaking: claimingVault } = useStakeDeposit();
  const vaultRewards = useVaultRewards(you, nonce);

  const [open, setOpen] = useState(false);
  const [splitBalances, setSplitBalances] = useState<Partial<Record<MorpheusAsset, number>>>({});
  const [collectItems, setCollectItems] = useState<{ owner: Address; amount: number }[]>([]);
  const [busyAsset, setBusyAsset] = useState<MorpheusAsset | null>(null);
  const [busyVault, setBusyVault] = useState<string | null>(null);
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

  // Every recipient's MOR credited in the SplitsWarehouse (staker + Gnars +
  // athletes) still to be collected — the last hop. One Collect click withdraws
  // them all in a single batched tx (Multicall3).
  useEffect(() => {
    if (!you) { setCollectItems([]); return; }
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
    return () => { cancelled = true; };
  }, [you, position, nonce]);

  const collectable = collectItems.reduce((s, x) => s + x.amount, 0);

  const pools = position?.pools ?? [];
  const claimable = pools.filter((p) => p.pendingMor > LOOT_MIN_MOR && p.referrer && p.referrer.toLowerCase() !== ZERO);
  const distributable = pools.filter((p) => (splitBalances[p.asset] ?? 0) > LOOT_MIN_MOR);
  const stakedPools = pools.filter((p) => p.staked > 0);
  // The box surfaces whenever there's anything to act on — MOR rewards (claim,
  // distribute, collect), Morpho vault yield to harvest, OR a principal position
  // to manage (7-day lock).
  const hasAction =
    claimable.length > 0 || distributable.length > 0 || collectable > LOOT_MIN_MOR ||
    vaultRewards.length > 0 || stakedPools.length > 0;

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

  const onCollect = useCallback(
    async () => {
      if (collectItems.length === 0) return;
      const ok = await collect(collectItems.map((x) => x.owner));
      if (ok) { toast.success(t("lootbox.collectedTitle")); refresh(); }
      else toast.error(t("lootbox.failed"));
    },
    [collectItems, collect, t],
  );

  // Harvest a rider vault's Morpho yield — withdraws only the earned amount,
  // leaving the principal. USDC on Base; one click, no stepper.
  const onClaimVault = useCallback(
    async (vault: Address, earnedRaw: bigint) => {
      setBusyVault(vault);
      try {
        const ok = await claimRewards(vault, earnedRaw);
        if (ok) { toast.success(t("lootbox.vaultClaimed")); refresh(); }
        else toast.error(t("lootbox.failed"));
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
          className="relative flex h-16 w-16 cursor-pointer items-center justify-center rounded-2xl shadow-xl"
          style={{ background: "linear-gradient(160deg,#123, #04140d)", border: `1px solid ${MOR_GREEN}55` }}
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
        >
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
    </>
  );
}
