---
name: known_ui_issues
description: UI/accessibility/performance issues found in deep review on 2026-03-16, ranked by impact
type: project
---

## Critical / High Impact

1. **No prefers-reduced-motion support anywhere** — TextType (GSAP cursor blink), AnimatedChest3D (Three.js rAF loop), FuzzyText (canvas rAF loop), CountUp animations all run unconditionally. Animation-sensitive users have no escape.

2. **`transition-all` anti-pattern** — Used extensively in TV components (BuyAllModal, TVVideoCardInfo, TVInfiniteMenu, TVControls), demo page, and some proposal components. Forces browser to check every CSS property on every frame.

3. **Missing `preconnect` hints** — No `<link rel="preconnect">` for Alchemy RPC, IPFS gateways, Zora APIs, or Goldsky subgraph used at runtime.

4. **Mixed icon libraries** — `react-icons/fa` imported in 5 files for a single icon (`FaEthereum`). Adds bundle weight alongside Lucide. Should replace with Lucide `Coins` or an inline SVG.

## Medium Impact

5. **`DaoSidebar` is dead code** — Full sidebar component exists but is not mounted in root layout. Imports unused icons. Either remove or document as intentional.

6. **`AnimatedListItem` is a stub** — The component comment promises CSS animation with reduced-motion support, but the implementation renders a plain `<div>`. The `delayMs` prop is declared but unused.

7. **`globals.css` duplicate `@apply` rules** — Every Leaflet override line is duplicated (e.g., lines 123-186 have each `@apply` written twice on consecutive lines). Zero functional impact but doubles parse work and is confusing.

8. **`style={{ aspectRatio: "16 / 9" }}`** in `ProposalDetailsForm.tsx:133` — Should use Tailwind `aspect-video` utility.

9. **`ProposalDetailsForm` banner upload area uses `<div onClick>`** (line 154) — Should be a `<button>` or `<label>` for keyboard/screen-reader access. Click-only, no `onKeyDown`.

10. **Form inputs missing `autocomplete`** — Bid input in `AuctionSpotlight`, proposal title/description in `ProposalDetailsForm`, ENS search in `MembersList`, voting reason textarea — none declare `autocomplete`.

11. **`spellCheck` not disabled** on crypto-domain inputs — ENS/address inputs and vote-reason textarea should have `spellCheck={false}` to avoid browser underlines on hex addresses.

12. **`MembersList` search `<Input>` has no `<label>`** — Only a decorative `<Search>` icon precedes it; the icon is not `aria-hidden` and there is no `aria-label` on the input itself.

13. **`TableHead` sort columns use `onClick` without keyboard handlers** — `MembersList.tsx` lines 195-278 have `className="cursor-pointer select-none" onClick={...}` on `<th>` elements. Not keyboard-accessible; needs `onKeyDown`/`role="button"` or a `<button>` inside.

14. **`Badge` used as interactive element in `DaoHeader` / `DaoSidebar`** — "Switch to Base" badge has `onClick` but is a `<span>` variant of Badge with no keyboard access.

15. **`overscroll-behavior: contain` missing from modals/sheets** — `DelegationModal`, `BuyAllModal` (portal), map `Sheet` — none set `overscroll-behavior-contain`, which allows scroll chaining to background content on mobile.

16. **`color-scheme` meta not set** — No `color-scheme: dark` on `<html>` in dark mode, and no `<meta name="theme-color">` in layout. Browser scrollbar and OS chrome remain light even in dark theme.

17. **Loading states use `"Loading..."` with straight ellipsis** — Should be `"Loading…"` (U+2026) per typography rules. Found in `ProposalVotesList.tsx:142`, `KeyStats.tsx:73`, `TreasuryAllocationChart.tsx:190`, `AuctionTrendChart.tsx:159`, `JoinDAOTab.tsx:607`.

18. **Straight quotes / straight ellipsis in copy** — Several `placeholder` props use `"..."` (three periods) instead of `"…"`.

## Low Impact

19. **`FuzzyText.tsx:152-156`** — `touchmove` listener registered with `{ passive: false }` and `e.preventDefault()` called — blocks passive scroll on canvas. Acceptable for this interaction but flags in Lighthouse.

20. **`TextType.tsx` uses GSAP for cursor blink** — GSAP is a heavy animation library used only for a `opacity: 0/1` toggle. A CSS `@keyframes blink` + `animation` would be ~0 overhead and automatically respect `prefers-reduced-motion: reduce`.

21. **`h1` on hero only — heading hierarchy not audited elsewhere** — `HeroStats` has `<h1>Gnars DAO</h1>`. Pages with multiple sections should verify `h2`/`h3` cascade correctly.

22. **`AuctionSpotlight` bid textarea (line 339)** — has `focus-visible:outline-none focus-visible:ring-2` which is the correct pattern, but `outline-none` is set unconditionally (not just focus-visible), suppressing Firefox/Safari default focus ring on focus (not just keyboard focus).
