# /stake — visual system

> **Status: finalized 2026-08-07 and applied to the production `/stake` and
> `/stake/[rider]` routes.** The `/stake/preview` prototype route is gone; the
> tokens described below live in `src/components/stake/stake-ui.ts` and the page
> is composed by `src/components/stake/StakePageContent.tsx`.
>
> Two decisions changed on the way in, and the sections below are read with them
> in mind:
>
> - **The rider picker is the production `CharacterSelector`.** The prototype's
>   `RiderSelect` fork was rejected, so the "RiderSelect" section at the end is
>   history, not spec — the arcade stage, the stat meters and the roster grid all
>   stayed.
> - **Chrome follows the site theme.** Every `white/xx` alpha quoted below became
>   a `foreground` / `muted-foreground` equivalent so the page reads in light mode
>   too. The one committed-dark surface left is `ORBIT_STAGE`, the panel the orbit
>   SVG is drawn on (it is artwork lit for a dark stage, like the rider cut-outs).
>   Gold and Morpheus green ship as light/dark pairs (`GOLD_TEXT`, `MOR_TEXT`,
>   `MOR_FILL`) because the bright values are unreadable on a light card.
> - The message namespace is `stake.page.*` (it was `stake.preview.*`).

Pass 3. Inputs: the triple visual evaluation (grades 6/5/5) and the owner's
anti-slop taste rules. Everything here is decided; no toggles for these choices.

## System tokens (stake-ui.ts)

- `CARD` = `rounded-2xl border bg-card text-card-foreground shadow-sm` — one
  section, one card, stacked on the page background. (Supersedes the prototype's
  `PANEL` foreground-alpha recipe, which existed to step panels above a wrapping
  island; the island is gone, so sections use the site's own card token.)
- Rows inside a card: NO sub-cards. Transparent rows separated by ONE hairline
  (`divide-y` on the container). Never border-t AND border-b.
- `MUTED` = `text-muted-foreground`; `MICRO` = `text-neutral-600` plus
  `dark:text-muted-foreground/90`. Both were `white/xx` alphas in the prototype;
  they became theme tokens with the chrome rule above. MICRO is a light/dark pair
  rather than an alpha under MUTED because light mode has no contrast headroom
  below `muted-foreground` (already ~4.7:1 on `bg-card`), so on a light page micro
  text steps _darker_ and takes its hierarchy from size instead.
- GOLD unchanged, still the only UI accent. **Color rule tightened:** every key
  number / earned yield renders gold; Morpheus green appears ONLY on the subnet
  progress fill and the subnet MOR total. No green dots next to values anywhere.
- **Zero decorative dots.** A dot is allowed only for real state (subnet milestone
  done/pending). The MOR-identity dot in positions rows dies; the unit text "MOR"
  already says it.

## Section headers — numbers are gone

The 01–05 mono index is a section-number eyebrow, a known AI tell ("eyebrows name
the topic in plain language, they don't enumerate"). SectionHeader drops the
index entirely: bold title (`SECTION_TITLE` = `text-lg font-bold tracking-tight
sm:text-xl`) + optional one-line desc (`SECTION_DESC` = `max-w-prose text-sm
text-muted-foreground`). The rhythm comes from consistency, not numbering. No
uppercase-tracking eyebrows in anything the page renders. StakeOrbit still owns
one (its `orbit.title` eyebrow), which is exactly what `chromeless` drops when
StakePageContent mounts it.

## Copy rules (both locales, `stake.page.*` namespace)

- **Zero em-dashes (`—`) and zero en-dash separators** in any user-visible
  `stake.page.*` string. Restructure with period, comma, colon or parentheses.
- **Middle-dot rationed: max 1 `·` per line.** "Base · no lock" fine;
  "a · b · c" not.
- **Three distinct pt-BR verbs, no overlap:** claim→**Resgatar**,
  withdraw→**Sacar**, harvest→**Colher**. This is what
  `page.positions.action.{claim,withdraw,harvest}` and `lootbox.claimYield`
  ("Colher") ship. Collapsing harvest onto "Resgatar" would put two different
  operations behind one word, which the project bans. PositionsHub currently
  only ever emits `action: "claim"`, so the collision would be latent rather than
  visible today — that is not a reason to reintroduce it.
  - Pre-existing collisions elsewhere in `stake.json` are still open and are not
    covered by this pass: `dlg.claim` = "Sacar rendimento", `lootbox.claim` =
    "Sacar" and `lootbox.withdraw` = "Sacar".
- Trust-critical rewrites (EN shown; pt-BR same meaning, glossary above):
  - hero: "Back a Gnars rider. Your deposit stays yours and keeps earning. You
    keep half the yield; the other half backs your rider and the treasury."
  - positions desc: "Everything you have staked, and when you can touch it."
  - subnet row earned-column: "backs the subnet" (replaces "no yield yet" — a
    promise of yield that never comes). venueNote.subnet: "Base · 7-day lock".
  - subnet section desc: "This one pays you nothing. Staked MOR powers the Gnars
    Builder subnet, which funds what the DAO ships. Your MOR stays yours and
    unlocks 7 days after you stake."

## Page composition (StakePageContent)

- Page container `max-w-6xl` (match the site shell); narrow measure only on
  paragraphs (`max-w-2xl`).
- **h1 + hero paragraph sit on the page background**, so the page opens exactly
  like Treasury/Auctions. Below them, **every section is its own `CARD`** in a
  `space-y-6` stack — the prototype's single wrapping island was replaced by
  per-section cards at the owner's request (2026-08-07). The rates strip keeps
  slimmer padding than the other cards so global rates weigh less than the
  user's own money; PositionsHub and SubnetSection render their own cards
  because they own their headers (PositionsHub self-suppresses).
- Social proof: **the orbit graph renders at every width**, inside the
  `ORBIT_STAGE` panel. There is no `hidden md:block` and no list-instead-of-graph
  swap: below `md` the SVG draws at `min-w-[680px]` inside StakeOrbit's own
  `overflow-x-auto` scroller (`md:min-w-0` above it), so a phone pans across the
  graph instead of reading one squeezed to ~300px where the labels land at ~4px.
- BackerList is **additive, not a replacement**: it renders in a `md:hidden`
  block _below_ the graph. The reason is hover — the orbit only reveals a
  backer's ENS on hover, and touch has no hover, so on a phone the backer dots
  are anonymous and the ranked list is the only place to read who is behind a
  rider (and the only way to tap through to their profile).
- Above the orbit panel: one stat line from useStakeGraph (total staked gold,
  "N backers", treasury earned) — replaces the stats StakeOrbit prints inside
  the drawing. StakeOrbit gets an additive `chromeless` prop (production file,
  additive only, default false) that hides its internal card header (eyebrow,
  description, stats row) and its own card chrome so the section card plus
  ORBIT_STAGE are the only frames.

## RiderSelect

- **The stat meters die.** They are placeholder values presented as measurement
  (fake-precise numbers, filled-track bars — both banned). Right column becomes:
  name, tagline, backing line (real data, gold mono), CTA. Nothing else.
- Roster: tiles sized so the next card peeks (`basis-[22%]` mobile), plus a
  "1 / 7" position indicator visible at ALL breakpoints (replaces reliance on
  the desktop-only arrow hint).
- Keyboard hint stays desktop-only.

## Out of scope for this pass

Production modals (StakeDialog/GnarsStakeDialog) and the production stake.json
em-dash purge: separate PR, tracked in the triple-eval doc.
