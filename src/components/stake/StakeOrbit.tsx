"use client";

// The whole sponsorship graph as an orbital flow: the Gnars treasury at the
// center, the athletes in the first orbit, their backers in the second — with
// support flowing inward. Unlike the per-rider supporters list, this shows a
// backer's positions across every rider at once (which is why "I don't see all
// my stakes" happens on the flat list).
//
// Two reading levels, on purpose:
//   OVERVIEW — a composition. Athlete names and totals only; backer nodes are
//     dots, with no ENS labels and no per-edge amounts. Printing a dollar figure
//     on every line plus a name under every dot turned the whole field into text.
//   FOCUS   — the reward for clicking. One athlete at the center, every backer
//     named and every stake priced, at sizes that are actually legible.
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useActiveAccount } from "thirdweb/react";
import { useStakeGraph } from "@/hooks/use-stake-graph";
import type { RiderId } from "@/lib/gnars-vaults";
import { EASE_IN_OUT, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { OrbitBacker, StakeGraph } from "@/services/stake-graph";

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
// Per-stake labels: always two decimals, no magnitude branch. In a dense focus
// ring "$251", "$96.4" and "$61.83" side by side read as three formatting rules;
// stake amounts share one. Athlete/graph totals keep the coarse `usd`.
const usdStake = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
// Tiny sub-cent treasury amounts still deserve to read as non-zero.
const usdSmall = (n: number) => (n > 0 && n < 0.01 ? `$${n.toFixed(6)}` : usd(n));
const fmtMor = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 4 });
const short = (a: string) => `${a.slice(0, 5)}…${a.slice(-3)}`;
/**
 * Prefer an ENS/basename, trimmed to fit the small orbit label.
 *
 * A name the graph already carries (`b.ens`) wins over the client-side lookup:
 * the live graph never sets it, but a fixture graph does, and its invented
 * addresses would otherwise resolve to nothing and print as 0x-shorts.
 */
const nameOrShort = (b: OrbitBacker, names: Record<string, string>) => {
  const n = b.ens ?? names[b.address.toLowerCase()];
  if (!n) return short(b.address);
  return n.length > 16 ? `${n.slice(0, 15)}…` : n;
};
/** Rough advance width, only for the bounds math — cheaper than measuring text
 *  in the DOM and accurate enough to keep a label from being clipped. */
const textW = (s: string, size: number) => s.length * size * 0.58;

const GOLD = "#f7c948";
// Edges carry no venue coding anymore. The graph answers WHO backs WHOM with HOW
// MUCH; Morpho vs Morpheus is explained by the sections around it, and spending a
// second hue (plus a legend to decode it) on that made every line argue for
// attention. Neutral idle, gold only for the animated stream flowing inward.
const EDGE = "rgba(255,255,255,.12)";
const EDGE_FOCUS = "rgba(255,255,255,.2)";
// Real protocol logos, marking each backer node by where they staked.
const MORPHO_LOGO = "/logos/morpho.webp";
const MORPHEUS_LOGO = "/logos/morpheus.webp";
// Dark halo behind every label so a line crossing under it never eats the text.
const HALO = { paintOrder: "stroke", stroke: "#0c0a08", strokeWidth: 3.5 } as const;

const W = 760;
const C = W / 2;
// Athlete and treasury nodes are drawn once at their LARGEST radius and scaled
// down, never up: the portrait is a CSS background inside a foreignObject, and
// scaling a 44px box up to 108px is where it would go soft. So these are the
// focus-mode sizes, and overview is a scale < 1.
const NODE_BASE_R = 54;
const TREASURY_BASE_R = 48;
const R_ATH = 196; // athlete orbit radius (overview)
const R_SUP = 300; // backer orbit, inner tier (overview)
const R_FOC = 244; // backer ring when one athlete is centered
const TIER = 30; // every other backer sits one tier further out (see FAN below)
// Focus mode keeps this arc clear at the top: the treasury satellite parks there,
// and backers spread over a full circle used to land on top of it.
const FOCUS_GAP = 76;
const rad = (deg: number) => (deg * Math.PI) / 180;
const r1 = (v: number) => Math.round(v * 10) / 10;
const pt = (angleDeg: number, r: number) => ({
  x: r1(C + r * Math.cos(rad(angleDeg))),
  y: r1(C + r * Math.sin(rad(angleDeg))),
});
/** Faint guide arc under a fan, from `a0` to `a1` degrees. */
const arcPath = (a0: number, a1: number, r: number) => {
  const s = pt(a0, r);
  const e = pt(a1, r);
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} 1 ${e.x} ${e.y}`;
};

/**
 * `chromeless` strips the component's own frame and header (card shell, title,
 * description, stats row) so a parent that already draws a panel and prints the
 * same totals does not stack two frames. Purely additive: omitted or false, the
 * output is exactly what /stake and /stake/[rider] render today. The back button
 * survives — it drives the drawing itself, not the card around it.
 *
 * `data` substitutes a caller-supplied graph for the fetched one — the
 * /stake/preview `?demo=1` fixture, which is dense enough to actually exercise
 * the fan cap and the label collision math. Also purely additive: with the prop
 * omitted this renders the live graph exactly as before. `useStakeGraph` is
 * still called unconditionally (it is a react-query subscription; skipping it
 * would break hook order), its result simply goes unused.
 */
export function StakeOrbit({
  focusRider,
  chromeless,
  data,
}: { focusRider?: RiderId | null; chromeless?: boolean; data?: StakeGraph } = {}) {
  const t = useTranslations("stake");
  const you = useActiveAccount()?.address?.toLowerCase();
  const live = useStakeGraph();
  const graph = data ?? live;

  // Click an athlete to recenter the orbit on them; click "all" to zoom out.
  const [focusId, setFocusId] = useState<RiderId | null>(focusRider ?? null);
  // Hover/keyboard-focus highlight for the athlete hit areas. One id, because
  // only one node can be pointed at or focused at a time.
  const [hotId, setHotId] = useState<RiderId | null>(null);
  // Hovered backer dot, overview only: the dot grows a step and reveals its ENS.
  // Focus mode already prints every label, so hover there would be redundant.
  const [hotBk, setHotBk] = useState<string | null>(null);
  // The hovered dot's label, rendered ONCE as a top layer instead of inside the
  // backer group: sibling dots paint after their neighbour's label in document
  // order, so an in-group label gets overdrawn by the next dot ("gnartard.e…").
  // Kept after pointer-leave so the fade-out shows the same text.
  const [hotLabel, setHotLabel] = useState<{
    x: number;
    y: number;
    anchor: "start" | "middle" | "end";
    name: string;
    isYou: boolean;
  } | null>(null);
  // A parent can seed / re-drive the focus (`focusRider`) without taking it
  // over: the graph stays interactive, this only re-syncs when the prop itself
  // changes. Omitting the prop leaves the orbit purely self-driven.
  useEffect(() => {
    if (focusRider !== undefined) setFocusId(focusRider);
  }, [focusRider]);
  // Resolve backer addresses to ENS / basenames (batched, cached by /api/ens).
  // Backers that arrive with their own `ens` are filtered out first, so a graph
  // that labels every backer itself (the preview fixture) makes no request at
  // all instead of asking the resolver about a dozen invented addresses.
  const [ensNames, setEnsNames] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!graph) return;
    const addrs = Array.from(
      new Set(
        graph.athletes.flatMap((a) =>
          a.backers.filter((b) => !b.ens).map((b) => b.address.toLowerCase()),
        ),
      ),
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
      <div
        className={
          chromeless
            ? "p-2 text-sm text-white/40"
            : "rounded-[22px] border border-white/[0.06] bg-[#0e0b09] p-6 text-sm text-white/40"
        }
      >
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

  // FAN geometry. The old fan was a hardcoded 44° while the athletes sit
  // 360/7 ≈ 51.4° apart, so a rider with several backers pushed its outermost
  // ones straight into the neighbouring rider's arc. Now the fan is proportional
  // to the backer count and hard-capped to stay inside the rider's own slot with
  // margin, and adjacent backers alternate between two radii — the separation
  // that matters (node to node) becomes diagonal instead of purely angular, which
  // is also what keeps their labels apart in focus mode.
  const slot = 360 / n;
  const FAN_STEP = 12;
  const fanMax = Math.max(12, Math.min(34, slot - 16));

  // One layout pass for the whole drawing, so the render below is only painting
  // and the frame can be fitted to real content bounds.
  const laid = athletes.map((a, i) => {
    const angle = -90 + slot * i;
    const isCenter = !!focused && a.id === focused.id;
    const p = isCenter ? { x: C, y: C } : pt(angle, R_ATH);
    const nodeR = isCenter ? NODE_BASE_R : athR(a.total);
    const count = a.backers.length;
    const fan = Math.min(fanMax, FAN_STEP * (count - 1));
    const backers = a.backers.map((b, j) => {
      const isYou = !!you && b.address.toLowerCase() === you;
      const bAngle = isCenter
        ? -90 + FOCUS_GAP / 2 + (360 - FOCUS_GAP) * ((j + 0.5) / count)
        : angle + (count > 1 ? (j / (count - 1) - 0.5) * fan : 0);
      const ring = (isCenter ? R_FOC : R_SUP) + (j % 2) * TIER;
      const q = pt(bAngle, ring);
      const nr = isYou ? 12 : 10;
      // Label sits radially outward from its node, so it never lies on its own
      // line and its anchor flips with the hemisphere.
      const ux = Math.cos(rad(bAngle));
      const uy = Math.sin(rad(bAngle));
      const anchor: "start" | "middle" | "end" = ux > 0.3 ? "start" : ux < -0.3 ? "end" : "middle";
      const lx = r1(q.x + ux * (nr + 9));
      const ly = r1(q.y + uy * (nr + 9));
      const nameY = anchor !== "middle" ? ly - 1 : uy < 0 ? ly - 16 : ly + 12;
      const name = isYou ? t("orbit.you") : nameOrShort(b, ensNames);
      const amount = usdStake(b.amount);
      return {
        b,
        isYou,
        angle: bAngle,
        x: q.x,
        y: q.y,
        nr,
        label: {
          x: lx,
          nameY,
          amtY: nameY + 14,
          anchor,
          name,
          amount,
          w: Math.max(textW(name, 12), textW(amount, 12)),
        },
      };
    });
    const arc = backers.length
      ? arcPath(
          backers[0].angle - 6,
          backers[backers.length - 1].angle + 6,
          isCenter ? R_FOC : R_SUP,
        )
      : null;
    return { a, angle, p, nodeR, isCenter, lit: a.total > 0, backers, arc };
  });

  // Everything that changes topology between the two modes — edges, backer nodes,
  // guide arcs — is drawn from the visible set only, and is replaced outright on a
  // mode change. The athlete nodes themselves keep rendering from `laid` even when
  // hidden, because a node that unmounts cannot glide anywhere.
  const placed = laid.filter((nd) => !focused || nd.isCenter);

  // Content bounds → viewBox. A fixed `0 0 W W` square left a ~150px dead band
  // under the drawing whenever the populated fans clustered in one arc (which is
  // exactly what the real data does). Bounds are padded, then the short axis is
  // grown so the frame never renders taller than it is wide, and never smaller
  // than a floor — otherwise focusing a rider with no backers would zoom the
  // portrait to fill the panel.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const box = (x0: number, y0: number, x1: number, y1: number) => {
    if (x0 < minX) minX = x0;
    if (y0 < minY) minY = y0;
    if (x1 > maxX) maxX = x1;
    if (y1 > maxY) maxY = y1;
  };
  box(
    treasuryPt.x - treasuryR - 6,
    treasuryPt.y - treasuryR - 6,
    treasuryPt.x + treasuryR + 6,
    treasuryPt.y + treasuryR + 24,
  );
  if (!focused) box(C - R_ATH, C - R_ATH, C + R_ATH, C + R_ATH);
  for (const nd of placed) {
    const half = Math.max(
      nd.nodeR + 4,
      textW(t(`characters.${nd.a.id}.name`), 15) / 2,
      nd.lit ? textW(usd(nd.a.total), 14) / 2 : 0,
    );
    box(
      nd.p.x - half,
      nd.p.y - nd.nodeR - 4,
      nd.p.x + half,
      nd.p.y + nd.nodeR + (nd.lit ? 40 : 24),
    );
    for (const bk of nd.backers) {
      box(bk.x - bk.nr - 3, bk.y - bk.nr - 3, bk.x + bk.nr + 3, bk.y + bk.nr + 3);
      if (!nd.isCenter) continue; // labels only exist in focus mode
      const { x, w, anchor, nameY, amtY } = bk.label;
      const x0 = anchor === "start" ? x : anchor === "end" ? x - w : x - w / 2;
      box(x0, Math.min(nameY, amtY) - 11, x0 + w, Math.max(nameY, amtY) + 4);
    }
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  let vw = Math.max(maxX - minX + 36, 620);
  let vh = Math.max(maxY - minY + 36, 470);
  vw = Math.max(vw, vh * 1.12); // never a column
  vh = Math.max(vh, vw / 1.55); // never a letterbox
  vw = Math.max(vw, vh * 1.12);
  const viewBox = `${r1(cx - vw / 2)} ${r1(cy - vh / 2)} ${r1(vw)} ${r1(vh)}`;

  const toggle = (id: RiderId, isCenter: boolean) => setFocusId(isCenter ? null : id);

  return (
    <div
      className={
        chromeless
          ? undefined
          : "rounded-[22px] border border-white/[0.06] bg-gradient-to-b from-[#181410] to-[#0e0b09] p-5 sm:p-7"
      }
    >
      {chromeless ? null : (
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
      )}

      {focused && (
        <button
          type="button"
          onClick={() => setFocusId(null)}
          className="mb-3 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-3 py-1 text-xs font-semibold text-white/80 transition hover:border-white/35 hover:bg-black/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
        >
          ← {t("orbit.backToAll")}
        </button>
      )}

      <div className="overflow-x-auto">
        {/* `min-w` below md makes the wrapper's horizontal scroll actually do
            something: without it the SVG is `w-full`, can never overflow, and
            gets squeezed to ~300px on a phone — labels render at ~4px. Panning
            a 680px drawing beats reading a crushed one. From md up the wrapper
            takes over and the drawing caps at 800px, where the base 12–15px
            type in the SVG lands at ~14–17px on screen. */}
        <svg
          viewBox={viewBox}
          // overflow-visible: hover labels on edge dots sit outside the fitted
          // viewBox (overview bounds don't count labels); the panel's padding
          // absorbs the spill.
          className="mx-auto block h-auto w-full min-w-[680px] max-w-[800px] overflow-visible md:min-w-0"
          role="img"
          aria-label={t("orbit.title")}
        >
          <style>{`
            @keyframes so-flow { to { stroke-dashoffset: -220; } }
            .so-flow { stroke-dasharray: 3 9; animation: so-flow 3.2s linear infinite; }
            @keyframes so-fade-in { from { opacity: 0 } to { opacity: 1 } }
            /* Overview <-> focus. The athlete (and treasury) nodes are the only
               things that exist in both modes, so they are the only things that
               move; everything else is a different drawing and simply fades in. */
            .so-glide {
              transition: transform 280ms ${EASE_IN_OUT}, opacity 200ms ${EASE_OUT};
            }
            /* CSS transforms on SVG children resolve their origin against the
               viewport, not the element — fill-box + center is what makes
               scale() happen around the node instead of around the frame. */
            .so-node { transform-box: fill-box; transform-origin: center; }
            .so-fade { animation: so-fade-in 200ms ${EASE_OUT} 120ms both; }
            /* Backer dot hover (overview): the dot grows a step and its ENS fades
               in. Transitions, not keyframes — a pointer sweeping across the fan
               retargets mid-flight instead of restarting. */
            .so-dot { transition: transform 150ms ${EASE_OUT}; }
            .so-dot-label {
              pointer-events: none;
              transition: opacity 150ms ${EASE_OUT};
            }
            @media (prefers-reduced-motion: reduce) {
              .so-glide { transition: opacity 120ms ${EASE_OUT}; }
              .so-fade { animation-duration: 120ms; animation-delay: 0ms; }
              /* Keep the label reveal (comprehension), drop the growth (motion). */
              .so-dot { transition: none; }
            }
          `}</style>

          {/* The topology layer. Keyed by mode so a focus change replaces it
              outright and re-runs its fade-in, 120ms behind the glide. */}
          <g className="so-fade" key={focused ? `focus-${focused.id}` : "overview"}>
            {/* orbit guides — recessive. The backer ring is drawn per fan instead of
              as a full circle: an unbroken 300px ring around a graph whose backers
              all sit in one arc is most of the "empty field" complaint. */}
            {!focused && (
              <circle cx={C} cy={C} r={R_ATH} fill="none" stroke="rgba(255,255,255,.05)" />
            )}
            {placed.map((nd) =>
              nd.arc ? (
                <path
                  key={`arc-${nd.a.id}`}
                  d={nd.arc}
                  fill="none"
                  stroke="rgba(255,255,255,.05)"
                />
              ) : null,
            )}

            {/* every edge, under every node */}
            {placed.map((nd) => (
              <g key={`edges-${nd.a.id}`}>
                {/* spoke: athlete -> treasury (the fee relationship) */}
                <line
                  x1={nd.p.x}
                  y1={nd.p.y}
                  x2={treasuryPt.x}
                  y2={treasuryPt.y}
                  stroke={nd.isCenter ? EDGE_FOCUS : EDGE}
                  strokeWidth={nd.lit ? 2 : 1}
                />
                {nd.lit && (
                  <line
                    x1={nd.p.x}
                    y1={nd.p.y}
                    x2={treasuryPt.x}
                    y2={treasuryPt.y}
                    className="so-flow"
                    stroke={GOLD}
                    strokeOpacity={nd.isCenter ? 0.6 : 0.42}
                    strokeWidth={2}
                  />
                )}
                {/* `asset` belongs in the key: one wallet can stake MOR in BOTH
                  Morpheus pools (stETH and USDC), which are two separate backer
                  rows for the same address+kind. Without it React saw duplicate
                  keys and dropped one of the two streams, silently hiding a real
                  stake from the orbit. */}
                {nd.backers.map((bk) => (
                  <g key={`e-${bk.b.kind}-${bk.b.asset ?? "na"}-${bk.b.address}`}>
                    <line
                      x1={bk.x}
                      y1={bk.y}
                      x2={nd.p.x}
                      y2={nd.p.y}
                      stroke={nd.isCenter ? EDGE_FOCUS : EDGE}
                      strokeWidth={supW(bk.b.amount)}
                      strokeLinecap="round"
                    />
                    <line
                      x1={bk.x}
                      y1={bk.y}
                      x2={nd.p.x}
                      y2={nd.p.y}
                      className="so-flow"
                      stroke={GOLD}
                      strokeOpacity={nd.isCenter ? 0.7 : 0.32}
                      strokeWidth={supW(bk.b.amount)}
                      strokeLinecap="round"
                    />
                  </g>
                ))}
              </g>
            ))}

            {/* backer nodes — the real protocol logo (Morpho or Morpheus). Their
              names and amounts print in focus mode only. */}
            {placed.map((nd) =>
              nd.backers.map((bk) => {
                const bkKey = `${nd.a.id}-${bk.b.kind}-${bk.b.asset ?? "na"}-${bk.b.address}`;
                const hot = !nd.isCenter && hotBk === bkKey;
                return (
                  <g
                    key={`b-${bkKey}`}
                    // Mouse only: on touch, mouseenter fires on tap and the label
                    // would stick. Focus mode ignores hover entirely.
                    onPointerEnter={(e) => {
                      if (!nd.isCenter && e.pointerType === "mouse") {
                        setHotBk(bkKey);
                        setHotLabel({
                          x: bk.label.x,
                          y: bk.label.nameY,
                          anchor: bk.label.anchor,
                          name: bk.label.name,
                          isYou: bk.isYou,
                        });
                      }
                    }}
                    onPointerLeave={() => setHotBk((cur) => (cur === bkKey ? null : cur))}
                  >
                    {/* so-node gives the group a fill-box center origin, so the
                        scale grows the dot in place instead of around the frame. */}
                    <g
                      className="so-node so-dot"
                      style={{ transform: hot ? "scale(1.3)" : "scale(1)" }}
                    >
                      <foreignObject
                        x={bk.x - bk.nr}
                        y={bk.y - bk.nr}
                        width={bk.nr * 2}
                        height={bk.nr * 2}
                      >
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            borderRadius: "50%",
                            backgroundColor: "#0c0a08",
                            backgroundImage: `url(${bk.b.kind === "mor" ? MORPHEUS_LOGO : MORPHO_LOGO})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }}
                        />
                      </foreignObject>
                      <circle
                        cx={bk.x}
                        cy={bk.y}
                        r={bk.nr}
                        fill="none"
                        stroke={
                          bk.isYou ? GOLD : hot ? "rgba(255,255,255,.6)" : "rgba(255,255,255,.28)"
                        }
                        strokeWidth={2}
                      />
                    </g>
                    {nd.isCenter && (
                      <>
                        <text
                          x={bk.label.x}
                          y={bk.label.nameY}
                          textAnchor={bk.label.anchor}
                          fontSize="12"
                          fontFamily="monospace"
                          fontWeight={bk.isYou ? 700 : 400}
                          fill={bk.isYou ? GOLD : "rgba(255,255,255,.65)"}
                          style={HALO}
                        >
                          {bk.label.name}
                        </text>
                        <text
                          x={bk.label.x}
                          y={bk.label.amtY}
                          textAnchor={bk.label.anchor}
                          fontSize="12"
                          fontFamily="monospace"
                          fontWeight="700"
                          fill="#fff"
                          style={HALO}
                        >
                          {bk.label.amount}
                        </text>
                      </>
                    )}
                  </g>
                );
              }),
            )}
          </g>

          {/* athlete — portrait, name and total in ONE hit area, so clicking the
              name does what clicking the face does. Keyboard-reachable, and the
              ring brightens on hover/focus.
              Rendered from `laid`, not `placed`: in focus mode the other six stay
              mounted at opacity 0 so the picked one has somewhere to glide from,
              and so returning to the overview does not teleport them back in.
              Hidden nodes leave the a11y tree and stop taking pointer events, which
              is what keeps click/keyboard behaviour identical to before. */}
          {laid.map((nd) => {
            const v = RIDER_VISUAL[nd.a.id];
            const hot = hotId === nd.a.id;
            const shown = !focused || nd.isCenter;
            // The portrait is drawn at NODE_BASE_R and scaled; the ring's stroke is
            // pre-divided so it lands at the intended width after the scale.
            const s = nd.nodeR / NODE_BASE_R;
            const ringW = (hot ? 3.5 : nd.lit ? 2.5 : 1.5) / s;
            return (
              <g
                key={`node-${nd.a.id}`}
                role={shown ? "button" : undefined}
                tabIndex={shown ? 0 : undefined}
                aria-hidden={shown ? undefined : true}
                aria-label={
                  shown
                    ? nd.isCenter
                      ? t("orbit.backToAll")
                      : t(`characters.${nd.a.id}.name`)
                    : undefined
                }
                className={cn("so-glide outline-none", shown ? "cursor-pointer" : "")}
                style={{
                  transform: `translate(${nd.p.x}px, ${nd.p.y}px)`,
                  opacity: shown ? 1 : 0,
                  pointerEvents: shown ? undefined : "none",
                }}
                onClick={shown ? () => toggle(nd.a.id, nd.isCenter) : undefined}
                onKeyDown={
                  shown
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggle(nd.a.id, nd.isCenter);
                        }
                      }
                    : undefined
                }
                onPointerEnter={shown ? () => setHotId(nd.a.id) : undefined}
                onPointerLeave={
                  shown ? () => setHotId((c) => (c === nd.a.id ? null : c)) : undefined
                }
                onFocus={shown ? () => setHotId(nd.a.id) : undefined}
                onBlur={shown ? () => setHotId((c) => (c === nd.a.id ? null : c)) : undefined}
              >
                <g className="so-glide so-node" style={{ transform: `scale(${r1(s)})` }}>
                  <circle cx={0} cy={0} r={NODE_BASE_R} fill="#141210" />
                  <foreignObject
                    x={-NODE_BASE_R}
                    y={-NODE_BASE_R}
                    width={NODE_BASE_R * 2}
                    height={NODE_BASE_R * 2}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        backgroundImage: `url(${v.image})`,
                        backgroundSize: v.face.size,
                        backgroundPosition: v.face.pos,
                        backgroundRepeat: "no-repeat",
                        opacity: nd.lit ? 1 : 0.45,
                      }}
                    />
                  </foreignObject>
                  <circle
                    cx={0}
                    cy={0}
                    r={NODE_BASE_R}
                    fill="none"
                    stroke={hot ? "#fff" : nd.lit ? v.hex : "rgba(255,255,255,.18)"}
                    strokeWidth={r1(ringW)}
                  />
                </g>
                {/* The caption rides its own group so it tracks the node's radius
                    as that grows, without being scaled by it. */}
                <g className="so-glide" style={{ transform: `translate(0px, ${nd.nodeR + 19}px)` }}>
                  <text
                    x={0}
                    y={0}
                    textAnchor="middle"
                    fontSize="15"
                    fontWeight="800"
                    fill={nd.lit || hot ? "#fff" : "rgba(255,255,255,.4)"}
                    style={HALO}
                  >
                    {t(`characters.${nd.a.id}.name`)}
                  </text>
                  {/* No placeholder under a rider nobody backs yet: the dimmed name
                      already says it, and a lone dash was reading as a glyph. */}
                  {nd.lit && (
                    <text
                      x={0}
                      // 18, not 16: at 16 the total's ascender box grazes the name's
                      // descender box by a fraction of a pixel once every rider has
                      // a total, and the pairwise-bbox overlap check trips on it.
                      y={18}
                      textAnchor="middle"
                      fontSize="14"
                      fontWeight="700"
                      fontFamily="monospace"
                      fill={GOLD}
                      style={HALO}
                    >
                      {usd(nd.a.total)}
                    </text>
                  )}
                </g>
              </g>
            );
          })}

          {/* Hovered backer's ENS, as its own top layer so no later-painted dot
              can overdraw it. Mounted once the first hover happens; opacity does
              the in/out so the fade retargets when sweeping across a fan. */}
          {!focused && hotLabel && (
            <text
              className="so-dot-label"
              x={hotLabel.x}
              y={hotLabel.y}
              textAnchor={hotLabel.anchor}
              fontSize="12"
              fontFamily="monospace"
              fontWeight={hotLabel.isYou ? 700 : 400}
              fill={hotLabel.isYou ? GOLD : "rgba(255,255,255,.85)"}
              style={{ ...HALO, opacity: hotBk ? 1 : 0 }}
            >
              {hotLabel.name}
            </text>
          )}

          {/* treasury — center in overview, a small satellite when focused. Drawn
              last: everything flows into it, so nothing crosses over it. It exists
              in both modes, so it glides with the athletes rather than cutting. */}
          <g
            className="so-glide"
            style={{ transform: `translate(${treasuryPt.x}px, ${treasuryPt.y}px)` }}
          >
            <g
              className="so-glide so-node"
              style={{ transform: `scale(${r1(treasuryR / TREASURY_BASE_R)})` }}
            >
              <circle
                cx={0}
                cy={0}
                r={TREASURY_BASE_R}
                fill="#0c0a08"
                stroke={GOLD}
                strokeWidth={r1(3 / (treasuryR / TREASURY_BASE_R))}
              />
              <foreignObject
                x={-(TREASURY_BASE_R - 4)}
                y={-(TREASURY_BASE_R - 4)}
                width={(TREASURY_BASE_R - 4) * 2}
                height={(TREASURY_BASE_R - 4) * 2}
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
            </g>
            <g className="so-glide" style={{ transform: `translate(0px, ${treasuryR + 18}px)` }}>
              <text
                x={0}
                y={0}
                textAnchor="middle"
                fontSize="12"
                fontWeight="800"
                letterSpacing="1.5"
                fill="rgba(255,255,255,.6)"
                style={HALO}
              >
                {t("orbit.treasury")}
              </text>
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
