# Proposal Template Fields — Design

**Status:** Draft
**Date:** 2026-04-24
**Owner:** r4to

## Problem

Today's proposal templates at `/propose?template=<slug>` pre-fill a single markdown textarea with a skeleton: H2 headings + `<!-- comment -->` guidance. Users must parse markdown, delete comments, and write inside a freeform editor. High friction for non-technical users.

## Goal

Replace the markdown skeleton with **structured input fields** per template. User fills labeled inputs; system compiles the values into the same markdown shape used today. Onchain payload, preview rendering, and wallet integration stay unchanged.

Scope: the 6 existing templates (`athlete-sponsorship`, `event-activation`, `physical-installation`, `content-media`, `development`, `droposal`). Blank `/propose` (no template param) keeps the existing markdown textarea.

## Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | Fields compile to markdown, stored in existing `description` form field | No schema/contract change; onchain payload identical to today |
| 2 | Section-level `textarea` by default; `Budget` section is a structured repeater | Biggest UX win from structured budget; other sections stay flexible prose |
| 3 | Validation required only on key sections per template (not all) | Soft enforcement; allows edge cases (renewals, stub proposals) |
| 4 | `ProposalDetailsForm` switches to `TemplateDetailsForm` when `?template=X` present | Tightest fit with existing wizard; no new routes |
| 5 | No inline markdown preview on Details step | Step 3 (Preview) already renders full proposal |
| 6 | No shared "Links" repeater | Links are scattered across templates; markdown links in prose handles it |
| 7 | Budget row schema: `label + amount + currency (ETH/USDC)` with auto-total per currency | Mirrors how Gnars actually pays out via Transactions step |

## Architecture

### New files

- `src/lib/proposal-template-schemas.ts` — per-template field definitions + compiler.
- `src/components/proposals/TemplateDetailsForm.tsx` — renders template fields + title + banner.
- `src/components/proposals/BudgetRepeater.tsx` — structured budget rows via `useFieldArray`.
- `src/components/proposals/ProposalDetailsHeader.tsx` — shared title + banner subform (hoisted from `ProposalDetailsForm`).

### Modified files

- `src/lib/proposal-templates.ts` — keep `slug`, `title`, `defaultTitle`; drop hardcoded `description` markdown strings. Schemas move to new file.
- `src/components/proposals/schema.ts` — add optional `templateFields: z.record(z.unknown()).optional()` to `ProposalFormValues`. Not submitted onchain.
- `src/components/proposals/ProposalDetailsForm.tsx` — thin switcher. Renders `TemplateDetailsForm` when `?template=X`, else existing markdown textarea (uses shared `ProposalDetailsHeader`).
- `src/components/proposals/ProposalWizard.tsx` — `handleNextToTransactions` triggers template-field validation when in template mode; direct `description` validation otherwise. Drops the `setValue("description", template.description)` line from the template-pre-fill effect.

### Types

```ts
type TemplateFieldDef =
  | {
      id: string;
      label: string;
      helper: string;
      type: "textarea";
      rows?: number;
      required?: boolean;
    }
  | {
      id: string;
      label: string;
      helper: string;
      type: "budget";
      required?: boolean;
    };

interface TemplateSchema {
  slug: string;
  title: string;
  defaultTitle: string;
  fields: TemplateFieldDef[];
}

interface BudgetRow {
  label: string;
  amount: number;
  currency: "ETH" | "USDC";
}
```

### Compiler

```ts
function compileTemplate(
  slug: string,
  values: Record<string, string | BudgetRow[]>
): string;
```

- Iterate schema fields in order.
- Skip fields with empty values (empty string or empty array).
- `textarea` non-empty → emit `## <label>\n\n<value>\n\n`.
- `budget` non-empty → emit `## <label>\n\n` + bulleted rows + per-currency totals block.

Budget markdown example:

```md
## Budget Breakdown

- Sponsorship fee — 2.0 ETH
- Gear — 0.3 ETH
- Travel — 500 USDC

**Totals:** 2.3 ETH · 500 USDC
```

## Template schemas

Each template preserves today's section titles. Helper text is the content of each current `<!-- comment -->`, trimmed and tightened.

### athlete-sponsorship
| id | label | type | required |
|---|---|---|---|
| `profile` | Athlete Profile | textarea (4 rows) | ✓ |
| `content-plan` | Sport & Content Plan | textarea (5 rows) | — |
| `reach` | Social Reach & Audience | textarea (4 rows) | — |
| `budget` | Budget Breakdown | budget | ✓ |
| `timeline` | Timeline & Milestones | textarea (4 rows) | ✓ |
| `track-record` | Track Record & References | textarea (4 rows) | — |

### event-activation
| id | label | type | required |
|---|---|---|---|
| `overview` | Event Overview | textarea (4 rows) | ✓ |
| `logistics` | Location & Logistics | textarea (4 rows) | — |
| `content-plan` | Content Capture Plan | textarea (4 rows) | — |
| `budget` | Budget Breakdown | budget | ✓ |
| `marketing` | Marketing & Promotion | textarea (4 rows) | — |
| `metrics` | Success Metrics | textarea (4 rows) | ✓ |

### physical-installation
| id | label | type | required |
|---|---|---|---|
| `overview` | Installation Overview | textarea (4 rows) | ✓ |
| `permits` | Location & Permits | textarea (4 rows) | — |
| `construction` | Materials & Construction | textarea (5 rows) | — |
| `budget` | Budget Breakdown | budget | ✓ |
| `access` | Community Access & Sustainability | textarea (4 rows) | ✓ |
| `docs-plan` | Documentation Plan | textarea (4 rows) | — |

### content-media
| id | label | type | required |
|---|---|---|---|
| `vision` | Creative Vision | textarea (4 rows) | ✓ |
| `production` | Production Plan | textarea (5 rows) | — |
| `distribution` | Distribution Strategy | textarea (4 rows) | — |
| `licensing` | CC0 & Licensing | textarea (4 rows) | — |
| `budget` | Budget & Resources | budget | ✓ |
| `deliverables` | Deliverables & Timeline | textarea (4 rows) | ✓ |

### development
| id | label | type | required |
|---|---|---|---|
| `description` | Project Description | textarea (4 rows) | ✓ |
| `architecture` | Technical Architecture | textarea (5 rows) | — |
| `open-source` | Open Source Strategy | textarea (4 rows) | — |
| `timeline` | Development Timeline | textarea (4 rows) | ✓ |
| `budget` | Budget & Resources | budget | ✓ |
| `support` | Post-Launch Support | textarea (4 rows) | — |

### droposal
| id | label | type | required |
|---|---|---|---|
| `concept` | Drop Concept | textarea (4 rows) | ✓ |
| `artwork` | Artwork & Artist | textarea (4 rows) | — |
| `mint` | Mint Details | textarea (5 rows) | ✓ |
| `irl` | Connection to IRL | textarea (4 rows) | — |
| `revenue` | Revenue Split & Treasury Impact | textarea (4 rows) | ✓ |
| `promotion` | Timeline & Promotion | textarea (4 rows) | — |

*(Droposal's Mint Details stays a textarea in v1. Structured mint fields — edition size, price, royalty %, split — noted as future work.)*

## Validation

- `TemplateDetailsForm` hosts a nested `useForm` instance with a zod schema generated from the active template's `fields`.
- Required `textarea` → `z.string().min(1, "<label> is required")`.
- Optional `textarea` → `z.string().optional()`.
- Required `budget` → `z.array(budgetRowSchema).min(1, "Add at least one budget line")`.
- `budgetRowSchema`: `{ label: z.string().min(1), amount: z.number().positive(), currency: z.enum(["ETH","USDC"]) }`.
- Parent wizard calls `formRef.current.validate()` via `useImperativeHandle` before advancing to Transactions. Scrolls to first error.
- Inline red error text under each field (same pattern as existing form).

## Data flow

1. User lands on `/propose?template=athlete-sponsorship`.
2. `ProposalWizard` detects template param, passes slug to `ProposalDetailsForm`.
3. `ProposalDetailsForm` renders `TemplateDetailsForm` (skips markdown textarea path).
4. User types into labeled inputs + budget repeater.
5. On any field change: effect calls `compileTemplate(slug, values)` → `parent.setValue("description", compiled, { shouldValidate: false })`.
6. Step 3 (Preview) reads `description` from parent form — sees already-compiled markdown.
7. Submission path unchanged: `description` stored via existing onchain transaction flow.

## Edge cases

- **Switching templates with data entered** — keep existing "only pre-fill when empty" behavior. Stale `templateFields` entries for non-matching ids are harmless (compiler ignores them). No destructive reset on slug change.
- **No template param** — `ProposalDetailsForm` falls back to today's markdown textarea. `templateFields` stays `undefined`. No behavior change.
- **Invalid/unknown slug** — `getTemplateSchema(slug)` returns `undefined` → fall back to markdown textarea.
- **User manually clears all fields** — compiled markdown becomes empty string. Required-field validation blocks "Next" on the affected sections.
- **Title + banner image** — rendered by shared `ProposalDetailsHeader` in both modes; unchanged behavior for uploads, IPFS, preview.

## Migration

- Delete `ProposalTemplate.description` field and the 6 markdown blobs in `src/lib/proposal-templates.ts`.
- Delete the `setValue("description", template.description)` line in `ProposalWizard.tsx`.
- Replace `description` pre-fill effect with a lightweight effect that only sets `title` to `template.defaultTitle` when form is empty.
- No existing drafts are stored server-side; no backfill needed.

## Testing

- Unit test for `compileTemplate`: fixtures for each of 6 templates, verify output markdown matches expected string.
- Unit test for budget total aggregation (mixed ETH + USDC, empty rows, single currency).
- Playwright e2e deferred — no existing propose-flow coverage (`tests/e2e/` covers propdates + gov, not propose).

## Non-goals (v1)

- Structured mint-details form for Droposal (edition size, mint price, royalty %, split). Future work.
- Template-specific link fields (per-platform social inputs).
- Inline markdown preview on Details step.
- Raw-markdown escape hatch inside template mode.
- Custom per-field repeaters beyond budget.

## Open questions

None. Decisions locked via Q&A on 2026-04-24.

## File-touch summary

**New:**
- `src/lib/proposal-template-schemas.ts`
- `src/components/proposals/TemplateDetailsForm.tsx`
- `src/components/proposals/BudgetRepeater.tsx`
- `src/components/proposals/ProposalDetailsHeader.tsx`

**Modified:**
- `src/lib/proposal-templates.ts`
- `src/components/proposals/schema.ts`
- `src/components/proposals/ProposalDetailsForm.tsx`
- `src/components/proposals/ProposalWizard.tsx`

**Docs:**
- `docs/INDEX.md` (add spec entry under Specs)
