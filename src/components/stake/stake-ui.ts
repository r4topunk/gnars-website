// The visual system of the production /stake page.
//
// Every stake section imports these tokens; nothing invents a local surface,
// radius or muted colour. The redesign's first pass failed review as "practically
// identical" to what it replaced precisely because each section styled itself.
//
// THEME RULE — chrome follows the site theme, artwork stays dark.
//
//   Chrome (panels, rows, muted text, quiet buttons, pills) is written against
//   `foreground` / `muted-foreground`, so it inverts with next-themes and reads
//   in BOTH light and dark. A `white/xx` alpha here would paint white-on-white
//   the moment someone opens /stake in light mode.
//
//   Artwork does not invert. The rider cut-outs are lit for a dark stage and the
//   orbit SVG is drawn for one (white labels, dark halos), so those surfaces stay
//   dark in light mode on purpose — the same way a photograph in an article keeps
//   its own light. ORBIT_STAGE is the ONE committed-dark token below; it carries
//   the `dark` class so anything rendered inside it resolves its own theme
//   variables to the dark set instead of inheriting a light page's.
//
//   Accents that must stay legible on both surfaces ship as light/dark pairs
//   (GOLD_TEXT, MOR_TEXT, MOR_FILL): raw #f7c948 on a white card is unreadable.
//   The GOLD gradient itself is unchanged — it is only ever used as a fill under
//   GOLD_INK text, which is legible whatever the page theme is doing.

/**
 * One section, one card. The page is a stack of these on the page background —
 * there is no wrapping island; every section owns its frame. `bg-card` (not a
 * foreground alpha) because the cards sit directly on `bg-background`, the same
 * relationship every other card on the site has. `shadow-sm`, not `shadow-xl`:
 * five elevated cards in a column read as a pile, not a page.
 */
export const CARD = "rounded-2xl border bg-card text-card-foreground shadow-sm";

/** Padding for a section card. The orbit stage inside the social card
 *  deliberately uses less — it is the page's largest visual and should not sit
 *  inside a wide frame. */
export const CARD_PAD = "p-4 sm:p-6";

/**
 * A list of rows inside a card. There are NO sub-cards in this language: a row
 * is transparent and rows are told apart by ONE hairline between them, applied by
 * the container. Goes on the element that owns the rows, next to its own padding.
 *
 * `divide-y` (not border-t/border-b per row) is the point — a row that draws both
 * puts two lines in the same gap, which is what made the first pass look busy.
 */
export const ROW_LIST = "divide-y divide-foreground/[0.07]";

/** Vertical rhythm of one row in a ROW_LIST. */
export const ROW_PAD = "py-4";

/** Body-muted. */
export const MUTED = "text-muted-foreground";
/**
 * Micro-muted: labels, meta, units, skeleton placeholders.
 *
 * A light/dark pair like GOLD_TEXT and MOR_TEXT, not `text-muted-foreground/70`.
 * That alpha composited to ~#9d9d9d on the light island — 2.7:1 at 12px, against
 * AA's 4.5:1 — and this token carries every meta label the page has (rates venue
 * names, all three stat labels, every BackerList row, lock dates, the subnet
 * goal). Light mode has no headroom BELOW `muted-foreground` (it is already
 * ~4.7:1 on the card), so micro text steps darker there and takes its hierarchy
 * from size instead; dark mode does have headroom, so it keeps a real step under
 * MUTED.
 *
 * Measured on bg-card, the surface every section now renders on:
 *   light neutral-600      7.8:1
 *   dark  muted-fg at /90  5.9:1   (MUTED for comparison: 6.9:1)
 */
export const MICRO = "text-neutral-600 dark:text-muted-foreground/90";

/**
 * The page's only accent, at the spec's 135° (the older stake components use 90°).
 *
 * Colour rule, tight version: gold is every key number and every earned yield,
 * whatever the token — the unit text ("MOR", "USDC") is what identifies the
 * asset, not the colour. Morpheus green appears in exactly two places on the
 * whole page: the subnet progress fill and the subnet MOR total.
 */
export const GOLD = "linear-gradient(135deg,#f7c948,#f5851f)";
/** Ink for text sitting on gold. */
export const GOLD_INK = "#1a1205";
/**
 * Gold AS TEXT. Not a raw hex: #f7c948 has ~1.6:1 contrast on a white card, so
 * light mode drops to a dark amber and only the dark theme gets the bright gold.
 * Apply as a className (merge with `cn`), never as `style={{ color }}`.
 */
export const GOLD_TEXT = "text-amber-700 dark:text-[#f7c948]";

/**
 * Press feedback, on every button on the page. The whole point is that the
 * interface visibly heard the press before anything else happens — a stake CTA
 * opens a dialog and a quiet action signs a transaction, both slow enough that a
 * dead button reads as a missed click.
 *
 * `scale` takes the label and icons with it, which is what makes it read as
 * physical. `:active` is a real press on touch, so unlike `:hover` it needs no
 * pointer gate. The property list is spelled out (never `transition-all`) and
 * covers what these two recipes actually change on hover.
 *
 * The curve is the EASE_OUT token in src/lib/motion.ts — repeated as a literal
 * because Tailwind only emits arbitrary values it can find in the source text.
 */
export const PRESS =
  "transition-[transform,opacity,background-color] duration-[120ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]";

/** Primary CTA. Pair with `style={{ backgroundImage: GOLD, color: GOLD_INK }}` —
 *  the same technique the other stake components use for the gradient. */
export const GOLD_CTA = `h-11 cursor-pointer rounded-lg border-0 font-bold hover:opacity-90 ${PRESS}`;

/** Quiet action (Harvest / Withdraw / Claim). These are secondary by definition:
 *  gold belongs to the page's primary stake CTAs, and a page where every button
 *  is gold has no primary action at all. */
export const QUIET_BTN = `h-11 cursor-pointer rounded-lg bg-foreground/[0.06] px-4 font-semibold text-foreground hover:bg-foreground/[0.10] sm:h-9 ${PRESS}`;

/** Neutral pill. Meta badges about the page itself only — a pill is never a state
 *  a row is in, because a pill next to a button reads as a disabled button. Not
 *  amber: amber would be a second accent competing with gold. */
export const PILL =
  "rounded-full bg-foreground/[0.06] px-2.5 py-1 text-xs font-semibold text-muted-foreground";

/**
 * Morpheus green. Two uses on the page and no others: the subnet progress fill
 * (MOR_FILL) and the subnet MOR total (MOR_TEXT). Never a dot next to a value,
 * never chrome. Light mode uses emerald because #2be58b as text on white is
 * unreadable and as a 6px bar it disappears.
 */
export const MOR_FILL = "bg-emerald-500 dark:bg-[#2be58b]";
export const MOR_TEXT = "text-emerald-700 dark:text-[#2be58b]";

/**
 * The one committed-dark surface: the panel the orbit graph is drawn on.
 *
 * StakeOrbit paints an SVG with white labels and dark halos — it is artwork, not
 * chrome, and inverting it would mean redrawing the graph rather than restyling a
 * frame. The leading `dark` class scopes the theme variables so the SVG's own
 * tokens (and anything else inside) resolve dark even on a light page.
 */
export const ORBIT_STAGE = "dark rounded-2xl border border-white/[0.08] bg-[#0e0b09]";

// Section header pattern (title + optional description), rendered by
// <SectionHeader/>. No index, no eyebrow: numbering sections is a tell, and the
// rhythm is supposed to come from every header looking the same.
// The tokens live here so the whole language is readable in one file.
export const SECTION_TITLE = "text-lg font-bold tracking-tight sm:text-xl";
export const SECTION_DESC = "max-w-prose text-sm text-muted-foreground";
