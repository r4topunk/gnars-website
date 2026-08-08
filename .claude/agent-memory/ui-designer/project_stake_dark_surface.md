---
name: stake-dark-surface
description: The /stake family is a committed dark surface inside a system-theme site — scope it with a `dark` wrapper before using white/alpha tokens
metadata:
  type: project
---

The stake pages (production `/stake`, `/stake/[rider]`, and the `/stake/preview`
prototype) are designed as a **dark arcade island**: hardcoded dark panels, white
alpha text (`text-white/50`, `text-white/35`), gold accent. The rest of the site
follows `next-themes` with `defaultTheme="system"` (see `src/app/[locale]/layout.tsx`).

**Why:** a light-theme visitor otherwise gets white/alpha text on a light page —
the pre-existing production stake components already had this bug (near-black
`text-foreground` labels sitting on hardcoded dark panels). Fixing it by switching
to `muted-foreground` would throw away the committed dark direction the art
depends on.

**How to apply:** when a stake surface uses white-alpha tokens, wrap the subtree in
`className="dark bg-background text-foreground"` (Tailwind v4 here defines
`@custom-variant dark (&:is(.dark *))`, and `.dark {}` sets the CSS variables, so
the wrapper both flips shadcn tokens for Buttons/Dialogs inside it and paints its
own dark background). `/stake/preview`'s island in `StakePreview.tsx` does exactly
this. Verify any stake UI change in BOTH color schemes — Playwright
`newContext({ colorScheme: "light" })` catches it in one shot.

**Gotcha:** a spec that says the island is `bg-white/[0.02]` cannot be taken
literally on one element — a 2% white fill is a *tint over an assumed dark page*,
and on a light-theme page it lands on white. Use two nested elements: outer
`dark bg-background` for a guaranteed dark base, inner `bg-white/[0.02]
ring-1 ring-white/[0.06]` (same radius) for the lift. Same trap for any
white-alpha "surface" value inherited from a dark mockup.

Also: the island's h1 and hero paragraph belong OUTSIDE it, on the page's normal
theme tokens (`text-muted-foreground`, not `text-white/50`), so the page opens
like Treasury/Auctions do.

Related: [[design_system_overview]], [[stake-preview-visual-language]]
