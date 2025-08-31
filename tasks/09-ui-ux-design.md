## Gnars Website UI/UX Specification (Shadcn + Next.js 15)

This document translates the architecture and features in README.md into a concrete UI/UX blueprint using Shadcn UI components, Tailwind CSS, and Next.js 15 App Router best practices. It defines page layouts, components, interaction patterns, responsive behavior, accessibility, and loading/empty/error states to guide consistent implementation.

### Design principles

- **Clarity over cleverness**: minimal surfaces, readable typography, obvious actions.
- **Consistency**: reuse Shadcn primitives and design tokens; predictable patterns across pages.
- **Progressive disclosure**: show summaries by default; reveal details via tabs, accordions, drawers.
- **Responsive-first**: mobile as baseline; enhance for md/lg screens.
- **Accessible by default**: keyboard nav, labels, contrast, screen reader support.
- **Fast feels fast**: server components where possible, streaming, skeletons, optimistic UI only where safe.

## App frame

### Header

- Left: brand wordmark/logo, route to `/`.
- Center/Right: primary navigation (desktop), wallet connect, theme toggle.
- Mobile: hamburger icon opens a `Sheet` with nav links.

Recommended components and patterns:

- `NavigationMenu` (desktop) or simple `Inline Nav` with `Button variant="link"`.
- `Sheet` + `SheetTrigger` + `SheetContent` (mobile menu).
- `ThemeToggle` pattern from Shadcn docs using `DropdownMenu`.
- Wallet connect area: OnchainKit connect button styled adjacent to Shadcn buttons.

Primary routes (consistent across header and mobile sheet):

- `/` Overview
- `/auction`
- `/treasury`
- `/proposals`
- `/propose`
- `/members`

### Footer

- Minimal: DAO contracts quick links, chain badge, social links.
- Use `Separator` above, small muted text, `Button variant="link"` for external links.

## Theming, tokens, and typography

- Use Shadcn Next.js preset with CSS variables for light/dark themes.
- Keep color scale close to default; introduce accents sparingly:
  - Status: success (green), warning (amber), danger (red), info (blue) via `Badge` variants.
- Typography: `text-base` body, `text-sm` for tables, `text-2xl/3xl` for page titles; `leading-tight` for headings.
- Spacing rhythm: 4/8/12/16 multiples; section `space-y-6`, card body `space-y-4`.

## Common components and patterns

### Page scaffolding

- Title row: `h1` + optional `Breadcrumb` + primary action (right side on desktop, stacked on mobile).
- Content sections: `Card` components with `CardHeader`, `CardContent`, `CardFooter`.
- Tabs when multiple related views exist: `Tabs` + `TabsList` + `TabsTrigger` + `TabsContent`.

### Data display

- Lists/tables: Shadcn `Table` or DataTable pattern (`@tanstack/react-table`) for sorting/filtering/pagination.
- Status indicators: `Badge` with variants (Default, Secondary, Destructive, Outline) mapped to states.
- Empty states: illustration or icon + one-line explanation + primary CTA.
- Skeletons: `Skeleton` blocks mirroring layout; prefer stable height to avoid layout shift.
- Tooltips: `Tooltip` for subtle explanations; avoid hiding critical info behind hover.

### Feedback and dialogs

- Toasts using `sonner` via Shadcn `Toaster`; success/info/error for async operations.
- Confirmation: `AlertDialog` for destructive or costly actions (e.g., placing a bid confirmation step if needed).
- Side panels: `Sheet` for secondary flows on mobile; `Dialog` for focused tasks on desktop.

### Forms

- Use `react-hook-form` + `zod` with Shadcn `Form` components (`FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage`).
- Inputs: `Input`, `Textarea`, `Select`, `Switch`, `Checkbox`, `RadioGroup`.
- Submit buttons: disabled while submitting, show spinner icon.
- Inline validation messages with `FormMessage` and `aria-invalid` attributes.

### Interactions

- Buttons: use Shadcn `Button` variants. Primary actions are solid; secondary are `outline` or `ghost`.
- Iconography: `lucide-react`; pair icon + label for clarity. Icon-only buttons have `sr-only` labels.
- Copy-to-clipboard: `Button variant="ghost" size="icon"` + `Copy` icon + toast feedback.
- Pagination: Shadcn `Pagination` for tables and long lists.

### Shadcn best practices checklist

- Container and width:
  - Wrap page content with `container mx-auto px-4 md:px-6 lg:px-8` and `max-w-7xl` where appropriate.
  - Use consistent vertical rhythm: section `space-y-6`, card body `space-y-4`.
- Composition:
  - Use `asChild` to compose primitives with `Link`/custom elements (avoid nested interactive elements).
  - Prefer composition over extending components; keep variants aligned with Shadcn defaults.
- Tokens and theming:
  - Respect `--radius` and color tokens; avoid hardcoding colors outside the design system.
  - Keep dark mode parity; test contrast in both themes.
- Accessibility:
  - Provide `sr-only` labels for icon-only buttons.
  - Ensure focus-visible rings on all interactive elements.
  - Use `TooltipProvider` once near app root.
- Motion:
  - Use `tailwindcss-animate` classes for subtle transitions; keep durations short (150–250ms).
- Tables and lists:
  - Use the official Data Table block pattern with TanStack Table for sorting/filtering/pagination.
- Overlays:
  - Use `Dialog` for focused tasks; `Sheet` for off-canvas navigation and secondary flows; `AlertDialog` for destructive/irreversible actions only.
- Forms:
  - Integrate `zodResolver`; surface inline `FormMessage` errors; disable submit during mutations; show success/error toasts.

### Implementation primitives and helpers

- Utility classes: prefer Tailwind utilities over ad-hoc CSS; avoid global styles except theme tokens.
- Class helpers: use a `cn` helper (`clsx` + `tailwind-merge`) to compose classes cleanly.
- Providers at root layout:
  - `ThemeProvider` (class strategy), `TooltipProvider`, `Toaster` from `sonner`.
- Scroll management: use `ScrollArea` for long menus/tables on constrained panels.

## Page blueprints

Each page below describes sections, primary components, responsive behavior, states, and actions.

### Home (/)

- Purpose: Overview, key stats, quick navigation.
- Sections:
  - Hero summary in a `Card`: DAO name, tagline, Base chain badge, CTA buttons (Auction, Proposals).
  - Stats grid: `Card` x3–4 for Total Supply, Owners, Current Auction ID, Chain.
  - Contracts list: `Accordion` of contract addresses with `Button` to copy and external link.
- Responsive:
  - Grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` for stats.
- States:
  - Skeletons for each stat card.
  - Empty/error banners via `Alert` if data fetch fails.

### Auction (/auction)

- Purpose: Live auction focus + history browsing.
- Layout: `Tabs` with `Live` and `History`.
- Live tab:
  - Left/top `Card`: NFT image (`next/image`), token ID, countdown timer, highest bid, end time.
  - Actions card: `Input` for bid amount, `Button` Place Bid; disabled if wallet not connected.
  - Info: minimum increment, last bidder (copyable address with ENS if available).
- History tab:
  - `DataTable` or grid of past auctions: thumbnail, token ID, final price, winner.
  - Filters: date range, price range; search by token ID.
- Responsive:
  - Mobile stacks cards; desktop two-column layout (`lg:grid-cols-2`).
- States:
  - Live: skeleton image and text rows; show "No live auction" empty state if paused.
  - History: table skeleton rows; empty state with link to explore on nouns.build.
- Actions:
  - Place Bid: confirm with `AlertDialog` if exceeding a threshold; toast on tx sent/confirmed.

### Treasury (/treasury)

- Purpose: ETH balance, token/NFT holdings, and (optional) transactions.
- Layout: `Tabs` for Overview, Tokens, NFTs, Transactions (if implemented).
- Overview:
  - `Card` for ETH Balance + USD (if available) with large number (`text-3xl font-semibold`).
  - `Card` for Total Auction Proceeds.
- Tokens:
  - `DataTable`: columns for Token, Balance, USD (optional), Contract.
- NFTs:
  - Grid of NFT cards (image, name, link to explorer or marketplace).
- Transactions (optional):
  - `DataTable`: Date, Type, Amount, Token, From/To, Hash (copy + external link).
- Responsive:
  - Overview cards in `grid-cols-1 md:grid-cols-2`.
- States:
  - Skeleton cards; empty states for tokens/NFTs.

### Proposals list (/proposals)

- Purpose: Discover and filter proposals.
- Header: Title + Filters (`Select` status, `Input` search, date range if needed).
- Content: `DataTable` with columns:
  - ID, Title, Status (`Badge`), Proposer (ENS), Start/End, For/Against/Abstain.
- Row interaction: Row click navigates to detail; keyboard accessible.
- Empty/skeleton: 6–10 skeleton rows on load; informative empty state when none.

### Proposal details (/proposals/[id])

- Purpose: Read proposal, understand actions, vote.
- Layout: Two columns on desktop; stacked on mobile.
  - Left/top column:
    - Title, ID, status `Badge`, proposer with ENS/avatar.
    - Markdown description in a `Card` (use safe renderer).
  - Right/side column:
    - Voting `Card`: Vote buttons (For/Against/Abstain) with counts and progress bars.
    - Timeline `Card`: Created, Active, Ended, Queued, Executed; use `Stepper`-like vertical list with `Separator`.
    - Actions `Accordion` or `Collapsible`: Decoded transactions, each with contract name, function, params table, and external links.
- Droposal labeling:
  - If Zora Edition create calls detected, show a `Badge` "Droposal" near the title and a small spec table summarizing price, edition size, funds recipient.
- States:
  - Skeleton cards for description and votes.
  - Voting disabled if not eligible; show inline `Alert` explanation.
  - Toasts on vote submission.

### Create proposal (/propose)

- Purpose: Author markdown description and craft on-chain actions.
- Layout: Wizard with 3 steps; implement with `Tabs` or custom stepper pattern.
  1. Description
     - `Form` with `Textarea` (markdown), live Preview toggled by `Switch` or `Tabs` (Edit/Preview).
  2. Actions
     - `Accordion` list of action items; each action is a `Card` with `Select` for action type and dynamic fields.
     - Action types: Send ETH, ERC-20 transfer, Contract call, Zora Edition (Droposal template).
     - Add/Remove actions with `Button variant="secondary"`.
  3. Review & Submit
     - Render markdown and decoded actions for confirmation.
     - Submit button; show wallet flow and post-submit success state with link to new proposal.
- Validation: zod schemas per action type; show `FormMessage` inline.

### Members (/members)

- Purpose: List holders and delegates.
- Header: Search `Input` and Filters (e.g., holders vs delegates).
- `DataTable` columns:
  - Address/ENS (with avatar), Holdings, Votes, Vote %, Joined.
- Actions: Delegate button (opens `Dialog` with form), copy address.
- Export: `Button` to export CSV; show `Toast` after generation.
- Responsive: On mobile, use `Drawer` or stacked `Card` rows; keep sorting minimal.

## Shadcn Blocks mapping by page

Reference curated blocks to accelerate implementation and ensure consistent patterns. See [Shadcn Blocks](https://ui.shadcn.com/blocks).

- App frame:
  - Application Shell (header with responsive menu, sidebar optional)
  - Simple Footer
- Home:
  - Stats Cards grid
  - Section header with actions
  - Addresses/Contracts Accordion
- Auction:
  - Product/Gallery detail (for NFT media + info)
  - Stats row and Action panel (bid form)
  - Data Table (auction history)
- Treasury:
  - Dashboard analytics cards
  - Data Table (tokens)
  - Media grid (NFTs)
- Proposals list:
  - Data Table with toolbar (status filter, search input)
- Proposal details:
  - Article layout (markdown) with sticky side panel
  - Timeline/Activity list
  - Collapsible/Accordion for decoded transactions
- Propose (create):
  - Form Wizard (steps)
  - Dynamic form list (actions)
- Members:
  - Users Table (avatars, copyable addresses)
  - Toolbar with search/filter and CSV export

## Component mapping (Shadcn)

- Containers: `Card`, `Tabs`, `Accordion`, `Separator`, `ScrollArea`.
- Data: `Table` (+ DataTable pattern), `Badge`, `Avatar`, `Tooltip`.
- Forms: `Form`, `Input`, `Textarea`, `Select`, `Switch`, `Checkbox`, `RadioGroup`.
- Overlays: `Dialog`, `AlertDialog`, `Sheet`, `Popover`, `DropdownMenu`.
- Feedback: `Skeleton`, `Alert`, `Toaster` (sonner), `Progress` (for voting bars/countdowns if needed).
- Navigation: `Breadcrumb`, `Pagination`, `NavigationMenu`.
- Utilities: `Copy` pattern, `VisuallyHidden` for sr-only labels.

## Accessibility checklist

- Every interactive element is reachable with Tab; visible focus ring (`focus-visible:outline-none focus-visible:ring-2`).
- Icon-only buttons must include `sr-only` text.
- Sufficient color contrast in both themes; test status badges and muted text.
- Dialogs and sheets trap focus; ESC closes; `aria-*` attributes applied via Shadcn primitives.
- Forms: `label` associated with controls; descriptive error messages in `FormMessage`.

## Loading, empty, error states

- Each page defines specific skeletons matching the final layout.
- Empty states include a short explanation and one primary CTA.
- Errors use `Alert` with variant `destructive`, plus Retry action when reasonable.

## Performance and routing

- Next.js 15 App Router with Server Components by default.
- Fetch data server-side for lists/details (SEO) and stream where useful.
- Client Components only for interactive surfaces (forms, wallet actions, live countdowns).
- Use `Suspense` boundaries around slow sections with skeleton fallbacks.
- Cache and revalidate pages considering auction cadence; tune `revalidate` in route segments.
- Use `next/image` with proper sizes and `priority` only for hero/live NFT image.

## Example snippets

Navigation (mobile sheet trigger + desktop links):

```tsx
// Header actions excerpt
<div className="flex items-center gap-2">
  <ThemeToggle />
  <ConnectWalletButton />
  <Sheet>
    <SheetTrigger asChild>
      <Button variant="outline" size="icon">
        <Menu className="h-4 w-4" />
        <span className="sr-only">Open menu</span>
      </Button>
    </SheetTrigger>
    <SheetContent side="left" className="w-80">
      <nav className="grid gap-2">
        <Button variant="link" asChild>
          <Link href="/">Overview</Link>
        </Button>
        <Button variant="link" asChild>
          <Link href="/auction">Auction</Link>
        </Button>
        <Button variant="link" asChild>
          <Link href="/treasury">Treasury</Link>
        </Button>
        <Button variant="link" asChild>
          <Link href="/proposals">Proposals</Link>
        </Button>
        <Button variant="link" asChild>
          <Link href="/propose">Propose</Link>
        </Button>
        <Button variant="link" asChild>
          <Link href="/members">Members</Link>
        </Button>
      </nav>
    </SheetContent>
  </Sheet>
</div>
```

DataTable status badge cell:

```tsx
<Badge variant={state === "Active" ? "default" : state === "Executed" ? "secondary" : "outline"}>
  {state}
</Badge>
```

Form field with validation:

```tsx
<FormField
  control={form.control}
  name="amount"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Bid amount (ETH)</FormLabel>
      <FormControl>
        <Input type="number" step="0.0001" placeholder="0.05" {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

Skeleton layout example (auction card):

```tsx
<Card className="space-y-4">
  <Skeleton className="h-64 w-full" />
  <div className="space-y-2">
    <Skeleton className="h-6 w-1/3" />
    <Skeleton className="h-4 w-1/2" />
  </div>
</Card>
```

## Implementation notes

- Keep files organized by route segment in `src/app/...` with colocated components for page-specific UIs.
- Share generic components under `src/components/ui` and feature components under `src/components/{feature}`.
- Prefer server components for data-heavy lists; pass minimal props to client components.
- Use `useToast` for operation feedback; avoid blocking modals unless necessary.
- When in doubt, use `Card` + `Tabs` + `Table` as the default structure for readable dashboards.

This spec is the source of truth for UI/UX decisions. If a feature in the README evolves, mirror the change here by updating the corresponding page blueprint and components mapping.
