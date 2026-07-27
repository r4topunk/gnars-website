"use client";

// The whole sponsorship graph as an orbital flow: the Gnars treasury at the
// center, the athletes in the first orbit, their backers in the second — with
// each stake's value on the line, and support flowing inward. Unlike the
// per-rider supporters list, this shows a backer's positions across every rider
// at once (which is why "I don't see all my stakes" happens on the flat list).
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useActiveAccount } from "thirdweb/react";
import { useStakeGraph } from "@/hooks/use-stake-graph";
import type { RiderId } from "@/lib/gnars-vaults";

// `face` zooms each full-body cut-out onto the head — same framing as the
// character-select tiles, so the orbit nodes read as portraits.
const RIDER_VISUAL: Record<
  RiderId,
  { hex: string; image: string; face: { size: string; pos: string } }
> = {
  vlad: { hex: "#f59e0b", image: "/stake/cutout/vlad.png", face: { size: "420%", pos: "50% 6%" } },
  yan: { hex: "#0ea5e9", image: "/stake/cutout/yan.png", face: { size: "420%", pos: "50% 5%" } },
  r4to: { hex: "#d946ef", image: "/stake/cutout/r4to.png", face: { size: "420%", pos: "50% 8%" } },
  pamtech: {
    hex: "#10b981",
    image: "/stake/cutout/pamtech.png",
    face: { size: "420%", pos: "50% 9%" },
  },
  v2: { hex: "#f43f5e", image: "/stake/cutout/v2.png", face: { size: "420%", pos: "50% 8%" } },
  zima: { hex: "#14b8a6", image: "/stake/cutout/zima.png", face: { size: "330%", pos: "50% 3%" } },
  will: { hex: "#818cf8", image: "/stake/cutout/will.png", face: { size: "400%", pos: "50% 8%" } },
};

const usd = (n: number) =>
  `$${n.toLocaleString("en-US", { maximumFractionDigits: n > 0 && n < 100 ? 2 : 0 })}`;
// Tiny sub-cent treasury amounts still deserve to read as non-zero.
const usdSmall = (n: number) => (n > 0 && n < 0.01 ? `$${n.toFixed(6)}` : usd(n));
const fmtMor = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 4 });
const short = (a: string) => `${a.slice(0, 5)}…${a.slice(-3)}`;
/** Prefer an ENS/basename, trimmed to fit the small orbit label. */
const nameOrShort = (addr: string, names: Record<string, string>) => {
  const n = names[addr.toLowerCase()];
  if (!n) return short(addr);
  return n.length > 16 ? `${n.slice(0, 15)}…` : n;
};
const GOLD = "#f7c948";
// Morpheus green — MOR stakes get their own colored stream, distinct from the
// rider-tinted Morpho vault flows, so a wallet that backs both shows two lines.
const MOR_GREEN = "#2be58b";
// Real protocol logos, marking each backer node by where they staked.
const MORPHO_LOGO = "/logos/morpho.webp";
const MORPHEUS_LOGO = "/logos/morpheus.webp";

const W = 760;
const C = W / 2;
const R_ATH = 208; // athlete orbit radius
const R_SUP = 328; // supporter orbit radius
const rad = (deg: number) => (deg * Math.PI) / 180;
const pt = (angleDeg: number, r: number) => ({
  x: C + r * Math.cos(rad(angleDeg)),
  y: C + r * Math.sin(rad(angleDeg)),
});

export function StakeOrbit() {
  const t = useTranslations("stake");
  const you = useActiveAccount()?.address?.toLowerCase();
  const graph = useStakeGraph();

  // Click an athlete to recenter the orbit on them; click "all" to zoom out.
  const [focusId, setFocusId] = useState<RiderId | null>(null);
  // Resolve backer addresses to ENS / basenames (batched, cached by /api/ens).
  const [ensNames, setEnsNames] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!graph) return;
    const addrs = Array.from(
      new Set(graph.athletes.flatMap((a) => a.backers.map((b) => b.address.toLowerCase()))),
    );
    if (addrs.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/ens", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ addresses: addrs }),
        });
        if (!res.ok) return;
        const json = (await res.json()) as { ensMap?: Record<string, { name?: string | null }> };
        const map: Record<string, string> = {};
        for (const [addr, data] of Object.entries(json.ensMap ?? {})) {
          if (data?.name) map[addr.toLowerCase()] = data.name;
        }
        if (!cancelled) setEnsNames(map);
      } catch {
        /* addresses stay short */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [graph]);

  if (graph === null) {
    return (
      <div className="rounded-[22px] border border-white/[0.06] bg-[#0e0b09] p-6 text-sm text-white/40">
        {t("orbit.loading")}
      </div>
    );
  }

  const athletes = graph.athletes;
  const n = athletes.length || 1;
  const maxTotal = Math.max(1, ...athletes.map((a) => a.total));

  // node radius grows a little with the amount staked, but stays legible at 0.
  const athR = (total: number) => 22 + 14 * Math.sqrt(total / maxTotal);
  // line weight ∝ amount, floored so a tiny stake is still visible.
  const supW = (amount: number) => Math.max(1.5, 6 * Math.sqrt(amount / maxTotal));

  // Focus mode: the picked athlete takes the center, the treasury slides to a
  // small satellite near the top, and everyone else drops away.
  const focused = focusId ? (athletes.find((a) => a.id === focusId) ?? null) : null;
  const treasuryPt = focused ? { x: C, y: 96 } : { x: C, y: C };
  const treasuryR = focused ? 26 : 48;

  return (
    <div className="rounded-[22px] border border-white/[0.06] bg-gradient-to-b from-[#181410] to-[#0e0b09] p-5 sm:p-7">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/50">
            {t("orbit.title")}
          </p>
          <p className="mt-1.5 max-w-md text-sm text-white/60">{t("orbit.subtitle")}</p>
        </div>
        <div className="flex gap-5 text-right">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
              {t("orbit.total")}
            </p>
            <p className="font-mono text-xl font-bold tabular-nums text-white">
              {usd(graph.total)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
              {t("orbit.backers")}
            </p>
            <p className="font-mono text-xl font-bold tabular-nums text-white">
              {graph.backerCount}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
              {t("orbit.earnedForTreasury")}
            </p>
            <p className="font-mono text-xl font-bold tabular-nums" style={{ color: GOLD }}>
              {usdSmall(graph.treasuryUsd)}
            </p>
            <p className="mt-0.5 font-mono text-[10px] tabular-nums text-white/40">
              {usdSmall(graph.gnarsAccrued)} {t("orbit.fee")} · {fmtMor(graph.gnarsMor)} MOR
            </p>
          </div>
        </div>
      </div>

      {focused && (
        <button
          type="button"
          onClick={() => setFocusId(null)}
          className="mb-3 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-3 py-1 text-xs font-semibold text-white/80 transition hover:bg-black/50"
        >
          ← {t("orbit.backToAll")}
        </button>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-4 text-[11px] text-white/50">
        <span className="flex items-center gap-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MORPHO_LOGO} alt="" className="h-4 w-4 rounded-full" />
          {t("orbit.legendVault")}
        </span>
        <span className="flex items-center gap-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MORPHEUS_LOGO} alt="" className="h-4 w-4 rounded-full" />
          {t("orbit.legendMor")}
        </span>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${W}`}
          className="mx-auto block h-auto w-full max-w-[640px]"
          role="img"
          aria-label={t("orbit.title")}
        >
          <style>{`
            @keyframes so-flow { to { stroke-dashoffset: -220; } }
            .so-flow { stroke-dasharray: 3 9; animation: so-flow 3.2s linear infinite; }
          `}</style>
          {/* orbit rings — recessive */}
          <circle cx={C} cy={C} r={R_ATH} fill="none" stroke="rgba(255,255,255,.06)" />
          <circle cx={C} cy={C} r={R_SUP} fill="none" stroke="rgba(255,255,255,.04)" />

          {athletes.map((a, i) => {
            // In focus mode, render only the focused athlete — at the center.
            if (focused && a.id !== focused.id) return null;
            const isCenter = !!focused && a.id === focused.id;
            const angle = -90 + (360 / n) * i;
            const ap = isCenter ? { x: C, y: C } : pt(angle, R_ATH);
            const v = RIDER_VISUAL[a.id];
            const lit = a.total > 0;
            const nodeR = isCenter ? 52 : athR(a.total);

            // backers fan a full circle when centered, else a ±22° arc.
            const spread = 44;
            const bs = a.backers;
            return (
              <g key={a.id}>
                {/* spoke: athlete -> treasury (the fee relationship) */}
                <line
                  x1={ap.x}
                  y1={ap.y}
                  x2={treasuryPt.x}
                  y2={treasuryPt.y}
                  stroke={lit ? v.hex : "rgba(255,255,255,.10)"}
                  strokeOpacity={lit ? 0.5 : 1}
                  strokeWidth={lit ? 2 : 1}
                />
                {lit && (
                  <line
                    x1={ap.x}
                    y1={ap.y}
                    x2={treasuryPt.x}
                    y2={treasuryPt.y}
                    className="so-flow"
                    stroke={v.hex}
                    strokeWidth={2}
                    strokeOpacity={0.9}
                  />
                )}

                {/* backer lines + dots + value labels */}
                {bs.map((b, j) => {
                  const off = bs.length === 1 ? 0 : (j / (bs.length - 1) - 0.5) * spread;
                  const bp = isCenter
                    ? pt(-90 + (360 / bs.length) * j, R_SUP)
                    : pt(angle + off, R_SUP);
                  const mid = { x: (ap.x + bp.x) / 2, y: (ap.y + bp.y) / 2 };
                  const isYou = you && b.address.toLowerCase() === you;
                  const isMor = b.kind === "mor";
                  const col = isMor ? MOR_GREEN : v.hex;
                  // `asset` belongs in the key: one wallet can stake MOR in BOTH
                  // Morpheus pools (stETH and USDC), which are two separate
                  // backer rows for the same address+kind. Without it React saw
                  // duplicate keys and dropped one of the two streams, silently
                  // hiding a real stake from the orbit.
                  return (
                    <g key={`${b.kind}-${b.asset ?? "na"}-${b.address}`}>
                      <line
                        x1={bp.x}
                        y1={bp.y}
                        x2={ap.x}
                        y2={ap.y}
                        stroke={col}
                        strokeOpacity={0.35}
                        strokeWidth={supW(b.amount)}
                        strokeLinecap="round"
                      />
                      <line
                        x1={bp.x}
                        y1={bp.y}
                        x2={ap.x}
                        y2={ap.y}
                        className="so-flow"
                        stroke={col}
                        strokeWidth={supW(b.amount)}
                        strokeLinecap="round"
                      />
                      {/* value on the line */}
                      <text
                        x={mid.x}
                        y={mid.y - 4}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="700"
                        fill="#fff"
                        style={{ paintOrder: "stroke", stroke: "#0c0a08", strokeWidth: 3 }}
                      >
                        {usd(b.amount)}
                      </text>
                      {/* backer node — the real protocol logo (Morpho or Morpheus) */}
                      {(() => {
                        const r = isYou ? 12 : 10;
                        return (
                          <>
                            <foreignObject x={bp.x - r} y={bp.y - r} width={r * 2} height={r * 2}>
                              <div
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  borderRadius: "50%",
                                  backgroundColor: "#0c0a08",
                                  backgroundImage: `url(${isMor ? MORPHEUS_LOGO : MORPHO_LOGO})`,
                                  backgroundSize: "cover",
                                  backgroundPosition: "center",
                                }}
                              />
                            </foreignObject>
                            <circle
                              cx={bp.x}
                              cy={bp.y}
                              r={r}
                              fill="none"
                              stroke={isYou ? GOLD : col}
                              strokeWidth={2}
                            />
                          </>
                        );
                      })()}
                      <text
                        x={bp.x}
                        y={bp.y + (bp.y < C ? -14 : 20)}
                        textAnchor="middle"
                        fontSize="9.5"
                        fill={isYou ? GOLD : "rgba(255,255,255,.55)"}
                        fontFamily="monospace"
                        fontWeight={isYou ? 700 : 400}
                      >
                        {isYou ? t("orbit.you") : nameOrShort(b.address, ensNames)}
                      </text>
                    </g>
                  );
                })}

                {/* athlete node — cut-out zoomed onto the face, clipped round.
                    Click to recenter on this rider (or zoom back out). */}
                <g
                  transform={`translate(${ap.x} ${ap.y})`}
                  style={{ cursor: "pointer" }}
                  onClick={() => setFocusId(isCenter ? null : a.id)}
                >
                  <circle
                    r={nodeR}
                    fill="#141210"
                    stroke={lit ? v.hex : "rgba(255,255,255,.18)"}
                    strokeWidth={lit ? 2.5 : 1.5}
                  />
                  <foreignObject x={-nodeR} y={-nodeR} width={nodeR * 2} height={nodeR * 2}>
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        backgroundImage: `url(${v.image})`,
                        backgroundSize: v.face.size,
                        backgroundPosition: v.face.pos,
                        backgroundRepeat: "no-repeat",
                        opacity: lit ? 1 : 0.45,
                      }}
                    />
                  </foreignObject>
                </g>
                {/* athlete name + total */}
                <text
                  x={ap.x}
                  y={ap.y + nodeR + 16}
                  textAnchor="middle"
                  fontSize="13"
                  fontWeight="800"
                  fill="#fff"
                >
                  {t(`characters.${a.id}.name`)}
                </text>
                <text
                  x={ap.x}
                  y={ap.y + nodeR + 31}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="700"
                  fontFamily="monospace"
                  fill={lit ? v.hex : "rgba(255,255,255,.4)"}
                >
                  {a.total > 0 ? usd(a.total) : "—"}
                </text>
              </g>
            );
          })}

          {/* treasury — center in overview, a small satellite when focused */}
          <circle
            cx={treasuryPt.x}
            cy={treasuryPt.y}
            r={treasuryR}
            fill="#0c0a08"
            stroke={GOLD}
            strokeWidth={3}
          />
          <foreignObject
            x={treasuryPt.x - (treasuryR - 4)}
            y={treasuryPt.y - (treasuryR - 4)}
            width={(treasuryR - 4) * 2}
            height={(treasuryR - 4) * 2}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                backgroundImage: "url(/gnars.webp)",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }}
            />
          </foreignObject>
          <text
            x={treasuryPt.x}
            y={treasuryPt.y + treasuryR + 16}
            textAnchor="middle"
            fontSize="11"
            fontWeight="800"
            letterSpacing="1.5"
            fill="rgba(255,255,255,.6)"
          >
            {t("orbit.treasury")}
          </text>
        </svg>
      </div>
    </div>
  );
}
