# Gnars DAO Codebase Refactor Review

This document summarizes patterns, visual-break risks, and reusable block recommendations for the current codebase. It is organized by area so future agents can quickly locate patterns and build consistent, reusable layouts.

## 1) App Router Patterns (Pages + Layout)

**Observed patterns**

- Root layout wraps providers, sticky header, and a centered main container; this is the global page shell. `src/app/layout.tsx:47`
- Pages typically add `py-8` spacing and a header block (`h1` + `p`). `src/app/treasury/page.tsx:21`, `src/app/members/page.tsx:9`
- Many pages are server components with `revalidate` and `Suspense` skeletons. `src/app/proposals/page.tsx:6`, `src/app/page.tsx:39`
- Some pages are client components that load data with react-query hooks. `src/app/auctions/page.tsx:1`

**Refactor blocks**

- `PageShell`: wraps `main` container and global padding (currently split between `src/app/layout.tsx:67` and page-level `py-8`).
- `PageHeader`: consistent header block (`title`, `description`, optional actions) to replace repeated patterns across pages.
- `SuspenseSection`: standard wrapper for `Suspense` + skeletons and a `section` container.

**Visual-break risks**

- Mixed container widths (`max-w-6xl` vs `max-w-7xl`) can cause layout shifts or odd alignment. `src/app/layout.tsx:67`, `src/app/lootbox/page.tsx:105`
- Home page uses fixed heights and absolute positioning around the activity feed, which can break when cards grow. `src/app/page.tsx:68`

## 2) Navigation + Layout Components

**Observed patterns**

- `DaoHeader` handles desktop + mobile navigation with a shared config object. `src/components/layout/DaoHeader.tsx:69`
- `DaoSidebar` provides a second nav system that is unused in `layout.tsx` but still maintained. `src/components/layout/DaoSidebar.tsx:1`
- Navigation config is embedded in the component file, which makes refactors harder across desktop/mobile renderers.

**Refactor blocks**

- `navConfig.ts`: export the nav array so desktop and mobile renderers share one source of truth.
- `Header` split into smaller components (`NavDesktop`, `NavMobile`, `HeaderActions`) to reduce file size and improve readability.

**Visual-break risks**

- Dropdown width is fixed at `w-[400px]`, which can overflow when text grows. `src/components/layout/DaoHeader.tsx:231`

## 3) Common + UI Components (Reusable Building Blocks)

**Observed patterns**

- `SectionHeader` is already a consistent pattern for card section titles and actions. `src/components/common/SectionHeader.tsx:14`
- `StatCard` is a compact KPI pattern used for dashboard metrics. `src/components/common/StatCard.tsx:15`
- Shadcn-style `Card`, `Button`, `Badge`, etc. are the baseline; they use `cn` and `cva`. `src/components/ui/card.tsx:4`, `src/components/ui/button.tsx:7`

**Refactor blocks**

- `PageSection`: wraps `SectionHeader` + `CardContent` and standard spacing, used in Home/Feed/Auctions.
- `DataCard`: standardizes a card with a `Suspense` slot and skeleton placeholder.
- `ListGrid`: shared grid + empty state + infinite scroll (used by `PastAuctions`, `ProposalsGrid`, and `MembersList`).

**Visual-break risks**

- Some components have extra-large inline Tailwind blocks that are brittle and hard to reason about (e.g., lootbox components). `src/components/lootbox/JoinDAOTab.tsx:169`

## 4) Feature Components (Home, Auctions, Members, Proposals, Lootbox)

**Home**

- Composed from `ActivityFeedSection`, `RecentProposalsSection`, `HomeStaticContent`. `src/app/page.tsx:53`
- Streams only the data-heavy sections via `Suspense` which is good for perceived performance.

**Auctions**

- `PastAuctions` handles both “full card” and “grid only” modes, includes infinite scroll. `src/components/auctions/PastAuctions.tsx:33`

**Members**

- `MembersList` fetches data client-side and handles search + sort + infinite scroll in a single component. `src/components/members/MembersList.tsx:42`

**Proposals**

- `ProposalsView` owns filters + search + grid; `StatusFilter` is an internal subcomponent. `src/components/proposals/ProposalsView.tsx:18`
- Proposal detail components are small, card-based, and use `Markdown` for content. `src/components/proposals/detail/ProposalDescriptionCard.tsx:10`

**Lootbox**

- `LootboxPage` passes many props into `JoinDAOTab` and `AdminTab`. `src/app/lootbox/page.tsx:119`
- `JoinDAOTab` is a very large UI component with deeply nested layout blocks. `src/components/lootbox/JoinDAOTab.tsx:169`

**Refactor blocks**

- `FeatureShell`: consistent layout for feature pages (`title`, `description`, `content`) to replace repeated `py-8` + header blocks.
- `ViewModel` hooks: move heavy logic out of large components (e.g., `useLootboxViewModel` to centralize derived state, error handling, and formatting).
- Split oversized components into sub-sections: `LootboxTierGrid`, `LootboxRewardsPanel`, `LootboxStatsPanel`.

**Visual-break risks**

- `JoinDAOTab` uses large gradient and exact height/spacing rules; brittle on smaller screens and likely to overflow. `src/components/lootbox/JoinDAOTab.tsx:227`
- Auction and proposal grids assume aspect ratios; if cards are changed or text expands, grids could reflow unexpectedly. `src/components/proposals/ProposalsGrid.tsx:63`, `src/components/auctions/PastAuctions.tsx:88`

## 5) Data Layer (Services + API Routes)

**Observed patterns**

- Services use `cache()` and transform data from SDK/subgraph into internal models. `src/services/proposals.ts:72`
- API routes use `unstable_cache` for server-side aggregation. `src/app/api/members/route.ts:17`
- Several data fetchers use internal API routes even in server components (e.g., treasury). `src/components/treasury/TreasuryBalance.tsx:35`

**Refactor blocks**

- `services/` should be treated as a domain layer; for new features, add types + transform functions there.
- `api/` routes should share a small `apiResponse` helper to standardize errors and JSON responses.
- `cache` utilities in `src/lib/` to normalize TTLs and cache tags.

**Visual-break risks**

- Data-heavy UI has `Suspense` fallbacks, but some client components only show empty states; inconsistent loading UX across features.

## 6) Hooks (Client Data + UI State)

**Observed patterns**

- React-query hooks wrap service calls and establish `staleTime`. `src/hooks/use-auctions.ts:1`
- Hooks are mostly feature-specific and live at `src/hooks`, which is good for discovery but not tied to features.

**Refactor blocks**

- Group hooks by feature: `src/features/auctions/hooks`, `src/features/members/hooks`, etc.
- Consider adding a shared `useInfiniteList` hook for the repeated intersection observer patterns.

## 7) Styling + Utility Patterns

**Observed patterns**

- Tailwind CSS v4 utilities and shadcn UI are the base. `src/app/globals.css:1`, `src/components/ui/card.tsx:4`
- `cn()` handles class merging across components. `src/lib/utils.ts:1`

**Refactor blocks**

- Extract repeated utility classes into shared `className` constants for frequent patterns (cards, grids, headers).
- Prefer `SectionHeader` + `Card` over custom header markup to avoid small variations and visual drift.

## 8) Suggested Reusable Blocks (Canonical Patterns)

**Layout**

- `AppShell`: wraps `DaoHeader`, `main`, and page container.
- `PageShell`: `py-8`, `space-y-*`, standard content width.
- `PageHeader`: `title`, `description`, `actions`.

**Data UI**

- `SuspenseSection`: `fallback`, `children`, `className`.
- `DataCard`: `title`, `value`, `loading`, `error`.

**Lists**

- `InfiniteGrid`: `items`, `renderItem`, `skeleton`, `empty` (used by auctions/proposals/members).
- `FilterBar`: standard search input + popover filter patterns.

## 9) Proposed Workflow for Refactors (Agent-Friendly)

1. **Create feature folder** (`src/features/<feature>`): move components, hooks, types, and services under a single namespace.
2. **Define feature-level exports** in `index.ts` to make imports predictable.
3. **Introduce PageShell/PageHeader** and refactor pages to use them.
4. **Extract navigation config** into `src/lib/navigation.ts` and reuse in header renderers.
5. **Consolidate infinite scroll** logic into `useInfiniteList` and replace duplicates in auctions/members/proposals.
6. **Split large client components** into visual subsections + view-model hooks.

---

If you want, I can follow up with concrete component signatures and a migration checklist for each feature folder.
