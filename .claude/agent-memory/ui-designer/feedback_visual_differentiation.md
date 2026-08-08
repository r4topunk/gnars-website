---
name: visual-differentiation-over-reordering
description: A redesign that only reorders sections reads as "practically identical" — change the language (headers, weights, accent discipline), not the order
metadata:
  type: feedback
---

When asked to redesign a page, reordering sections and reusing the existing panel
/ eyebrow / accent language is not a redesign. The first `/stake/preview`
prototype did exactly that and was rejected as "practically identical" to
production.

**Why:** section order is invisible in a screenshot comparison. What a reviewer
actually reads as "different" is the visual language: surface recipe, header
pattern, type scale, accent discipline, and — most of all — **section weights**.
Uniform slabs stacked at equal weight is the failure mode; it makes every section
claim the same importance, so the page has no reading order.

**How to apply:** on a redesign brief, commit to ONE recipe per role (one panel,
one row, one muted tier pair, one accent) and then deliberately vary weight:
a 56px inline strip for reference data, a medium panel for the user's own data,
a nearly frameless block for the page's hero visual. Reserve the accent for
primary CTAs, selected states and key numbers; secondary actions get a quiet
`bg-white/[0.06]` treatment, and a second brand colour (e.g. Morpheus green) may
appear as *data* only — never as button, border or glow chrome.

**Corrections the owner made on the next pass (these are taste rules, not
one-offs — they apply to any surface here):**

- **No section-number eyebrows** (`01 Pick your rider`). Numbering sections is a
  known AI tell; an eyebrow names a topic in plain language or it doesn't exist.
  The first fix for uppercase eyebrows was mono `01`–`05` indices, and that got
  rejected too. Consistent headers are the rhythm.
- **No sub-cards inside a card.** Rows in a panel are transparent and separated by
  ONE hairline on the container (`divide-y`), never a lighter fill per row and
  never `border-t` + `border-b` in the same gap.
- **Zero decorative dots.** A coloured dot is only allowed when it encodes real
  state (milestone done/pending). A dot that repeats what the unit text already
  says ("● 84.21 MOR") dies. Same for `·` chains: max one middle dot per line —
  separators between list items are CSS borders, not literal characters.
- **Zero em-dashes and en-dashes in user-facing copy** (both locales). Restructure
  with period, comma, colon or parentheses. Applies to i18n strings AND to hard
  coded visible strings like page metadata titles. Code comments are exempt.
- **No fake precision.** Placeholder numbers drawn as measurement (filled meter
  tracks, "Overall 87") get deleted rather than restyled; variable rates print
  with `≈`.
- **Panel fills were too dark at `bg-white/[0.03]`** — the site's own `--card`
  step over `--background` is about twice that. `bg-white/[0.06]` is the recipe.

Related: [[stake-dark-surface]]
