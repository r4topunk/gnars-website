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
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useActiveAccount } from "thirdweb/react";
import { useStakeGraphQuery } from "@/hooks/use-stake-graph";
import type { RiderId } from "@/lib/gnars-vaults";
import { EASE_IN_OUT, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { OrbitBacker, StakeGraph } from "@/services/stake-graph";

// `face` zooms each full-body cut-out onto the head — same framing as the
// character-select tiles, so the orbit nodes read as portraits.
//
// `clip` is the same alpha cut-out video the character select plays, framed into
// the node with the same zoom as the still. Kept here rather than imported from
// CharacterSelector on purpose: pulling that module in would drag StakeDialog,
// YieldStatus and framer-motion into the graph for the sake of a data map. The
// two definitions must stay in step — a rider gaining a clip needs it in both.
const RIDER_VISUAL: Record<
  RiderId,
  {
    hex: string;
    image: string;
    face: { size: string; pos: string };
    /** The cut-out PNG's height/width. The portrait is a native SVG <image>
     *  (see the node render for why), so the CSS background-size shorthand's
     *  "height: auto" has to be computed by hand — which needs the file's real
     *  aspect ratio. Measured from the assets; a re-exported cut-out with new
     *  dimensions must update this or the face crop drifts. */
    ratio: number;
    /** Alpha cut-out clip. Played whole inside the node — the still's `face`
     *  zoom applies to the portrait only. */
    clip?: { src: string };
  }
> = {
  vlad: {
    hex: "#f59e0b",
    image: "/stake/cutout/vlad.png",
    face: { size: "420%", pos: "50% 6%" },
    ratio: 1448 / 1086,
  },
  yan: {
    hex: "#0ea5e9",
    image: "/stake/cutout/yan.png",
    face: { size: "420%", pos: "50% 5%" },
    ratio: 1448 / 1086,
  },
  r4to: {
    hex: "#d946ef",
    image: "/stake/cutout/r4to.png",
    face: { size: "420%", pos: "50% 5%" },
    ratio: 1024 / 688,
    clip: { src: "/stake/video/r4to.webm" },
  },
  pamtech: {
    hex: "#10b981",
    image: "/stake/cutout/pamtech.png",
    face: { size: "420%", pos: "50% 9%" },
    ratio: 1448 / 1086,
  },
  v2: {
    hex: "#f43f5e",
    image: "/stake/cutout/v2.png",
    face: { size: "420%", pos: "50% 8%" },
    ratio: 1448 / 1086,
  },
  zima: {
    hex: "#14b8a6",
    image: "/stake/cutout/zima.png",
    face: { size: "330%", pos: "50% 3%" },
    ratio: 586 / 426,
  },
  will: {
    hex: "#818cf8",
    image: "/stake/cutout/will.png",
    face: { size: "400%", pos: "50% 8%" },
    ratio: 564 / 442,
  },
  ephraim: {
    hex: "#fb923c",
    image: "/stake/cutout/ephraim.png",
    face: { size: "300%", pos: "50% 8%" },
    ratio: 576 / 764,
  },
};

/**
 * Where the face crop lands inside the node's square, in local SVG units.
 *
 * This is CSS `background-size: S%` / `background-position: PX% PY%` re-derived
 * for a native <image>, because the portrait cannot be a foreignObject: in
 * WebKit a foreignObject is not a containing block, so absolutely-positioned
 * children (`inset: 0`, which the crop layer needs) resolve against nothing and
 * never paint — on iOS every rider rendered as an empty ring, while the
 * treasury's foreignObject (a plain static div) drew fine two inches away. The
 * CSS rules being replicated:
 *   width  = S% of the box; height follows the image's aspect (the `ratio`)
 *   offset = P% of (box − drawn size)  — position percentages resolve against
 *            the LEFTOVER space, not the box; that is what makes "50% 6%"
 *            center the face and pin it near the top.
 */
function portraitRect(v: (typeof RIDER_VISUAL)[RiderId]) {
  const box = NODE_BASE_R * 2;
  const sizePct = parseFloat(v.face.size) / 100;
  const [pxRaw, pyRaw] = v.face.pos.split(" ");
  const px = parseFloat(pxRaw) / 100;
  const py = parseFloat(pyRaw) / 100;
  const w = box * sizePct;
  const h = w * v.ratio;
  return {
    x: -NODE_BASE_R + px * (box - w),
    y: -NODE_BASE_R + py * (box - h),
    width: w,
    height: h,
  };
}

/** How long `.so-glide` takes. The clip waits for it: starting a video while the
 *  node is still travelling means the first frames play off to one side. */
const GLIDE_MS = 280;

// Every number in the drawing takes the APP locale, not a hardcoded "en-US": the
// stat line directly above this graph prints "$55,11" from the request locale, and
// the same $17.02 appearing as "$17.02" in a node label two inches below it read
// as two different values. The helpers stay module-level (they are pure) and take
// the locale as an argument, the same shape BackerList and SubnetSection use.
const usd = (n: number, locale: string) =>
  `$${n.toLocaleString(locale, { maximumFractionDigits: n > 0 && n < 100 ? 2 : 0 })}`;
// Per-stake labels: always two decimals, no magnitude branch. In a dense focus
// ring "$251", "$96.4" and "$61.83" side by side read as three formatting rules;
// stake amounts share one. Athlete/graph totals keep the coarse `usd`.
const usdStake = (n: number, locale: string) =>
  `$${n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
 * The component draws the graph and nothing else: no card, no title, no stats
 * row. Its only caller (StakePageContent) already frames the orbit in the social
 * section's panel and prints the same totals above it, so owning a second frame
 * only ever meant stacking two. The back button stays — it drives the drawing
 * itself, not the card around it.
 *
 * `data` substitutes a caller-supplied graph for the fetched one — the seam a
 * fixture dense enough to exercise the fan cap and the label collision math
 * plugs into. Nothing on /stake passes it today (the page is live-only). Also
 * purely additive: with the prop omitted this renders the live graph exactly as
 * before. `useStakeGraph` is
 * still called unconditionally (it is a react-query subscription; skipping it
 * would break hook order), its result simply goes unused.
 *
 * `onFocusChange` reports focus back to whoever seeded it, so a parent holding
 * `focusRider` in state stays truthful when the user re-focuses FROM the graph
 * (clicking a node, or "all riders"). Without it the two drifted and then stuck:
 * parent still on "vlad", graph back on the overview, so re-picking vlad in the
 * selector set the same value, React bailed on the re-render, and the seeding
 * effect below never fired — the graph ignored the pick.
 */
export function StakeOrbit({
  focusRider,
  onFocusChange,
  data,
}: {
  focusRider?: RiderId | null;
  onFocusChange?: (id: RiderId | null) => void;
  data?: StakeGraph;
} = {}) {
  const t = useTranslations("stake");
  const locale = useLocale();
  const you = useActiveAccount()?.address?.toLowerCase();
  const { data: live, isError, refetch, isFetching } = useStakeGraphQuery();
  const graph = data ?? live ?? null;

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
  /**
   * The clip playing inside a node, and whether its first frame is on screen.
   *
   * `clipShowing` gates hiding the still for the same reason the character select
   * does: with preload="none" there is a beat before playback, and swapping on
   * the click alone leaves a hole in the graph. The still stays under the clip
   * until there is something to replace it with.
   */
  const [clipId, setClipId] = useState<RiderId | null>(null);
  const [clipShowing, setClipShowing] = useState(false);
  const clipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dropClip = useCallback(() => {
    if (clipTimer.current) {
      clearTimeout(clipTimer.current);
      clipTimer.current = null;
    }
    setClipId(null);
    setClipShowing(false);
  }, []);

  // The clip belongs to the focused rider. Any move away — another node, "all
  // riders", or the picker above driving `focusRider` — puts the still back, so
  // a rider is always re-entered as their photo.
  useEffect(() => {
    if (clipId && focusId !== clipId) dropClip();
  }, [focusId, clipId, dropClip]);
  useEffect(() => () => dropClip(), [dropClip]);
  // Focus mode unmounts every node but the center, and unmounted nodes never fire
  // their pointerleave — a highlight left on one could never clear itself, so the
  // dot label reappeared at opacity 1 (and a portrait kept its hover ring) with no
  // pointer anywhere near it on the way back to the overview.
  //
  // Has to be an effect keyed on `focusId` rather than a line in `toggle`: focus
  // also arrives from the `focusRider` prop (the picker above the graph), which
  // never runs the click handler. `hotLabel` is deliberately left alone so the
  // fade-out still shows the right text.
  useEffect(() => {
    if (!focusId) return;
    // `c === focusId` survives: hovering a node and clicking it makes that node
    // the center, and it is still under the pointer.
    setHotId((c) => (c && c !== focusId ? null : c));
    setHotBk(null);
  }, [focusId]);
  // Phones pan across a 680px drawing inside a ~390px window, and a scroller
  // opens at scrollLeft 0 — which parked the reader on the empty left margin
  // with the treasury cut in half at the right edge. The graph is drawn around
  // its centre, so that is where it should open. Runs whenever the drawing's
  // width changes (focus mode refits the viewBox) and no-ops on desktop, where
  // the SVG fits and there is nothing to scroll.
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const slack = el.scrollWidth - el.clientWidth;
    if (slack > 0) el.scrollLeft = slack / 2;
  }, [graph, focusId]);
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

  // A dead /api/stake-graph used to render as an eternal "loading the flow…".
  // Only the fetched arm can fail, so a caller-supplied `data` still wins.
  if (graph === null && isError) {
    return (
      <div className="space-y-2 p-2 text-sm text-white/60">
        <p>{t("orbit.error")}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="cursor-pointer font-semibold text-white underline underline-offset-4 hover:text-white/80 disabled:cursor-default disabled:opacity-60"
        >
          {t("orbit.retry")}
        </button>
      </div>
    );
  }

  if (graph === null) {
    return <div className="p-2 text-sm text-white/40">{t("orbit.loading")}</div>;
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
  //
  // The satellite sits INSIDE the backer ring, not on it: the FOCUS_GAP wedge it
  // occupies holds no backers, so a treasury out at R_FOC (where it used to be)
  // put ~190px of empty stage between itself and the rider — on a phone that
  // panned as a screenful of void with one dashed line through it. Pulled in,
  // the whole fitted frame tightens with it (the viewBox is bounds-driven).
  const focused = focusId ? (athletes.find((a) => a.id === focusId) ?? null) : null;
  const treasuryPt = focused ? { x: C, y: C - (R_FOC - 76) } : { x: C, y: C };
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
      const amount = usdStake(b.amount, locale);
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
      nd.lit ? textW(usd(nd.a.total, locale), 14) / 2 : 0,
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

  // One writer for focus, so the parent is told about every change the graph makes
  // to it. Setting the state without reporting is what let the two fall out of
  // sync (and then stick, because the seeding effect only fires on prop CHANGES).
  const setFocus = (id: RiderId | null) => {
    setFocusId(id);
    onFocusChange?.(id);
  };

  // Clicking a rider focuses them, and — once the graph has finished travelling —
  // their portrait hands over to their clip. It runs once and stays on its last
  // frame; the still comes back only when the focus leaves, so navigating away
  // and returning always starts from the photo again.
  const toggle = (id: RiderId, isCenter: boolean) => {
    const next = isCenter ? null : id;
    setFocus(next);
    dropClip();
    if (next && RIDER_VISUAL[next].clip) {
      clipTimer.current = setTimeout(() => setClipId(next), GLIDE_MS);
    }
  };

  return (
    <div>
      {focused && (
        <button
          type="button"
          onClick={() => setFocus(null)}
          className="mb-3 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-3 py-1 text-xs font-semibold text-white/80 transition hover:border-white/35 hover:bg-black/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
        >
          ← {t("orbit.backToAll")}
        </button>
      )}

      <div ref={scrollerRef} className="overflow-x-auto">
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
          <defs>
            {/* Circle mask for every portrait <image>. Defined once; the clip
                resolves in each node's local user space, so one path serves all
                seven nodes at whatever scale they glide through. */}
            <clipPath id="so-node-clip">
              <circle cx={0} cy={0} r={NODE_BASE_R} />
            </clipPath>
          </defs>
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
               scale() happen around the node instead of around the frame.
               Athlete nodes override the origin inline: their portrait <image>
               stretches the fill box far past the circle, so "center" is not
               the node's center there (see the node render). */
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
                        // Centered right under the dot (which grows to 1.3x), a
                        // tight 9px off the ring — not at the radial label slot,
                        // which floats too far out for a hover hint.
                        setHotLabel({
                          x: bk.x,
                          y: bk.y + bk.nr * 1.3 + 9 + 10,
                          anchor: "middle",
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
            // `.so-node` scales in a `transform-box: fill-box` frame, where
            // origin lengths resolve from the BOUNDING BOX's top-left — and the
            // portrait <image> extends that box asymmetrically far beyond the
            // circle (it is clipped visually, but clipping does not shrink a
            // bbox). `origin: center` there is the bbox's center, not the
            // node's, and scaling around it slid every node off its caption.
            // This walks the origin back to the node's own (0,0).
            const pr = portraitRect(v);
            const originX = -Math.min(-NODE_BASE_R, pr.x);
            const originY = -Math.min(-NODE_BASE_R, pr.y);
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
                <g
                  className="so-glide so-node"
                  style={{
                    transform: `scale(${r1(s)})`,
                    transformOrigin: `${r1(originX)}px ${r1(originY)}px`,
                  }}
                >
                  <circle cx={0} cy={0} r={NODE_BASE_R} fill="#141210" />
                  {/* The still is a NATIVE <image>, not a foreignObject — see
                      portraitRect() for the WebKit bug this dodges (iOS drew
                      these as empty rings). portraitRect replays the face crop
                      the CSS background shorthand used to do.
                      `preserveAspectRatio="none"` because the rect already
                      carries the image's own ratio — letting SVG re-fit it would
                      apply the aspect correction twice. */}
                  <image
                    href={v.image}
                    clipPath="url(#so-node-clip)"
                    {...pr}
                    preserveAspectRatio="none"
                    // Hidden only once the clip is actually painting — the alpha
                    // video would otherwise let this face show through around the
                    // rider's silhouette. The 0.45 is the "nobody backs this
                    // rider yet" dim.
                    opacity={clipId === nd.a.id && clipShowing ? 0 : nd.lit ? 1 : 0.45}
                  />
                  {clipId === nd.a.id && v.clip && (
                    // The clip stays a foreignObject <video> (SVG has no native
                    // video element). Mounted only on click, and the still above
                    // never unmounts — so a WebKit that refuses to paint this
                    // keeps showing the portrait instead of an empty circle.
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
                          overflow: "hidden",
                          opacity: nd.lit ? 1 : 0.45,
                        }}
                      >
                        <video
                          src={v.clip.src}
                          autoPlay
                          muted
                          playsInline
                          preload="none"
                          onPlaying={() => setClipShowing(true)}
                          // No onEnded handler: a <video> holds its last frame,
                          // so leaving it mounted IS the freeze.
                          onError={dropClip}
                          // Whole rider, not the face crop the still uses. The
                          // clip is a full-body trick — zoomed to the head you
                          // see a chin move and none of the skating.
                          style={{ width: "100%", height: "100%", objectFit: "contain" }}
                        />
                      </div>
                    </foreignObject>
                  )}
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
                    // The unbacked rider's name is dimmed, not illegible: .4 on the
                    // ORBIT_STAGE surface is ~3.8:1, under AA's 4.5:1 for text. .6
                    // is ~7.4:1 and is the SAME alpha the treasury label already
                    // uses, so the drawing keeps one step of quiet text instead of
                    // two. The other "nobody backs this rider" signals (portrait
                    // opacity, thinner ring, no gold total) are graphics, where 3:1
                    // is the bar, and are left alone.
                    fill={nd.lit || hot ? "#fff" : "rgba(255,255,255,.6)"}
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
                      {usd(nd.a.total, locale)}
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
                    // Inset, not `cover`: filling the circle cropped the noggles
                    // into an unreadable block of colour. 55% of this box is 50%
                    // of the node's diameter — the same logo-to-container ratio
                    // the site header uses (a 16px mark in a 32px tile), so the
                    // treasury reads as the Gnars logo wherever it appears.
                    backgroundImage: "url(/gnars.webp)",
                    backgroundSize: "55%",
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
