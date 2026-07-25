"use client";

// The whole sponsorship graph as an orbital flow: the Gnars treasury at the
// center, the athletes in the first orbit, their backers in the second — with
// each stake's value on the line, and support flowing inward. Unlike the
// per-rider supporters list, this shows a backer's positions across every rider
// at once (which is why "I don't see all my stakes" happens on the flat list).

import { useTranslations } from "next-intl";
import { useActiveAccount } from "thirdweb/react";
import { useStakeGraph } from "@/hooks/use-stake-graph";
import type { RiderId } from "@/lib/gnars-vaults";

// `face` zooms each full-body cut-out onto the head — same framing as the
// character-select tiles, so the orbit nodes read as portraits.
const RIDER_VISUAL: Record<RiderId, { hex: string; image: string; face: { size: string; pos: string } }> = {
  vlad: { hex: "#f59e0b", image: "/stake/cutout/vlad.png", face: { size: "420%", pos: "50% 6%" } },
  yan: { hex: "#0ea5e9", image: "/stake/cutout/yan.png", face: { size: "420%", pos: "50% 5%" } },
  r4to: { hex: "#d946ef", image: "/stake/cutout/r4to.png", face: { size: "420%", pos: "50% 8%" } },
  pamtech: { hex: "#10b981", image: "/stake/cutout/pamtech.png", face: { size: "420%", pos: "50% 9%" } },
  v2: { hex: "#f43f5e", image: "/stake/cutout/v2.png", face: { size: "420%", pos: "50% 8%" } },
  zima: { hex: "#14b8a6", image: "/stake/cutout/zima.png", face: { size: "330%", pos: "50% 3%" } },
};

const usd = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: n > 0 && n < 100 ? 2 : 0 })}`;
const short = (a: string) => `${a.slice(0, 5)}…${a.slice(-3)}`;
const GOLD = "#f7c948";
// Morpheus green — MOR stakes get their own colored stream, distinct from the
// rider-tinted Morpho vault flows, so a wallet that backs both shows two lines.
const MOR_GREEN = "#2be58b";

const W = 760;
const C = W / 2;
const R_ATH = 208; // athlete orbit radius
const R_SUP = 328; // supporter orbit radius
const rad = (deg: number) => (deg * Math.PI) / 180;
const pt = (angleDeg: number, r: number) => ({ x: C + r * Math.cos(rad(angleDeg)), y: C + r * Math.sin(rad(angleDeg)) });

export function StakeOrbit() {
  const t = useTranslations("stake");
  const you = useActiveAccount()?.address?.toLowerCase();
  const graph = useStakeGraph();

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

  return (
    <div className="rounded-[22px] border border-white/[0.06] bg-gradient-to-b from-[#181410] to-[#0e0b09] p-5 sm:p-7">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/50">{t("orbit.title")}</p>
          <p className="mt-1.5 max-w-md text-sm text-white/60">{t("orbit.subtitle")}</p>
        </div>
        <div className="flex gap-5 text-right">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">{t("orbit.total")}</p>
            <p className="font-mono text-xl font-bold tabular-nums text-white">{usd(graph.total)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">{t("orbit.backers")}</p>
            <p className="font-mono text-xl font-bold tabular-nums text-white">{graph.backerCount}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">{t("orbit.earnedForTreasury")}</p>
            <p className="font-mono text-xl font-bold tabular-nums" style={{ color: GOLD }}>
              {graph.gnarsAccrued > 0 && graph.gnarsAccrued < 0.01 ? `$${graph.gnarsAccrued.toFixed(6)}` : usd(graph.gnarsAccrued)}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-4 text-[11px] text-white/50">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-white/60" />
          {t("orbit.legendVault")}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-black text-[#04140d]"
            style={{ background: MOR_GREEN }}
          >
            M
          </span>
          {t("orbit.legendMor")}
        </span>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${W}`} className="mx-auto block h-auto w-full max-w-[640px]" role="img" aria-label={t("orbit.title")}>
          <style>{`
            @keyframes so-flow { to { stroke-dashoffset: -220; } }
            .so-flow { stroke-dasharray: 3 9; animation: so-flow 3.2s linear infinite; }
          `}</style>
          {/* orbit rings — recessive */}
          <circle cx={C} cy={C} r={R_ATH} fill="none" stroke="rgba(255,255,255,.06)" />
          <circle cx={C} cy={C} r={R_SUP} fill="none" stroke="rgba(255,255,255,.04)" />

          {athletes.map((a, i) => {
            const angle = -90 + (360 / n) * i;
            const ap = pt(angle, R_ATH);
            const v = RIDER_VISUAL[a.id];
            const lit = a.total > 0;

            // backers fan out within ±22° of the athlete's angle on the outer ring
            const spread = 44;
            const bs = a.backers;
            return (
              <g key={a.id}>
                {/* spoke: athlete -> treasury (the fee relationship) */}
                <line
                  x1={ap.x} y1={ap.y} x2={C} y2={C}
                  stroke={lit ? v.hex : "rgba(255,255,255,.10)"}
                  strokeOpacity={lit ? 0.5 : 1}
                  strokeWidth={lit ? 2 : 1}
                />
                {lit && (
                  <line x1={ap.x} y1={ap.y} x2={C} y2={C} className="so-flow" stroke={v.hex} strokeWidth={2} strokeOpacity={0.9} />
                )}

                {/* backer lines + dots + value labels */}
                {bs.map((b, j) => {
                  const off = bs.length === 1 ? 0 : (j / (bs.length - 1) - 0.5) * spread;
                  const bp = pt(angle + off, R_SUP);
                  const mid = { x: (ap.x + bp.x) / 2, y: (ap.y + bp.y) / 2 };
                  const isYou = you && b.address.toLowerCase() === you;
                  const isMor = b.kind === "mor";
                  const col = isMor ? MOR_GREEN : v.hex;
                  return (
                    <g key={`${b.kind}-${b.address}`}>
                      <line x1={bp.x} y1={bp.y} x2={ap.x} y2={ap.y} stroke={col} strokeOpacity={0.35} strokeWidth={supW(b.amount)} strokeLinecap="round" />
                      <line x1={bp.x} y1={bp.y} x2={ap.x} y2={ap.y} className="so-flow" stroke={col} strokeWidth={supW(b.amount)} strokeLinecap="round" />
                      {/* value on the line */}
                      <text x={mid.x} y={mid.y - 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff" style={{ paintOrder: "stroke", stroke: "#0c0a08", strokeWidth: 3 }}>
                        {usd(b.amount)}
                      </text>
                      {/* backer node — MOR stakes carry the green Morpheus "M" mark */}
                      <circle
                        cx={bp.x} cy={bp.y} r={isYou ? 9 : 7}
                        fill={isMor ? col : isYou ? GOLD : "#0c0a08"}
                        stroke={isYou ? GOLD : col}
                        strokeWidth={2}
                      />
                      {isMor && (
                        <text x={bp.x} y={bp.y + 3} textAnchor="middle" fontSize="9" fontWeight="900" fill="#04140d">
                          M
                        </text>
                      )}
                      <text x={bp.x} y={bp.y + (bp.y < C ? -14 : 20)} textAnchor="middle" fontSize="9.5" fill={isYou ? GOLD : "rgba(255,255,255,.55)"} fontFamily="monospace" fontWeight={isYou ? 700 : 400}>
                        {isYou ? t("orbit.you") : short(b.address)}
                      </text>
                    </g>
                  );
                })}

                {/* athlete node — cut-out zoomed onto the face, clipped round */}
                <g transform={`translate(${ap.x} ${ap.y})`}>
                  <circle r={athR(a.total)} fill="#141210" stroke={lit ? v.hex : "rgba(255,255,255,.18)"} strokeWidth={lit ? 2.5 : 1.5} />
                  <foreignObject x={-athR(a.total)} y={-athR(a.total)} width={athR(a.total) * 2} height={athR(a.total) * 2}>
                    <div
                      style={{
                        width: "100%", height: "100%", borderRadius: "50%",
                        backgroundImage: `url(${v.image})`, backgroundSize: v.face.size,
                        backgroundPosition: v.face.pos, backgroundRepeat: "no-repeat",
                        opacity: lit ? 1 : 0.45,
                      }}
                    />
                  </foreignObject>
                </g>
                {/* athlete name + total */}
                <text x={ap.x} y={ap.y + athR(a.total) + 16} textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff">
                  {t(`characters.${a.id}.name`)}
                </text>
                <text x={ap.x} y={ap.y + athR(a.total) + 31} textAnchor="middle" fontSize="12" fontWeight="700" fontFamily="monospace" fill={lit ? v.hex : "rgba(255,255,255,.4)"}>
                  {a.total > 0 ? usd(a.total) : "—"}
                </text>
              </g>
            );
          })}

          {/* treasury center — the Gnars logo */}
          <circle cx={C} cy={C} r={48} fill="#0c0a08" stroke={GOLD} strokeWidth={3} />
          <foreignObject x={C - 44} y={C - 44} width={88} height={88}>
            <div
              style={{
                width: "100%", height: "100%", borderRadius: "50%",
                backgroundImage: "url(/gnars.webp)", backgroundSize: "cover",
                backgroundPosition: "center", backgroundRepeat: "no-repeat",
              }}
            />
          </foreignObject>
          <text x={C} y={C + 68} textAnchor="middle" fontSize="11" fontWeight="800" letterSpacing="1.5" fill="rgba(255,255,255,.6)">{t("orbit.treasury")}</text>
        </svg>
      </div>
    </div>
  );
}
