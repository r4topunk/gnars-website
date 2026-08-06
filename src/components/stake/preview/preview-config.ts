// Toggle config + visual system for the /stake/preview prototype route.
//
// Two jobs in one module, on purpose:
//
//  1. `parsePreviewConfig` / `previewHref` read the remaining open decisions from
//     the query string, so a reviewer can send back the exact variant they approve.
//  2. The exported class tokens below ARE the preview's visual language. Every
//     preview component imports them; nothing invents a local surface, radius or
//     muted colour. The first prototype failed review as "practically identical"
//     to production precisely because each section styled itself.
//
// This module is prototype-only. Nothing under src/components/stake/preview/ is
// imported by the production /stake routes.

export type PreviewConfig = {
  /**
   * Kept for URL compatibility only. The surface decision is now committed:
   * "island" IS the system below and "site" renders identically. Still offering
   * two surfaces would re-open a question the spec closed.
   */
  theme: "island" | "site";
  /** Gold "Overall" score vs real backing data in the name plate. */
  stats: "overall" | "data";
  /** Centered hero vs left-aligned (rest of the site). */
  header: "center" | "left";
  /** Pannable orbit graph vs a plain typographic list. */
  orbit: "graph" | "list";
  /** Fill the positions hub with fixtures so it is judgeable without a wallet. */
  demo: boolean;
};

export const DEFAULT_PREVIEW: PreviewConfig = {
  theme: "island",
  stats: "overall",
  header: "left",
  orbit: "graph",
  demo: true,
};

type Params = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const pick = <T extends string>(
  v: string | string[] | undefined,
  allowed: readonly T[],
  fallback: T,
): T => {
  const s = one(v);
  return allowed.includes(s as T) ? (s as T) : fallback;
};

export function parsePreviewConfig(params: Params): PreviewConfig {
  const demo = one(params.demo);
  return {
    theme: pick(params.theme, ["island", "site"] as const, DEFAULT_PREVIEW.theme),
    stats: pick(params.stats, ["overall", "data"] as const, DEFAULT_PREVIEW.stats),
    header: pick(params.header, ["center", "left"] as const, DEFAULT_PREVIEW.header),
    orbit: pick(params.orbit, ["graph", "list"] as const, DEFAULT_PREVIEW.orbit),
    demo: demo === undefined ? DEFAULT_PREVIEW.demo : demo !== "0" && demo !== "false",
  };
}

export function previewHref(config: PreviewConfig, patch: Partial<PreviewConfig>): string {
  const next = { ...config, ...patch };
  const q = new URLSearchParams({
    theme: next.theme,
    stats: next.stats,
    header: next.header,
    orbit: next.orbit,
    demo: next.demo ? "1" : "0",
  });
  return `?${q.toString()}`;
}

// ---------------------------------------------------------------------------
// The system. One recipe per role — if a component needs something that is not
// here, the fix is to change it here, not to inline a local variant.
// ---------------------------------------------------------------------------

/**
 * The one panel recipe. No gradients, no shadows, no second border colour: the
 * only gradient on the page lives inside the rider stage art.
 *
 * The fill is 0.06 and not 0.03: the site's own `--card` step over `--background`
 * is roughly twice what the first pass shipped, so 0.03 panels read as a slightly
 * dirty background instead of as surfaces.
 */
export const PANEL = "rounded-2xl border border-white/[0.08] bg-white/[0.06]";

/** Padding for a medium-weight panel. The orbit panel deliberately uses less —
 *  it is the page's largest visual and should not sit inside a wide frame. */
export const PANEL_PAD = "p-4 sm:p-6";

/**
 * A list of rows inside a panel. There are NO sub-cards in this language: a row
 * is transparent and rows are told apart by ONE hairline between them, applied by
 * the container. Goes on the element that owns the rows, next to its own padding.
 *
 * `divide-y` (not border-t/border-b per row) is the point — a row that draws both
 * puts two lines in the same gap, which is what made the first pass look busy.
 */
export const ROW_LIST = "divide-y divide-white/[0.06]";

/** Vertical rhythm of one row in a ROW_LIST. Horizontal padding belongs to the
 *  panel, so the hairlines run the full width of the surface. */
export const ROW_PAD = "py-4";

/** Body-muted. The preview is a committed dark surface, so muted text is a white
 *  alpha rather than `muted-foreground` (which flips with the site theme). */
export const MUTED = "text-white/50";
/** Micro-muted: labels, meta, units, skeleton placeholders. */
export const MICRO = "text-white/35";

/**
 * The page's only accent, at the spec's 135° (production uses 90°).
 *
 * Colour rule, tight version: gold is every key number and every earned yield,
 * whatever the token — the unit text ("MOR", "USDC") is what identifies the
 * asset, not the colour. Morpheus green appears in exactly two places on the
 * whole page: the subnet progress fill and the subnet MOR total.
 */
export const GOLD = "linear-gradient(135deg,#f7c948,#f5851f)";
export const GOLD_SOLID = "#f7c948";
/** Ink for text sitting on gold. */
export const GOLD_INK = "#1a1205";

/** Primary CTA. Pair with `style={{ backgroundImage: GOLD, color: GOLD_INK }}` —
 *  the same technique the production stake components use for the gradient. */
export const GOLD_CTA = "h-11 cursor-pointer rounded-lg border-0 font-bold hover:opacity-90";

/** Quiet action (Colher / Sacar / Resgatar). These are secondary by definition:
 *  gold belongs to the page's primary stake CTAs, and a page where every button
 *  is gold has no primary action at all. */
export const QUIET_BTN =
  "h-11 cursor-pointer rounded-lg bg-white/[0.06] px-4 font-semibold text-white hover:bg-white/[0.10] sm:h-9";

/** Neutral pill. Meta badges about the page itself ("sample data") only — a
 *  pill is never a state a row is in, because a pill next to a button reads as a
 *  disabled button. Not amber: amber would be a second accent competing with gold. */
export const PILL = "rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-white/50";

/** Morpheus green. Two uses on the page and no others: the subnet progress fill
 *  and the subnet MOR total. Never a dot next to a value, never chrome. */
export const MOR_GREEN = "#2be58b";

// Section header pattern (title + optional description), rendered by
// <SectionHeader/>. No index, no eyebrow: numbering sections is a tell, and the
// rhythm is supposed to come from every header looking the same.
// The tokens live here so the whole language is readable in one file.
export const SECTION_TITLE = "text-lg font-bold tracking-tight sm:text-xl";
export const SECTION_DESC = "max-w-prose text-sm text-white/50";
