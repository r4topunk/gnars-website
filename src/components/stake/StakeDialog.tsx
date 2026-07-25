"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { getRider } from "@/lib/gnars-vaults";
import { useStakeDeposit } from "@/hooks/use-stake-deposit";
import { useMorpheusStake } from "@/hooks/use-morpheus-stake";
import { useVaultPosition, useVaultEarned } from "@/hooks/use-vault-total";
import type { StakeYields } from "@/services/yields";
import { REWARD_SPLIT } from "./CharacterSelector";
import { riderCustomLine } from "@/lib/rider-lines";

// Adapted from the Claude-designed "Stake Dialog v2" — arcade-gold, three
// columns (yield source / amount / your share) over a rewards-flow hero with the
// rider talking. Real data + the real Morpho/Morpheus logos on each pool.

const GOLD = "#f5a623";
const GOLD_HI = "#f7c948";
const CLAIM_FLOOR_USD = 1;
const MORPHO_LOGO = "/logos/morpho.webp";
const MORPHEUS_LOGO = "/logos/morpheus.webp";

type OppId = "vault-usdc" | "mor-steth" | "mor-usdc";
interface Opp {
  id: OppId;
  kind: "vault" | "mor";
  asset: "usdc" | "steth";
  unit: string;
  labelKey: string;
  venue: string;
  logo: string;
  presets: number[];
  default: string;
}
const OPPS: Opp[] = [
  { id: "vault-usdc", kind: "vault", asset: "usdc", unit: "USDC", labelKey: "opp.vaultUsdc", venue: "Morpho", logo: MORPHO_LOGO, presets: [100, 500, 1000, 5000], default: "1000" },
  { id: "mor-steth", kind: "mor", asset: "steth", unit: "stETH", labelKey: "opp.morSteth", venue: "Morpheus", logo: MORPHEUS_LOGO, presets: [0.01, 0.1, 0.5, 1], default: "0.1" },
  { id: "mor-usdc", kind: "mor", asset: "usdc", unit: "USDC", labelKey: "opp.morUsdc", venue: "Morpheus", logo: MORPHEUS_LOGO, presets: [100, 500, 1000, 5000], default: "1000" },
];

interface StakeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  riderId: string;
  name: string;
  image: string;
  accent: string;
  /** Rider overall score (from the roster) — shown as a badge. */
  overall?: number;
  /** Head-crop framing for the flow avatar, mirrors the roster tiles. */
  faceSize?: string;
  facePos?: string;
}

async function fetchYields(): Promise<StakeYields> {
  const res = await fetch("/api/yields");
  if (!res.ok) throw new Error("yields");
  return res.json();
}
async function fetchEthPrice(): Promise<number> {
  const res = await fetch("/api/eth-price");
  if (!res.ok) return 0;
  const json = (await res.json()) as { usd?: number };
  return json.usd ?? 0;
}

const fmt2 = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function fmtAmount(n: number, usdc: boolean) {
  if (!isFinite(n) || n === 0) return "0";
  if (usdc) return n.toFixed(2);
  return n < 0.001 ? n.toExponential(2) : n.toFixed(n < 1 ? 4 : 3);
}

export function StakeDialog({ open, onOpenChange, riderId, name, image, accent, overall, faceSize = "420%", facePos = "50% 6%" }: StakeDialogProps) {
  const t = useTranslations("stake");
  const { stake, withdrawAll, claimRewards, phase: stakePhase, error: stakeError, isStaking, account } = useStakeDeposit();
  const morpheus = useMorpheusStake();
  const [refresh, setRefresh] = useState(0);
  const [oppId, setOppId] = useState<OppId>("vault-usdc");
  const [amount, setAmount] = useState(OPPS[0].default);

  const { data: yields } = useQuery({ queryKey: ["stake-yields"], queryFn: fetchYields, staleTime: 60_000 });
  const { data: ethUsd = 0 } = useQuery({ queryKey: ["eth-price"], queryFn: fetchEthPrice, staleTime: 60_000 });

  const opp = OPPS.find((o) => o.id === oppId)!;
  const isMor = opp.kind === "mor";
  const isUsdc = opp.asset === "usdc";

  const aprFor = (o: Opp) => (o.kind === "vault" ? yields?.usdc?.apy : yields?.mor?.[o.asset]?.apy) ?? 0;
  const rate = aprFor(opp);
  const rateKind = isMor ? "APR" : "APY";

  const assetUsd = opp.asset === "steth" ? ethUsd : 1;
  const amountNum = Math.max(0, parseFloat(amount) || 0);
  const totalAsset = (amountNum * rate) / 100; // yield in the deposit asset
  const totalUsd = totalAsset * assetUsd;
  const busy = isMor ? morpheus.isBusy : isStaking;

  const switchOpp = (next: OppId) => {
    const o = OPPS.find((x) => x.id === next)!;
    setOppId(next);
    setAmount(o.default);
  };

  // Shares of the yield — the 3-way split (mirrors the vault and the MOR split).
  const share = (pct: number) =>
    isMor ? `≈$${fmt2(totalUsd * (pct / 100))}` : `${fmt2(totalAsset * (pct / 100))} ${opp.unit}`;

  // Rider one-liner with a typewriter reveal. A skater's own lines (rider-lines.ts)
  // replace the flavor line when set; the empty/big prompts stay generic.
  const oppIndex = OPPS.indexOf(opp);
  const line = (() => {
    if (!amountNum) return t("opp.lineEmpty");
    if (amountNum >= (isUsdc ? 5000 : 1)) return t("opp.lineBig", { amount: fmtAmount(amountNum, isUsdc), asset: opp.unit });
    const custom = riderCustomLine(riderId, oppIndex);
    if (custom) return custom;
    if (opp.kind === "vault") return t("opp.lineStable", { you: fmt2(totalAsset * 0.5), asset: opp.unit });
    return t("opp.lineVar", { rate: rate.toFixed(1) });
  })();
  const [typed, setTyped] = useState(0);
  const lineRef = useRef(line);
  lineRef.current = line;
  useEffect(() => {
    setTyped(0);
    const id = setInterval(() => {
      setTyped((n) => {
        if (n >= lineRef.current.length) { clearInterval(id); return n; }
        return n + 1;
      });
    }, 24);
    return () => clearInterval(id);
  }, [line]);

  const rider = getRider(riderId);
  const position = useVaultPosition(rider?.vault, account ?? undefined, refresh);
  const earned = useVaultEarned(rider?.vault, account ?? undefined, refresh);

  const handleConfirm = async () => {
    if (isMor) {
      if (!rider?.wallet) return;
      const ok = await morpheus.stake(opp.asset === "steth" ? "stEth" : "usdc", amount, rider.wallet);
      if (ok) { toast.success(t("opp.stakedMorTitle", { name }), { description: t("opp.stakedMorDesc") }); setRefresh((n) => n + 1); onOpenChange(false); }
      else toast.error(t("dlg.failTitle"), { description: morpheus.error ?? undefined });
      return;
    }
    if (!rider?.vault) { toast.info(t("dlg.noVaultTitle"), { description: t("dlg.noVaultDesc", { name }) }); return; }
    const ok = await stake(rider.vault, amount);
    if (ok) { toast.success(t("stakeToast", { name }), { description: t("dlg.stakedDesc") }); setRefresh((n) => n + 1); onOpenChange(false); }
    else toast.error(t("dlg.failTitle"), { description: stakeError ?? undefined });
  };
  const handleClaim = async () => {
    if (!rider?.vault || !earned || earned.earnedRaw <= BigInt(0)) return;
    const ok = await claimRewards(rider.vault, earned.earnedRaw);
    if (ok) { toast.success(t("dlg.claimedTitle"), { description: t("dlg.claimedDesc") }); setRefresh((n) => n + 1); }
    else toast.error(t("dlg.claimFailTitle"), { description: stakeError ?? undefined });
  };
  const handleWithdraw = async () => {
    if (!rider?.vault || !position || position.shares <= BigInt(0)) return;
    const ok = await withdrawAll(rider.vault, position.shares);
    if (ok) { toast.success(t("dlg.withdrewTitle"), { description: t("dlg.withdrewDesc") }); setRefresh((n) => n + 1); }
    else toast.error(t("dlg.withdrawFailTitle"), { description: stakeError ?? undefined });
  };

  const confirmLabel = isMor
    ? morpheus.phase === "approve" ? t("opp.approving")
      : morpheus.phase === "stake" ? t("opp.staking")
      : morpheus.phase === "setReceiver" ? t("opp.staking")
      : `${t("opp.stakeVerb")} ${fmtAmount(amountNum, isUsdc)} ${opp.unit}`
    : stakePhase === "approve" ? t("dlg.approving")
      : stakePhase === "deposit" ? t("dlg.depositing")
      : `${t("opp.stakeVerb")} ${fmtAmount(amountNum, isUsdc)} ${opp.unit}`;

  const muted = "#8a857e";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="max-h-[94vh] gap-0 overflow-y-auto border-white/[0.08] bg-[#0e0c0a] p-0 text-white sm:max-w-[1080px]"
        style={{ fontFamily: "var(--font-sans, system-ui), sans-serif" }}
      >
        <div className="flex flex-col gap-5 p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-start justify-between gap-6 pr-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <span style={{ color: GOLD, fontSize: 20 }}>⚡</span>
                <h2 className="m-0 text-2xl font-black tracking-tight sm:text-[27px]">{t("stakeCta", { name })}</h2>
                {typeof overall === "number" && (
                  <span
                    className="rounded-full px-2.5 py-1 text-[11px] font-bold tracking-widest"
                    style={{ color: GOLD_HI, background: "rgba(245,166,35,.14)", border: "1px solid rgba(245,166,35,.3)" }}
                  >
                    {t("opp.overall")} {overall}
                  </span>
                )}
              </div>
              <p className="mt-2 max-w-[660px] text-[14.5px] leading-relaxed" style={{ color: muted }}>
                {t("dialogIntro", { name })}
              </p>
            </div>
          </div>

          {/* Hero: rewards flow + rider */}
          <div
            className="relative grid items-stretch gap-3 rounded-[20px] border border-white/[0.07] px-5 pt-[18px] sm:grid-cols-[minmax(0,1fr)_260px]"
            style={{ background: "radial-gradient(90% 120% at 88% 100%, rgba(245,140,30,.22) 0%, rgba(245,140,30,0) 58%), rgba(255,255,255,.03)" }}
          >
            <div className="min-w-0 pb-[18px]">
              <div className="mb-1.5 flex items-baseline justify-between gap-4">
                <span className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: muted }}>{t("opp.howRewardsFlow")}</span>
                <span className="text-[15px] font-black" style={{ color: GOLD_HI }}>
                  {isMor ? `≈$${fmt2(totalUsd)} ${t("opp.perYearMor")}` : `${fmt2(totalAsset)} ${opp.unit} / ${t("perYear")}`}
                </span>
              </div>
              <RewardFlow
                riderName={name}
                riderImg={image}
                faceSize={faceSize}
                facePos={facePos}
                youVal={share(REWARD_SPLIT.you)}
                ridVal={share(REWARD_SPLIT.skater)}
                gnaVal={share(REWARD_SPLIT.treasury)}
                youLabel={t("youLabel")}
                gnarsLabel="Gnars"
                srcLabel={t("flowSource")}
              />
            </div>

            {/* Rider speech + face crop */}
            <div className="relative hidden min-h-[320px] flex-col gap-4 pt-1.5 sm:flex">
              <div
                className="relative flex flex-1 flex-col justify-center rounded-2xl p-4"
                style={{ background: "linear-gradient(180deg,#1c1714,#141110)", border: `2px solid ${GOLD}`, boxShadow: "0 12px 30px rgba(0,0,0,.55)" }}
              >
                <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ color: GOLD_HI }}>{name}</div>
                <div className="text-[13.5px] font-semibold leading-relaxed" style={{ color: "#e8e4df" }}>
                  {line.slice(0, typed)}
                  <span style={{ color: GOLD }}>{typed < line.length ? "▌" : ""}</span>
                </div>
                <div
                  className="absolute -bottom-2.5 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45"
                  style={{ background: "#141110", borderRight: `2px solid ${GOLD}`, borderBottom: `2px solid ${GOLD}` }}
                />
              </div>
              {/* face crop — head only, so the speech bubble gets the room */}
              <div
                aria-hidden
                className="h-[156px] flex-none overflow-hidden rounded-2xl border border-white/[0.08]"
                style={{
                  backgroundImage: `url(${image})`, backgroundRepeat: "no-repeat",
                  backgroundSize: faceSize, backgroundPosition: facePos,
                  boxShadow: "inset 0 -46px 44px rgba(14,12,10,.55)",
                }}
              />
            </div>
          </div>

          {/* Three columns */}
          <div className="grid items-start gap-5 sm:grid-cols-3">
            {/* Yield source */}
            <div className="min-w-0">
              <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.24em]" style={{ color: muted }}>{t("opp.yieldSource")}</div>
              <div className="flex flex-col gap-2.5">
                {OPPS.map((o) => {
                  const active = o.id === oppId;
                  const apr = aprFor(o);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => switchOpp(o.id)}
                      aria-pressed={active}
                      className="flex cursor-pointer items-center gap-3 rounded-[13px] px-3.5 py-3 text-left transition"
                      style={{
                        border: active ? `2px solid ${GOLD}` : "1px solid rgba(255,255,255,.09)",
                        background: active ? "rgba(245,166,35,.09)" : "rgba(255,255,255,.035)",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={o.logo} alt="" className="h-6 w-6 flex-none rounded-full" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold">{t(o.labelKey)}</div>
                        <div className="mt-0.5 text-[11.5px] font-semibold" style={{ color: muted }}>
                          {o.kind === "vault" ? t("opp.stableTag") : t("opp.morTag")} · {o.unit}
                        </div>
                      </div>
                      <div className="flex-none text-[17px] font-black" style={{ color: GOLD_HI }}>
                        {apr ? `${o.kind === "mor" ? "~" : ""}${apr.toFixed(1)}%` : "—"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount */}
            <div className="min-w-0">
              <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.24em]" style={{ color: muted }}>{t("amountLabel")}</div>
              <div className="flex h-[58px] items-center gap-2.5 rounded-[14px] border border-white/[0.11] px-4" style={{ background: "rgba(255,255,255,.045)" }}>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  inputMode="decimal"
                  className="min-w-0 flex-1 border-none bg-transparent text-2xl font-extrabold tracking-tight text-white outline-none"
                />
                <span className="text-sm font-bold" style={{ color: "#8f8a83" }}>{opp.unit}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {opp.presets.map((v) => {
                  const on = String(v) === amount;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setAmount(String(v))}
                      className="cursor-pointer rounded-[10px] px-3 py-2 text-[12.5px] font-bold"
                      style={{
                        color: on ? "#1a1205" : "#c9c6c2",
                        background: on ? "linear-gradient(90deg,#f7c948,#f5851f)" : "rgba(255,255,255,.05)",
                        border: on ? "1px solid transparent" : "1px solid rgba(255,255,255,.09)",
                      }}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
              {rate > 0 && (
                <div className="mt-3 text-[12.5px] font-semibold" style={{ color: muted }}>
                  {t("aprNote", { rate: rate.toFixed(2), rateType: rateKind, source: opp.venue })}
                </div>
              )}
              {isMor && (
                <div className="mt-2 text-[11.5px] font-semibold" style={{ color: "#b8741a" }}>{t("opp.mainnetWarn")}</div>
              )}
            </div>

            {/* Your share */}
            <div className="flex min-w-0 flex-col gap-3 rounded-[18px] border border-white/[0.07] p-[18px]" style={{ background: "rgba(255,255,255,.035)" }}>
              <div className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: muted }}>{t("opp.yourShare")}</div>
              <div className="flex items-baseline gap-2">
                <span className="text-[34px] font-black leading-none tracking-tight" style={{ color: GOLD_HI }}>
                  {isMor ? `≈$${fmt2(totalUsd * 0.5)}` : fmt2(totalAsset * 0.5)}
                </span>
                <span className="text-[13px] font-bold" style={{ color: muted }}>
                  {isMor ? t("opp.perYearMor") : `${opp.unit} / ${t("perYear")}`}
                </span>
              </div>
              <div className="h-px bg-white/[0.08]" />
              {[
                { label: t("youLabel"), color: GOLD_HI, pct: REWARD_SPLIT.you },
                { label: name, color: "#b8741a", pct: REWARD_SPLIT.skater },
                { label: t("treasuryLabel"), color: "#5c4520", pct: REWARD_SPLIT.treasury },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2.5">
                  <div className="h-2 w-2 flex-none rounded-[2px]" style={{ background: s.color }} />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{s.label}</span>
                  <span className="text-[13px] font-extrabold" style={{ color: "#c9c6c2" }}>{share(s.pct)}</span>
                </div>
              ))}
              <button
                type="button"
                onClick={handleConfirm}
                disabled={busy}
                className="mt-auto cursor-pointer rounded-[13px] px-5 py-3.5 text-center text-[14.5px] font-extrabold disabled:opacity-70"
                style={{ color: "#1a1205", background: "linear-gradient(90deg,#f7c948,#f5851f)", boxShadow: "0 8px 24px rgba(245,133,31,.28)" }}
              >
                {confirmLabel}
              </button>
            </div>
          </div>

          {/* Vault position management — only when a live position exists */}
          {!isMor && position && position.shares > BigInt(0) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-white/[0.07] px-4 py-3 text-xs" style={{ background: "rgba(255,255,255,.02)" }}>
              <span style={{ color: muted }}>
                {t("opp.yourPosition")}: <strong className="font-mono text-white">${position.assets.toFixed(2)}</strong>
                {earned && earned.principal > 0 && (
                  <span className="opacity-80"> ({t("opp.principal")} ${earned.principal.toFixed(2)} · {t("opp.yield")} <span style={{ color: "#4ade80" }}>${earned.earned.toFixed(2)}</span>)</span>
                )}
              </span>
              <div className="ml-auto flex items-center gap-2">
                {earned && earned.earned >= CLAIM_FLOOR_USD && (
                  <button type="button" onClick={handleClaim} disabled={isStaking} className="cursor-pointer rounded-lg border border-white/15 px-3 py-1.5 font-semibold hover:bg-white/5 disabled:opacity-60">
                    {stakePhase === "claim" ? t("dlg.claiming") : t("dlg.claim", { amount: `$${earned.earned.toFixed(2)}` })}
                  </button>
                )}
                <button type="button" onClick={handleWithdraw} disabled={isStaking} className="cursor-pointer rounded-lg border border-white/15 px-3 py-1.5 font-semibold hover:bg-white/5 disabled:opacity-60">
                  {stakePhase === "withdraw" ? t("dlg.withdrawing") : t("dlg.withdrawAll")}
                </button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-start gap-2 border-t border-white/[0.07] pt-3.5 text-xs leading-normal" style={{ color: "#7d7871" }}>
            <span className="flex-none">ⓘ</span>
            <span>{t("disclaimer")}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** The rewards-flow SVG (gold streams → You / rider / Gnars) with real avatars overlaid. */
function RewardFlow({
  riderName, riderImg, faceSize, facePos, youVal, ridVal, gnaVal, youLabel, gnarsLabel, srcLabel,
}: {
  riderName: string; riderImg: string; faceSize: string; facePos: string;
  youVal: string; ridVal: string; gnaVal: string; youLabel: string; gnarsLabel: string; srcLabel: string;
}) {
  const P = {
    you: "M126,181 C280,181 320,70 403,70",
    rid: "M126,190 L403,190",
    gna: "M126,199 C280,199 320,310 403,310",
  };
  const stream = (id: string, d: string, n: number) =>
    Array.from({ length: n }, (_, i) => (
      <circle key={id + i} r={4} fill={GOLD_HI}>
        <animateMotion dur="2.8s" repeatCount="indefinite" begin={`${((i * 2.8) / n).toFixed(2)}s`} path={d} />
      </circle>
    ));
  const node = (key: string, cy: number, label: string, pct: string, val: string, inner?: ReactNode) => (
    <g key={key}>
      <circle cx={430} cy={cy} r={27} fill="#14110e" stroke={GOLD} strokeWidth={3} />
      {inner}
      <text x={470} y={cy - 10} fill="#fff" fontSize={20} fontWeight={800}>{label}</text>
      <text x={470} y={cy + 13} fill={GOLD} fontSize={17} fontWeight={800}>{pct}</text>
      <text x={470} y={cy + 33} fill="#8a857e" fontSize={13} fontWeight={600}>{val}</text>
    </g>
  );
  const overlay = (topPct: number, size: string, pos: string, url: string): CSSProperties => ({
    position: "absolute", left: "66.67%", top: `${topPct}%`, width: "7.13%", aspectRatio: "1",
    transform: "translate(-50%,-50%)", borderRadius: "50%", overflow: "hidden",
    backgroundImage: `url(${url})`, backgroundRepeat: "no-repeat", backgroundSize: size, backgroundPosition: pos,
  });

  return (
    <div className="relative w-full">
      <svg viewBox="0 0 645 385" style={{ width: "100%", height: "auto", display: "block" }}>
        <defs>
          <linearGradient id="flowG2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={GOLD} stopOpacity={0.3} />
            <stop offset="100%" stopColor={GOLD_HI} stopOpacity={0.95} />
          </linearGradient>
        </defs>
        <path d={P.you} stroke="url(#flowG2)" strokeWidth={15} fill="none" strokeLinecap="round" />
        <path d={P.gna} stroke="url(#flowG2)" strokeWidth={8} fill="none" strokeLinecap="round" />
        <path d={P.rid} stroke="url(#flowG2)" strokeWidth={8} fill="none" strokeLinecap="round" />
        {stream("y", P.you, 3)}
        {stream("r", P.rid, 2)}
        {stream("g", P.gna, 2)}

        <circle cx={110} cy={190} r={15} fill={GOLD} />
        <text x={110} y={152} fill="#fff" fontSize={17} fontWeight={700} textAnchor="middle">{srcLabel}</text>

        {node("n1", 70, youLabel, "50%", youVal, (
          <text x={430} y={76} fill={GOLD_HI} fontSize={13} fontWeight={800} textAnchor="middle">{youLabel.slice(0, 3).toUpperCase()}</text>
        ))}
        {node("n2", 190, riderName, "25%", ridVal)}
        {node("n3", 310, gnarsLabel, "25%", gnaVal)}
      </svg>
      {/* real avatars over the rider + Gnars nodes */}
      <div aria-hidden style={overlay(49.35, faceSize, facePos, riderImg)} />
      <div aria-hidden style={overlay(80.5, "cover", "center", "/gnars.webp")} />
    </div>
  );
}
