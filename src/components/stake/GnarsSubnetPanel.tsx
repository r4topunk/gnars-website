"use client";

// Back Gnars on Morpheus: lock MOR into the Gnars Builder subnet (Base). The
// campaign's actual "stake on the Gnars subnet" flow. Principal stays yours,
// withdrawable after a 7-day lock; the subnet accrues MOR emissions for the
// builder. Kept violet ("Morpheus"), distinct from the rider Capital flow.

import Image from "next/image";
import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { toast } from "sonner";
import { AlertTriangle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SUBNET_MIN_DEPOSIT_MOR } from "@/lib/morpheus-builder";
import { useGnarsSubnet } from "@/hooks/use-gnars-subnet";
import { useGnarsSubnetStake } from "@/hooks/use-gnars-subnet-stake";

const fmt = (n: number, d = 4) => n.toLocaleString("en-US", { maximumFractionDigits: d });

export function GnarsSubnetPanel() {
  const you = useActiveAccount()?.address;
  const { stake, withdraw, phase, error, isBusy } = useGnarsSubnetStake();
  const [nonce, setNonce] = useState(0);
  const { position, totalStaked } = useGnarsSubnet(you, nonce);
  const [amount, setAmount] = useState("");

  const nowSec = Math.floor(Date.now() / 1000);
  const locked = !!position && position.unlockAt > nowSec;
  const daysLeft = position ? Math.max(0, Math.ceil((position.unlockAt - nowSec) / 86400)) : 0;

  const onStake = async () => {
    if (!amount || Number(amount) <= 0) return;
    const ok = await stake(amount);
    if (ok) { toast.success("Staked on the Gnars subnet", { description: `${amount} MOR backing Gnars on Morpheus.` }); setAmount(""); setNonce((n) => n + 1); }
    else toast.error("Stake failed", { description: error ?? undefined });
  };

  const onWithdraw = async () => {
    if (!position || position.staked <= 0) return;
    const ok = await withdraw(String(position.staked));
    if (ok) { toast.success("Withdrawn"); setNonce((n) => n + 1); }
    else toast.error("Withdraw failed", { description: error ?? undefined });
  };

  const phaseLabel =
    phase === "approve" ? "approving MOR…"
    : phase === "stake" ? "staking on Base…"
    : "Stake MOR";

  return (
    <div id="gnars-subnet-stake" className="scroll-mt-24 rounded-2xl border border-violet-500/30 bg-violet-500/[0.03] p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Image src="/logos/morpheus.webp" alt="Morpheus" width={22} height={22} className="rounded" />
        <h2 className="text-lg font-black tracking-tight">Back Gnars on the Morpheus subnet</h2>
        <span className="rounded-full border border-violet-500/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-400">MOR · Base</span>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Lock <b>MOR</b> into the Gnars Builder subnet to back the builder. Your principal stays yours
        (withdrawable after a 7-day lock); the subnet accrues MOR emissions for Gnars. Self-custody on Base.
      </p>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border/60 bg-background/40 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total staked</div>
          <div className="text-lg font-black tabular-nums">{fmt(totalStaked, 0)} <span className="text-xs font-medium text-muted-foreground">MOR</span></div>
        </div>
        <div className="rounded-xl border border-border/60 bg-background/40 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Your stake</div>
          <div className="text-lg font-black tabular-nums">{fmt(position?.staked ?? 0, 4)} <span className="text-xs font-medium text-muted-foreground">MOR</span></div>
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          type="number"
          inputMode="decimal"
          placeholder={`min ${SUBNET_MIN_DEPOSIT_MOR} MOR${position ? ` · you have ${fmt(position.walletMor, 4)}` : ""}`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Button onClick={onStake} disabled={isBusy || !you} className="shrink-0 bg-violet-500 text-white hover:bg-violet-600">
          {phaseLabel}
        </Button>
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" />
        You back the builder — rewards accrue to the subnet, not to individual stakers. Every action is a Base tx.
      </p>

      {position && position.staked > 0 && (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/40 pt-3">
          <div className="text-sm">
            <span className="font-mono">{fmt(position.staked, 4)} MOR</span>{" "}
            <span className="text-xs text-muted-foreground">
              {locked ? <><Lock className="mb-0.5 inline h-3 w-3" /> unlocks in {daysLeft}d</> : "unlocked"}
            </span>
          </div>
          <Button size="sm" variant="outline" disabled={isBusy || locked} onClick={onWithdraw}>
            Withdraw
          </Button>
        </div>
      )}
    </div>
  );
}
