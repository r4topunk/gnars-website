"use client";

// Morpheus (MOR) staking — the experimental, higher-risk tier, clearly separate
// from the Base/Moonwell vaults. Stake stETH or USDC on Ethereum mainnet, credit
// an athlete as referrer (their protocol-funded cut), earn MOR on Arbitrum.
//
// Phases wired here: stake + withdraw (with the athlete referrer). Claiming MOR
// and the opt-in donate-split come next.

import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RIDER_LIST } from "@/lib/gnars-vaults";
import { MORPHEUS_POOLS, MOR_SPLITS, type MorpheusAsset } from "@/lib/morpheus";
import { useMorpheusStake } from "@/hooks/use-morpheus-stake";
import { useMorpheusPosition } from "@/hooks/use-morpheus-position";

const fmt = (n: number, d = 4) => n.toLocaleString("en-US", { maximumFractionDigits: d });

export function MorpheusPanel() {
  const account = useActiveAccount();
  const you = account?.address;
  const { stake, withdraw, claim, setDonateReceiver, phase, error, isBusy } = useMorpheusStake();
  const [refresh, setRefresh] = useState(0);
  const position = useMorpheusPosition(you, refresh);

  const [asset, setAsset] = useState<MorpheusAsset>("usdc");
  const [amount, setAmount] = useState("");
  const [riderId, setRiderId] = useState(RIDER_LIST[0].id);
  const rider = RIDER_LIST.find((r) => r.id === riderId)!;

  const onStake = async () => {
    if (!amount || Number(amount) <= 0) return;
    const ok = await stake(asset, amount, rider.wallet!);
    if (ok) {
      toast.success(`Staked with ${riderId}`, { description: `Earning MOR on Arbitrum — ${riderId} gets the referrer bonus.` });
      setAmount("");
      setRefresh((n) => n + 1);
    } else {
      toast.error("Stake failed", { description: error ?? undefined });
    }
  };

  const onWithdraw = async (a: MorpheusAsset, staked: number) => {
    const ok = await withdraw(a, String(staked));
    if (ok) { toast.success("Withdrawn"); setRefresh((n) => n + 1); }
    else toast.error("Withdraw failed", { description: error ?? undefined });
  };

  const onClaim = async (a: MorpheusAsset) => {
    if (!you) return;
    // Route to the picked rider's split if the user turned donate mode on for
    // this pool; otherwise self-claim to their own Arbitrum address.
    const split = MOR_SPLITS[riderId];
    const receiver = donateAssets[a] && split ? split : (you as `0x${string}`);
    const ok = await claim(a, receiver);
    if (ok) {
      toast.success("MOR claimed", { description: receiver === split ? `Split to Gnars + ${riderId} on Arbitrum.` : "Arriving on Arbitrum in a few minutes." });
      setRefresh((n) => n + 1);
    } else toast.error("Claim failed", { description: error ?? undefined });
  };

  // Which pools the user has flipped into donate mode (points claims at the split).
  const [donateAssets, setDonateAssets] = useState<Partial<Record<MorpheusAsset, boolean>>>({});
  const onDonateToggle = async (a: MorpheusAsset) => {
    const split = MOR_SPLITS[riderId];
    if (!split || !you) return;
    const turningOn = !donateAssets[a];
    const ok = await setDonateReceiver(a, turningOn ? split : (you as `0x${string}`));
    if (ok) {
      setDonateAssets((d) => ({ ...d, [a]: turningOn }));
      toast.success(turningOn ? `Donating MOR to Gnars + ${riderId}` : "Keeping your MOR", {
        description: turningOn ? "Future claims route to the split — anyone can trigger them." : "Claims go back to your wallet.",
      });
    } else toast.error("Failed", { description: error ?? undefined });
  };

  const phaseLabel =
    phase === "approve" ? `approving ${MORPHEUS_POOLS[asset].symbol}…`
    : phase === "stake" ? "staking on mainnet…"
    : phase === "withdraw" ? "withdrawing…"
    : `Stake ${MORPHEUS_POOLS[asset].symbol}`;

  return (
    <Card className="border-violet-500/30 bg-violet-500/[0.03]">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-violet-500/50 text-violet-400">MOR · experimental</Badge>
          <CardTitle>Stake for MOR rewards</CardTitle>
        </div>
        <CardDescription>
          Stake stETH or USDC into Morpheus on <b>Ethereum mainnet</b> and earn <b>MOR</b> (on Arbitrum).
          The athlete you pick gets a protocol-funded referrer bonus. Higher upside, but MOR is a young,
          volatile token and every action is a mainnet tx (real gas) — separate from the Base vaults above.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* pick athlete + asset */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Back which rider</label>
            <select
              value={riderId}
              onChange={(e) => setRiderId(e.target.value as typeof riderId)}
              className="mt-1 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm capitalize"
            >
              {RIDER_LIST.filter((r) => r.wallet).map((r) => (
                <option key={r.id} value={r.id} className="capitalize">{r.id} (@{r.handle})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Asset</label>
            <div className="mt-1 grid grid-cols-2 gap-2 rounded-lg border border-border/60 bg-muted/30 p-1">
              {(Object.keys(MORPHEUS_POOLS) as MorpheusAsset[]).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAsset(a)}
                  className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-semibold transition ${asset === a ? "bg-violet-500 text-white" : "text-muted-foreground hover:bg-muted"}`}
                >
                  {MORPHEUS_POOLS[a].symbol}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Input
            type="number"
            inputMode="decimal"
            placeholder={`min ${MORPHEUS_POOLS[asset].minStake} ${MORPHEUS_POOLS[asset].symbol}`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Button onClick={onStake} disabled={isBusy || !you} className="shrink-0 gap-2 bg-violet-500 text-white hover:bg-violet-600">
            {phaseLabel}
          </Button>
        </div>

        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" />
          Principal is yours, withdrawable after a 7-day lock. MOR arrives on Arbitrum; claiming it comes next.
          Start small — mainnet gas can rival a small stake.
        </p>

        {/* your positions */}
        {position?.hasStake && (
          <div className="space-y-2 border-t border-border/40 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your Morpheus positions</p>
            {position.pools.filter((p) => p.staked > 0).map((p) => (
              <div key={p.asset} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-sm">
                <span className="font-mono">{fmt(p.staked, 4)} {p.symbol}</span>
                <span className="text-xs text-muted-foreground">
                  {p.pendingMor > 0 ? `${fmt(p.pendingMor, 4)} MOR pending` : "MOR accruing"}
                </span>
                <div className="flex flex-wrap gap-2">
                  {MOR_SPLITS[riderId] && (
                    <Button
                      size="sm"
                      variant={donateAssets[p.asset] ? "default" : "outline"}
                      disabled={isBusy}
                      onClick={() => onDonateToggle(p.asset)}
                      className={donateAssets[p.asset] ? "bg-violet-500 text-white hover:bg-violet-600" : ""}
                      title={`Route this position's MOR to Gnars + ${riderId}`}
                    >
                      {donateAssets[p.asset] ? `donating → ${riderId}` : "Donate MOR"}
                    </Button>
                  )}
                  {p.pendingMor > 0 && (
                    <Button size="sm" disabled={isBusy} onClick={() => onClaim(p.asset)} className="bg-violet-500 text-white hover:bg-violet-600">
                      {phase === "claim" ? "claiming…" : "Claim MOR"}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" disabled={isBusy} onClick={() => onWithdraw(p.asset, p.staked)}>
                    Withdraw
                  </Button>
                </div>
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground">
              Total accrued: <b className="text-violet-400">{fmt(position.totalMor, 4)} MOR</b>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
