# Proposal Template Fields — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace markdown skeleton templates with structured input fields that compile to the same markdown shape, stored in the existing `description` field.

**Architecture:** Per-template field schema + pure compiler → markdown; `TemplateDetailsForm` (nested `useForm`) renders fields when `?template=X` is present, mirrors values to parent form's `description` on every change; `ProposalDetailsForm` becomes a switcher between template mode and the legacy markdown textarea; wizard validation path branches on template mode.

**Tech Stack:** Next.js 15.5, React, TypeScript, react-hook-form, zod, vitest (unit), shadcn/ui, Tailwind.

**Worktree:** `.worktrees/proposal-template-fields` on branch `feat/proposal-template-fields`.

**Spec:** `docs/superpowers/specs/2026-04-24-proposal-template-fields-design.md`

---

## File Structure

**New files:**

- `src/lib/proposal-template-schemas.ts` — types + per-template schemas + `compileTemplate` + `buildTemplateValidator`.
- `src/lib/proposal-template-schemas.test.ts` — vitest tests for compiler + validator.
- `src/components/proposals/BudgetRepeater.tsx` — structured budget rows via `useFieldArray`.
- `src/components/proposals/TemplateDetailsForm.tsx` — renders structured template fields, nested useForm, imperative `validate` handle.
- `src/components/proposals/ProposalDetailsHeader.tsx` — shared title + banner upload subform (hoisted).

**Modified files:**

- `src/lib/proposal-templates.ts` — keep `slug` / `title` / `defaultTitle`; drop markdown `description` blobs.
- `src/components/proposals/schema.ts` — add optional `templateFields` to `proposalSchema`.
- `src/components/proposals/ProposalDetailsForm.tsx` — thin switcher + consumer of `ProposalDetailsHeader`.
- `src/components/proposals/ProposalWizard.tsx` — drop description pre-fill, branch validation, expose imperative validate ref.

---

## Task 1: Types + pure compiler (TDD)

**Files:**

- Create: `src/lib/proposal-template-schemas.ts`
- Test: `src/lib/proposal-template-schemas.test.ts`

- [ ] **Step 1: Write failing tests for `compileTemplate`**

Create `src/lib/proposal-template-schemas.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { compileTemplate, TEMPLATE_SCHEMAS } from "./proposal-template-schemas";

describe("compileTemplate", () => {
  it("emits H2 heading + body for a populated textarea field", () => {
    const md = compileTemplate("athlete-sponsorship", {
      profile: "Shredder from São Paulo. Skate + surf.",
    });
    expect(md).toContain("## Athlete Profile\n\nShredder from São Paulo. Skate + surf.\n");
  });

  it("omits sections whose values are empty", () => {
    const md = compileTemplate("athlete-sponsorship", {
      profile: "Rider X",
      "content-plan": "",
    });
    expect(md).toContain("## Athlete Profile");
    expect(md).not.toContain("## Sport & Content Plan");
  });

  it("omits sections with undefined values", () => {
    const md = compileTemplate("athlete-sponsorship", { profile: "Rider X" });
    expect(md).not.toContain("## Sport & Content Plan");
  });

  it("emits budget rows + per-currency totals", () => {
    const md = compileTemplate("athlete-sponsorship", {
      budget: [
        { label: "Sponsorship fee", amount: 2, currency: "ETH" },
        { label: "Gear", amount: 0.3, currency: "ETH" },
        { label: "Travel", amount: 500, currency: "USDC" },
      ],
    });
    expect(md).toContain("## Budget Breakdown");
    expect(md).toContain("- Sponsorship fee — 2 ETH");
    expect(md).toContain("- Gear — 0.3 ETH");
    expect(md).toContain("- Travel — 500 USDC");
    expect(md).toContain("**Totals:** 2.3 ETH · 500 USDC");
  });

  it("omits budget section when array is empty", () => {
    const md = compileTemplate("athlete-sponsorship", { budget: [] });
    expect(md).not.toContain("## Budget Breakdown");
  });

  it("skips invalid budget rows (no label or non-positive amount)", () => {
    const md = compileTemplate("athlete-sponsorship", {
      budget: [
        { label: "", amount: 1, currency: "ETH" },
        { label: "Valid", amount: 1, currency: "ETH" },
        { label: "Zero", amount: 0, currency: "USDC" },
      ],
    });
    expect(md).toContain("- Valid — 1 ETH");
    expect(md).not.toContain("— 0 USDC");
    expect(md).toContain("**Totals:** 1 ETH");
    expect(md).not.toContain("USDC");
  });

  it("returns empty string for unknown slug", () => {
    expect(compileTemplate("does-not-exist", { foo: "bar" })).toBe("");
  });

  it("preserves field order per schema", () => {
    const md = compileTemplate("athlete-sponsorship", {
      timeline: "Q2 2026",
      profile: "Rider Y",
    });
    const profileIdx = md.indexOf("## Athlete Profile");
    const timelineIdx = md.indexOf("## Timeline & Milestones");
    expect(profileIdx).toBeGreaterThan(-1);
    expect(timelineIdx).toBeGreaterThan(profileIdx);
  });
});

describe("TEMPLATE_SCHEMAS", () => {
  it("covers all 6 templates", () => {
    expect(Object.keys(TEMPLATE_SCHEMAS).sort()).toEqual([
      "athlete-sponsorship",
      "content-media",
      "development",
      "droposal",
      "event-activation",
      "physical-installation",
    ]);
  });

  it("every template has a budget field", () => {
    for (const schema of Object.values(TEMPLATE_SCHEMAS)) {
      expect(schema.fields.some((f) => f.type === "budget")).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run test — expect fail (module missing)**

Run: `pnpm vitest run src/lib/proposal-template-schemas.test.ts`
Expected: FAIL — cannot resolve `./proposal-template-schemas`.

- [ ] **Step 3: Implement types + compiler (minimal — only `athlete-sponsorship` to pass current tests)**

Create `src/lib/proposal-template-schemas.ts`:

```ts
export type TemplateFieldDef =
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

export interface TemplateSchema {
  slug: string;
  title: string;
  defaultTitle: string;
  fields: TemplateFieldDef[];
}

export interface BudgetRow {
  label: string;
  amount: number;
  currency: "ETH" | "USDC";
}

export type TemplateFieldValue = string | BudgetRow[];
export type TemplateValues = Record<string, TemplateFieldValue | undefined>;

export const TEMPLATE_SCHEMAS: Record<string, TemplateSchema> = {
  "athlete-sponsorship": {
    slug: "athlete-sponsorship",
    title: "Athlete Sponsorship",
    defaultTitle: "[Athlete Name] — Gnars Sponsorship",
    fields: [
      {
        id: "profile",
        label: "Athlete Profile",
        type: "textarea",
        rows: 4,
        required: true,
        helper:
          "Name, sport (skate, surf, bodyboard, freeride), location, social links. If renewal, reference the previous proposal.",
      },
      {
        id: "content-plan",
        label: "Sport & Content Plan",
        type: "textarea",
        rows: 5,
        helper:
          "Video parts, clips, photo sets, posting cadence (e.g. 2x/week wearing Noggles), events/competitions, collabs with other Gnars shredders.",
      },
      {
        id: "reach",
        label: "Social Reach & Audience",
        type: "textarea",
        rows: 4,
        helper:
          "Current audience: follower counts per platform, engagement, past features, how this sponsorship expands Gnars visibility.",
      },
      {
        id: "budget",
        label: "Budget Breakdown",
        type: "budget",
        required: true,
        helper: "Sponsorship fee, gear, travel, content production.",
      },
      {
        id: "timeline",
        label: "Timeline & Milestones",
        type: "textarea",
        rows: 4,
        required: true,
        helper:
          "Start and end dates, deliverables, milestone payments, reporting cadence (propdates, social posts).",
      },
      {
        id: "track-record",
        label: "Track Record & References",
        type: "textarea",
        rows: 4,
        helper:
          "Past work, competition results, past Gnars proposals (if renewal), community endorsements.",
      },
    ],
  },
};

export function getTemplateSchema(slug: string): TemplateSchema | undefined {
  return TEMPLATE_SCHEMAS[slug];
}

function isBudgetRow(v: unknown): v is BudgetRow {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as BudgetRow).label === "string" &&
    typeof (v as BudgetRow).amount === "number" &&
    ((v as BudgetRow).currency === "ETH" || (v as BudgetRow).currency === "USDC")
  );
}

function formatAmount(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(6)));
}

function compileBudget(label: string, rows: BudgetRow[]): string {
  const valid = rows.filter((r) => isBudgetRow(r) && r.label.trim().length > 0 && r.amount > 0);
  if (valid.length === 0) return "";

  const bullets = valid
    .map((r) => `- ${r.label.trim()} — ${formatAmount(r.amount)} ${r.currency}`)
    .join("\n");

  const totals = new Map<"ETH" | "USDC", number>();
  for (const r of valid) {
    totals.set(r.currency, (totals.get(r.currency) ?? 0) + r.amount);
  }
  const totalsStr = [...totals.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([cur, sum]) => `${formatAmount(sum)} ${cur}`)
    .join(" · ");

  return `## ${label}\n\n${bullets}\n\n**Totals:** ${totalsStr}\n`;
}

export function compileTemplate(slug: string, values: TemplateValues): string {
  const schema = TEMPLATE_SCHEMAS[slug];
  if (!schema) return "";

  const sections: string[] = [];
  for (const field of schema.fields) {
    const value = values[field.id];
    if (field.type === "textarea") {
      if (typeof value !== "string") continue;
      const trimmed = value.trim();
      if (!trimmed) continue;
      sections.push(`## ${field.label}\n\n${trimmed}\n`);
    } else if (field.type === "budget") {
      if (!Array.isArray(value)) continue;
      const block = compileBudget(field.label, value);
      if (block) sections.push(block);
    }
  }
  return sections.join("\n");
}
```

- [ ] **Step 4: Run test — expect PASS for implemented cases**

Run: `pnpm vitest run src/lib/proposal-template-schemas.test.ts`
Expected: PASS (all 8 compile tests + the "covers 6 templates" test FAILS because only 1 template is defined).

- [ ] **Step 5: Commit**

```bash
git add src/lib/proposal-template-schemas.ts src/lib/proposal-template-schemas.test.ts
git commit -m "feat(propose): add template schema types + markdown compiler"
```

---

## Task 2: All 6 template schemas

**Files:**

- Modify: `src/lib/proposal-template-schemas.ts`
- Test: `src/lib/proposal-template-schemas.test.ts` (already written — covers 6-template assertion)

- [ ] **Step 1: Add the 5 remaining templates**

In `TEMPLATE_SCHEMAS` (after `athlete-sponsorship`), append:

```ts
  "event-activation": {
    slug: "event-activation",
    title: "Event & Activation",
    defaultTitle: "[Event Name] — Gnars Activation",
    fields: [
      {
        id: "overview",
        label: "Event Overview",
        type: "textarea",
        rows: 4,
        required: true,
        helper:
          "What type of event (conference + skate, hacker house, cultural activation). Where, when, why it matters for Gnars.",
      },
      {
        id: "logistics",
        label: "Location & Logistics",
        type: "textarea",
        rows: 4,
        helper:
          "Venue, city/country, dates, duration, attendance, travel/accommodation needs, permits.",
      },
      {
        id: "content-plan",
        label: "Content Capture Plan",
        type: "textarea",
        rows: 4,
        helper:
          "Photo/video coverage, who films/edits, deliverables, distribution channels, post-event timeline.",
      },
      {
        id: "budget",
        label: "Budget Breakdown",
        type: "budget",
        required: true,
        helper:
          "Venue, travel, equipment, content production, merch, marketing, contingency.",
      },
      {
        id: "marketing",
        label: "Marketing & Promotion",
        type: "textarea",
        rows: 4,
        helper:
          "Pre-event social, on-site branding (Noggles, merch, banners), partner cross-promotion, post-event recap.",
      },
      {
        id: "metrics",
        label: "Success Metrics",
        type: "textarea",
        rows: 4,
        required: true,
        helper:
          "Attendance, content views, new community members, press mentions, on-chain activity generated.",
      },
    ],
  },

  "physical-installation": {
    slug: "physical-installation",
    title: "Physical Installation",
    defaultTitle: "[Location] — Noggles Rail / Installation",
    fields: [
      {
        id: "overview",
        label: "Installation Overview",
        type: "textarea",
        rows: 4,
        required: true,
        helper:
          "What you're building (Noggles Rail, ramp, skate spot refurb, other). Where. Why this location matters for Gnars.",
      },
      {
        id: "permits",
        label: "Location & Permits",
        type: "textarea",
        rows: 4,
        helper:
          "Exact location, public vs private land, permits/approvals, landowner/municipality contact, legal/liability notes.",
      },
      {
        id: "construction",
        label: "Materials & Construction",
        type: "textarea",
        rows: 5,
        helper:
          "Materials, dimensions, method, timeline, fabricator, Noggles branding integration (shape, color, placement).",
      },
      {
        id: "budget",
        label: "Budget Breakdown",
        type: "budget",
        required: true,
        helper:
          "Materials, fabrication, transport, labor, permits, signage, contingency.",
      },
      {
        id: "access",
        label: "Community Access & Sustainability",
        type: "textarea",
        rows: 4,
        required: true,
        helper:
          "Public access, long-term maintenance, expected lifespan, contribution to local scene.",
      },
      {
        id: "docs-plan",
        label: "Documentation Plan",
        type: "textarea",
        rows: 4,
        helper:
          "Build process photo/video, inauguration event, social content plan, related droposals.",
      },
    ],
  },

  "content-media": {
    slug: "content-media",
    title: "Content & Media",
    defaultTitle: "[Project Name] — Gnars Content Production",
    fields: [
      {
        id: "vision",
        label: "Creative Vision",
        type: "textarea",
        rows: 4,
        required: true,
        helper:
          "What you're making (documentary, film, zine, podcast, photo book). The story and how it connects to Gnars culture.",
      },
      {
        id: "production",
        label: "Production Plan",
        type: "textarea",
        rows: 5,
        helper:
          "Format and length, creative team roles, equipment/software, locations, post-production workflow.",
      },
      {
        id: "distribution",
        label: "Distribution Strategy",
        type: "textarea",
        rows: 4,
        helper:
          "Primary platforms, release schedule, cross-promotion, festival/media partnerships, archival plan.",
      },
      {
        id: "licensing",
        label: "CC0 & Licensing",
        type: "textarea",
        rows: 4,
        helper:
          "CC0? If not, what rights does the DAO retain? Remix allowed? Third-party clearances (music, footage).",
      },
      {
        id: "budget",
        label: "Budget & Resources",
        type: "budget",
        required: true,
        helper:
          "Pre-production, production (filming, travel, rental), post-production, distribution. Recurring cost per episode if applicable.",
      },
      {
        id: "deliverables",
        label: "Deliverables & Timeline",
        type: "textarea",
        rows: 4,
        required: true,
        helper:
          "Each deliverable with expected completion date, milestone checkpoints, progress comms (propdates, rough cuts).",
      },
    ],
  },

  development: {
    slug: "development",
    title: "Development & Tech",
    defaultTitle: "[Feature/Tool Name] — Gnars Development",
    fields: [
      {
        id: "description",
        label: "Project Description",
        type: "textarea",
        rows: 4,
        required: true,
        helper:
          "What you're building in plain language. Problem it solves for the Gnars community. Who will use it.",
      },
      {
        id: "architecture",
        label: "Technical Architecture",
        type: "textarea",
        rows: 5,
        helper:
          "Stack, system architecture, integration with existing Gnars infra, external deps, smart contract changes.",
      },
      {
        id: "open-source",
        label: "Open Source Strategy",
        type: "textarea",
        rows: 4,
        helper:
          "Open source? License? Repo link. Reusable by other DAOs? Contribution to Builder/Nouns/Base ecosystem.",
      },
      {
        id: "timeline",
        label: "Development Timeline",
        type: "textarea",
        rows: 4,
        required: true,
        helper:
          "Phases with scope + duration, key milestones, demo points, when users can test it.",
      },
      {
        id: "budget",
        label: "Budget & Resources",
        type: "budget",
        required: true,
        helper:
          "Developer compensation, infra (hosting, RPC, APIs, domains), audits (if contracts), design/UX.",
      },
      {
        id: "support",
        label: "Post-Launch Support",
        type: "textarea",
        rows: 4,
        helper:
          "Maintenance plan, long-term owner, monitoring, community feedback loop, ongoing funding needs.",
      },
    ],
  },

  droposal: {
    slug: "droposal",
    title: "Droposal / NFT Drop",
    defaultTitle: "[Collection Name] — Gnars Droposal",
    fields: [
      {
        id: "concept",
        label: "Drop Concept",
        type: "textarea",
        rows: 4,
        required: true,
        helper:
          "Concept of the collection, story/moment it commemorates, connection to Gnars culture or IRL activation.",
      },
      {
        id: "artwork",
        label: "Artwork & Artist",
        type: "textarea",
        rows: 4,
        helper:
          "Artist name, background, portfolio. Style, medium, number of pieces, original vs derived.",
      },
      {
        id: "mint",
        label: "Mint Details",
        type: "textarea",
        rows: 5,
        required: true,
        helper:
          "Edition type (open or fixed), size, price, duration, chain (Base), royalty %, revenue split config.",
      },
      {
        id: "irl",
        label: "Connection to IRL",
        type: "textarea",
        rows: 4,
        helper:
          "Link to related proposal (event, installation, sponsorship). Photos/videos from the activation. Why this moment deserves commemoration.",
      },
      {
        id: "revenue",
        label: "Revenue Split & Treasury Impact",
        type: "textarea",
        rows: 4,
        required: true,
        helper:
          "Revenue split percentages (artist, treasury, other), expected mint revenue, treasury benefit, secondary royalties.",
      },
      {
        id: "promotion",
        label: "Timeline & Promotion",
        type: "textarea",
        rows: 4,
        helper:
          "Drop date, pre-mint promo plan, allowlist vs open, post-mint community engagement (holders channel, utility).",
      },
    ],
  },
};
```

- [ ] **Step 2: Run tests**

Run: `pnpm vitest run src/lib/proposal-template-schemas.test.ts`
Expected: PASS all.

- [ ] **Step 3: Commit**

```bash
git add src/lib/proposal-template-schemas.ts
git commit -m "feat(propose): add schemas for remaining 5 proposal templates"
```

---

## Task 3: Zod validator builder (TDD)

**Files:**

- Modify: `src/lib/proposal-template-schemas.ts`
- Test: `src/lib/proposal-template-schemas.test.ts`

- [ ] **Step 1: Append failing tests for `buildTemplateValidator`**

At the bottom of `src/lib/proposal-template-schemas.test.ts`:

```ts
import { buildTemplateValidator } from "./proposal-template-schemas";

describe("buildTemplateValidator", () => {
  it("rejects missing required textarea", () => {
    const schema = buildTemplateValidator("athlete-sponsorship");
    const res = schema.safeParse({
      budget: [{ label: "x", amount: 1, currency: "ETH" }],
      timeline: "Q2",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path[0] === "profile")).toBe(true);
    }
  });

  it("rejects empty required textarea (whitespace only)", () => {
    const schema = buildTemplateValidator("athlete-sponsorship");
    const res = schema.safeParse({
      profile: "   ",
      timeline: "Q2",
      budget: [{ label: "x", amount: 1, currency: "ETH" }],
    });
    expect(res.success).toBe(false);
  });

  it("rejects empty required budget array", () => {
    const schema = buildTemplateValidator("athlete-sponsorship");
    const res = schema.safeParse({ profile: "Rider", timeline: "Q2", budget: [] });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path[0] === "budget")).toBe(true);
    }
  });

  it("rejects budget row with non-positive amount", () => {
    const schema = buildTemplateValidator("athlete-sponsorship");
    const res = schema.safeParse({
      profile: "Rider",
      timeline: "Q2",
      budget: [{ label: "x", amount: 0, currency: "ETH" }],
    });
    expect(res.success).toBe(false);
  });

  it("accepts fully valid minimum payload", () => {
    const schema = buildTemplateValidator("athlete-sponsorship");
    const res = schema.safeParse({
      profile: "Rider",
      timeline: "Q2 2026",
      budget: [{ label: "Fee", amount: 1, currency: "ETH" }],
    });
    expect(res.success).toBe(true);
  });

  it("allows optional fields to be absent", () => {
    const schema = buildTemplateValidator("athlete-sponsorship");
    const res = schema.safeParse({
      profile: "Rider",
      timeline: "Q2 2026",
      budget: [{ label: "Fee", amount: 1, currency: "ETH" }],
      // content-plan, reach, track-record omitted
    });
    expect(res.success).toBe(true);
  });

  it("returns permissive schema for unknown slug", () => {
    const schema = buildTemplateValidator("does-not-exist");
    expect(schema.safeParse({}).success).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests — expect fail (export missing)**

Run: `pnpm vitest run src/lib/proposal-template-schemas.test.ts`
Expected: FAIL — `buildTemplateValidator` not exported.

- [ ] **Step 3: Add `buildTemplateValidator` to `src/lib/proposal-template-schemas.ts`**

At the top of the file, add the import:

```ts
import { z, type ZodType } from "zod";
```

At the bottom of the file:

```ts
const budgetRowSchema = z.object({
  label: z.string().min(1, "Label required"),
  amount: z.number().positive("Amount must be greater than 0"),
  currency: z.enum(["ETH", "USDC"]),
});

export function buildTemplateValidator(slug: string): ZodType {
  const schema = TEMPLATE_SCHEMAS[slug];
  if (!schema) return z.record(z.string(), z.unknown());

  const shape: Record<string, ZodType> = {};
  for (const field of schema.fields) {
    if (field.type === "textarea") {
      shape[field.id] = field.required
        ? z.string().trim().min(1, `${field.label} is required`)
        : z.string().trim().optional();
    } else if (field.type === "budget") {
      const arr = z.array(budgetRowSchema);
      shape[field.id] = field.required
        ? arr.min(1, `${field.label}: add at least one budget line`)
        : arr.optional();
    }
  }
  return z.object(shape).passthrough();
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm vitest run src/lib/proposal-template-schemas.test.ts`
Expected: PASS all.

- [ ] **Step 5: Commit**

```bash
git add src/lib/proposal-template-schemas.ts src/lib/proposal-template-schemas.test.ts
git commit -m "feat(propose): add zod validator builder for template fields"
```

---

## Task 4: Update parent proposal schema

**Files:**

- Modify: `src/components/proposals/schema.ts`

- [ ] **Step 1: Add `templateFields` to `proposalSchema`**

Open `src/components/proposals/schema.ts`. Change the `proposalSchema` definition (around line 191) from:

```ts
export const proposalSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  bannerImage: z.string().optional(),
  transactions: z.array(transactionSchema).min(1, "At least one transaction is required"),
});
```

to:

```ts
export const proposalSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  bannerImage: z.string().optional(),
  transactions: z.array(transactionSchema).min(1, "At least one transaction is required"),
  /** Optional per-template structured field values. Not submitted onchain — compiled to description. */
  templateFields: z.record(z.string(), z.unknown()).optional(),
});
```

- [ ] **Step 2: Verify type still compiles**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/proposals/schema.ts
git commit -m "feat(propose): add optional templateFields to proposal schema"
```

---

## Task 5: `BudgetRepeater` component

**Files:**

- Create: `src/components/proposals/BudgetRepeater.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/proposals/BudgetRepeater.tsx`:

```tsx
"use client";

/* eslint-disable react-hooks/incompatible-library -- react-hook-form useFieldArray/watch pattern is known-incompatible with React Compiler */
import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BudgetRow } from "@/lib/proposal-template-schemas";

export interface BudgetRepeaterProps {
  /** Dotted path within the form state, e.g. "budget" or "templateFields.budget". */
  name: string;
  /** Optional per-row error accessor: (index) => { label?: string; amount?: string } */
  getRowError?: (index: number) => { label?: string; amount?: string } | undefined;
  /** Top-level error message (e.g. "add at least one line"). */
  topLevelError?: string;
}

const CURRENCIES = ["ETH", "USDC"] as const;

export function BudgetRepeater({ name, getRowError, topLevelError }: BudgetRepeaterProps) {
  const { control, register } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });
  const rows = (useWatch({ control, name }) as BudgetRow[] | undefined) ?? [];

  const totals = new Map<"ETH" | "USDC", number>();
  for (const r of rows) {
    if (!r || typeof r.amount !== "number" || r.amount <= 0) continue;
    if (!r.label?.trim?.()) continue;
    const cur = (r.currency ?? "ETH") as "ETH" | "USDC";
    totals.set(cur, (totals.get(cur) ?? 0) + r.amount);
  }
  const totalsStr =
    totals.size === 0
      ? "—"
      : [...totals.entries()]
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .map(([cur, sum]) => `${Number(sum.toFixed(6))} ${cur}`)
          .join(" · ");

  return (
    <div className="space-y-3">
      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          No budget lines yet. Add one to request funding.
        </p>
      ) : (
        <div className="space-y-2">
          {fields.map((field, index) => {
            const rowErr = getRowError?.(index);
            return (
              <div
                key={field.id}
                className="grid grid-cols-[1fr_140px_110px_auto] gap-2 items-start"
              >
                <div>
                  <Input
                    placeholder="Line item (e.g. Sponsorship fee)"
                    aria-label={`Budget line ${index + 1} label`}
                    {...register(`${name}.${index}.label` as const)}
                  />
                  {rowErr?.label ? (
                    <p className="text-xs text-red-500 mt-1">{rowErr.label}</p>
                  ) : null}
                </div>
                <div>
                  <Input
                    type="number"
                    step="any"
                    min={0}
                    placeholder="Amount"
                    aria-label={`Budget line ${index + 1} amount`}
                    {...register(`${name}.${index}.amount` as const, { valueAsNumber: true })}
                  />
                  {rowErr?.amount ? (
                    <p className="text-xs text-red-500 mt-1">{rowErr.amount}</p>
                  ) : null}
                </div>
                <CurrencySelect name={`${name}.${index}.currency` as const} />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={`Remove budget line ${index + 1}`}
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => append({ label: "", amount: 0, currency: "ETH" })}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add line
        </Button>
        <div className="text-sm">
          <span className="text-muted-foreground mr-1">Total:</span>
          <span className="font-semibold tabular-nums">{totalsStr}</span>
        </div>
      </div>

      {topLevelError ? <p className="text-xs text-red-500">{topLevelError}</p> : null}
    </div>
  );
}

function CurrencySelect({ name }: { name: string }) {
  const { setValue, control } = useFormContext();
  const value = useWatch({ control, name }) as string | undefined;
  return (
    <div>
      <Label className="sr-only" htmlFor={name}>
        Currency
      </Label>
      <Select
        value={(value as string) ?? "ETH"}
        onValueChange={(v) => setValue(name, v, { shouldDirty: true })}
      >
        <SelectTrigger id={name}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CURRENCIES.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

- [ ] **Step 2: Verify lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/proposals/BudgetRepeater.tsx
git commit -m "feat(propose): add BudgetRepeater component"
```

---

## Task 6: `ProposalDetailsHeader` (hoist shared subform)

**Files:**

- Create: `src/components/proposals/ProposalDetailsHeader.tsx`

- [ ] **Step 1: Extract title + banner subform**

Create `src/components/proposals/ProposalDetailsHeader.tsx`:

```tsx
"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Upload, X } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ipfsToGatewayUrl, uploadToPinata } from "@/lib/pinata";
import type { ProposalFormValues } from "./schema";

export function ProposalDetailsHeader() {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<ProposalFormValues>();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const watchedBannerImage = watch("bannerImage");

  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      toast.loading("Uploading image to IPFS...", { id: "image-upload" });
      const result = await uploadToPinata(file, `proposal-banner-${Date.now()}`);
      if (!result.success || !result.data) {
        throw new Error(result.error || "Upload failed");
      }
      setValue("bannerImage", result.data.ipfsUrl);
      setImagePreview(result.data.gatewayUrl);
      toast.success("Image uploaded successfully!", { id: "image-upload" });
    } catch (error) {
      console.error("Upload error:", error);
      setImagePreview(null);
      setValue("bannerImage", undefined);
      toast.error("Failed to upload image", {
        id: "image-upload",
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File size must be less than 10MB");
      return;
    }
    handleImageUpload(file);
  };

  const removeImage = () => {
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setValue("bannerImage", undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const displayImageUrl =
    imagePreview || (watchedBannerImage ? ipfsToGatewayUrl(watchedBannerImage) : null);

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="title">Proposal Title *</Label>
        <Input
          id="title"
          placeholder="Enter proposal title..."
          {...register("title")}
          className="mt-1"
        />
        {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
        <p className="text-xs text-muted-foreground mt-1">Keep it concise and descriptive</p>
      </div>

      <div>
        <Label htmlFor="banner">Banner Image</Label>
        <div className="mt-2">
          {displayImageUrl ? (
            <div
              className="relative rounded-lg border overflow-hidden"
              style={{ aspectRatio: "16 / 9" }}
            >
              <Image src={displayImageUrl} alt="Banner preview" fill className="object-cover" />
              <Button
                size="sm"
                variant="destructive"
                className="absolute top-2 right-2"
                onClick={removeImage}
                disabled={isUploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
              onClick={() => !isUploading && fileInputRef.current?.click()}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground animate-spin" />
                  <p className="text-sm text-muted-foreground">Uploading to IPFS...</p>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Click to upload banner image</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
                </>
              )}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/proposals/ProposalDetailsHeader.tsx
git commit -m "refactor(propose): hoist title+banner into ProposalDetailsHeader"
```

---

## Task 7: `TemplateDetailsForm`

**Files:**

- Create: `src/components/proposals/TemplateDetailsForm.tsx`

- [ ] **Step 1: Implement the template-driven form with imperative validate handle**

Create `src/components/proposals/TemplateDetailsForm.tsx`:

```tsx
"use client";

/* eslint-disable react-hooks/incompatible-library -- react-hook-form watch()/useFormContext pattern is known-incompatible with React Compiler */
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FormProvider,
  useForm,
  useFormContext,
  useWatch,
  type SubmitHandler,
} from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  buildTemplateValidator,
  compileTemplate,
  getTemplateSchema,
  type BudgetRow,
  type TemplateFieldValue,
  type TemplateValues,
} from "@/lib/proposal-template-schemas";
import { BudgetRepeater } from "./BudgetRepeater";
import { ProposalDetailsHeader } from "./ProposalDetailsHeader";
import type { ProposalFormValues } from "./schema";

export interface TemplateDetailsFormHandle {
  /** Validates all template fields; returns true if valid, false otherwise (focus goes to first error). */
  validate: () => Promise<boolean>;
}

export interface TemplateDetailsFormProps {
  slug: string;
}

export const TemplateDetailsForm = forwardRef<TemplateDetailsFormHandle, TemplateDetailsFormProps>(
  function TemplateDetailsForm({ slug }, ref) {
    const schema = getTemplateSchema(slug);
    const parent = useFormContext<ProposalFormValues>();
    const initialLoadedRef = useRef(false);

    // Nested form for structured fields. Keeps validation isolated from parent wizard.
    const initialValues = (parent.getValues("templateFields") as TemplateValues | undefined) ?? {};
    const templateForm = useForm<TemplateValues>({
      resolver: zodResolver(buildTemplateValidator(slug)),
      defaultValues: buildDefaults(slug, initialValues),
      mode: "onChange",
    });

    const watchedValues = useWatch({ control: templateForm.control }) as TemplateValues;

    // Mirror structured values into parent form: templateFields + compiled description.
    useEffect(() => {
      if (!schema) return;
      parent.setValue("templateFields", watchedValues, { shouldDirty: true });
      const compiled = compileTemplate(slug, watchedValues);
      parent.setValue("description", compiled, { shouldDirty: true, shouldValidate: false });
      initialLoadedRef.current = true;
    }, [watchedValues, slug, schema, parent]);

    useImperativeHandle(
      ref,
      () => ({
        validate: async () => {
          const ok = await templateForm.trigger();
          if (!ok) {
            // Focus first error.
            const firstError = Object.keys(templateForm.formState.errors)[0];
            if (firstError) {
              templateForm.setFocus(firstError as keyof TemplateValues);
            }
          }
          return ok;
        },
      }),
      [templateForm],
    );

    const onSubmit: SubmitHandler<TemplateValues> = () => {};

    if (!schema) return null;

    return (
      <FormProvider {...templateForm}>
        <form onSubmit={templateForm.handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <div>
            <h2 className="text-2xl font-bold mb-1">{schema.title}</h2>
            <p className="text-muted-foreground">
              Fill in the sections below. Your answers are compiled into the proposal.
            </p>
          </div>

          <ProposalDetailsHeader />

          <div className="space-y-5">
            {schema.fields.map((field) => {
              const error = templateForm.formState.errors[field.id] as
                | { message?: string }
                | undefined;
              return (
                <div key={field.id}>
                  <Label htmlFor={field.id}>
                    {field.label}
                    {field.required ? " *" : ""}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1 mb-2">{field.helper}</p>
                  {field.type === "textarea" ? (
                    <Textarea
                      id={field.id}
                      rows={field.rows ?? 4}
                      className="resize-y"
                      {...templateForm.register(field.id)}
                    />
                  ) : (
                    <BudgetRepeater
                      name={field.id}
                      topLevelError={error?.message}
                      getRowError={(index) => {
                        const arrErrors = templateForm.formState.errors[field.id] as
                          | {
                              [key: number]: {
                                label?: { message?: string };
                                amount?: { message?: string };
                              };
                            }
                          | undefined;
                        const rowErr = arrErrors?.[index];
                        if (!rowErr) return undefined;
                        return {
                          label: rowErr.label?.message,
                          amount: rowErr.amount?.message,
                        };
                      }}
                    />
                  )}
                  {field.type === "textarea" && error?.message ? (
                    <p className="text-xs text-red-500 mt-1">{error.message}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </form>
      </FormProvider>
    );
  },
);

function buildDefaults(slug: string, existing: TemplateValues): TemplateValues {
  const schema = getTemplateSchema(slug);
  if (!schema) return existing;
  const defaults: TemplateValues = {};
  for (const field of schema.fields) {
    const existingVal = existing[field.id];
    if (field.type === "textarea") {
      defaults[field.id] = typeof existingVal === "string" ? existingVal : "";
    } else if (field.type === "budget") {
      defaults[field.id] = Array.isArray(existingVal) ? (existingVal as BudgetRow[]) : [];
    }
  }
  return defaults;
}

export type { TemplateFieldValue };
```

- [ ] **Step 2: Verify lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/proposals/TemplateDetailsForm.tsx
git commit -m "feat(propose): add TemplateDetailsForm with nested useForm + imperative validate"
```

---

## Task 8: `ProposalDetailsForm` becomes a switcher

**Files:**

- Modify: `src/components/proposals/ProposalDetailsForm.tsx`

- [ ] **Step 1: Rewrite as switcher**

Replace the entire contents of `src/components/proposals/ProposalDetailsForm.tsx` with:

```tsx
"use client";

/* eslint-disable react-hooks/incompatible-library -- react-hook-form watch() pattern is known-incompatible with React Compiler */
// Small helpers kept local to avoid scope creep.
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Eye } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { Markdown } from "@/components/common/Markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getTemplateSchema } from "@/lib/proposal-template-schemas";
import { ProposalDetailsHeader } from "./ProposalDetailsHeader";
import type { ProposalFormValues } from "./schema";
import { TemplateDetailsForm, type TemplateDetailsFormHandle } from "./TemplateDetailsForm";

export interface ProposalDetailsFormHandle {
  /** Validates current mode's fields. For template mode, includes all required template fields. */
  validate: () => Promise<boolean>;
}

export interface ProposalDetailsFormProps {
  templateSlug?: string | null;
}

export const ProposalDetailsForm = forwardRef<ProposalDetailsFormHandle, ProposalDetailsFormProps>(
  function ProposalDetailsForm({ templateSlug }, ref) {
    const templateRef = useState<TemplateDetailsFormHandle | null>(null)[0];
    const templateHandleRef = useTemplateHandleRef();

    const hasTemplate = Boolean(templateSlug && getTemplateSchema(templateSlug));

    // Expose validate via imperative handle. Parent wizard calls this before advancing.
    useImperativeHandleValidate(ref, async (parentTrigger) => {
      if (hasTemplate) {
        const ok = await templateHandleRef.current?.validate();
        if (!ok) return false;
        // Also ensure parent's title is non-empty.
        return parentTrigger(["title"]);
      }
      return parentTrigger(["title", "description"]);
    });

    if (hasTemplate) {
      return (
        <TemplateDetailsForm
          ref={(handle) => {
            templateHandleRef.current = handle;
          }}
          slug={templateSlug!}
        />
      );
    }

    return <MarkdownDetailsForm />;
  },
);

function useTemplateHandleRef() {
  return useRef<TemplateDetailsFormHandle | null>(null);
}

function useImperativeHandleValidate(
  ref: React.Ref<ProposalDetailsFormHandle>,
  impl: (
    parentTrigger: (fields: Array<keyof ProposalFormValues>) => Promise<boolean>,
  ) => Promise<boolean>,
) {
  const { trigger } = useFormContext<ProposalFormValues>();
  useImperativeHandle(
    ref,
    () => ({
      validate: () => impl(trigger as never),
    }),
    [trigger, impl],
  );
}

function MarkdownDetailsForm() {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<ProposalFormValues>();
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);
  const watchedDescription = watch("description");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Proposal Details</h2>
        <p className="text-muted-foreground">Provide the basic information for your proposal</p>
      </div>

      <ProposalDetailsHeader />

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="description">Description *</Label>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowMarkdownPreview(!showMarkdownPreview)}
          >
            <Eye className="h-4 w-4 mr-1" />
            {showMarkdownPreview ? "Edit" : "Preview"}
          </Button>
        </div>

        {showMarkdownPreview ? (
          <Card>
            <CardContent className="p-4 min-h-[200px]">
              {watchedDescription ? (
                <Markdown className="prose-sm max-w-none">{watchedDescription}</Markdown>
              ) : (
                <p className="text-muted-foreground italic">No description yet</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Textarea
            id="description"
            placeholder="Describe your proposal in detail...

You can use **markdown** formatting:
- **Bold text**
- *Italic text*
- `Code snippets`

Explain the problem, solution, and expected outcomes."
            {...register("description")}
            rows={8}
            className="resize-none"
          />
        )}

        {errors.description && (
          <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          Markdown formatting supported. Be thorough and clear about your proposal&apos;s purpose
          and impact.
        </p>
      </div>
    </div>
  );
}
```

**Note on the imports:** ESLint/import-order plugins may complain about the hook imports appearing after non-hook imports. If lint flags it, consolidate all imports at the top of the file and inline the `useTemplateHandleRef` / `useImperativeHandleValidate` bodies directly inside the component instead of extracting helpers. Prioritize passing lint without introducing new warnings.

- [ ] **Step 2: Verify lint**

Run: `pnpm lint`
Expected: no errors. If import order warning appears, consolidate imports at top of file per the note above.

- [ ] **Step 3: Commit**

```bash
git add src/components/proposals/ProposalDetailsForm.tsx
git commit -m "feat(propose): switch ProposalDetailsForm between template and markdown modes"
```

---

## Task 9: Wire `ProposalWizard`

**Files:**

- Modify: `src/components/proposals/ProposalWizard.tsx`
- Modify: `src/lib/proposal-templates.ts`

- [ ] **Step 1: Update `ProposalWizard.tsx`**

Replace the template-pre-fill `useEffect` and `handleNextToTransactions` in `src/components/proposals/ProposalWizard.tsx`.

Find the import block and replace:

```ts
import { getProposalTemplate } from "@/lib/proposal-templates";
```

with:

```ts
import {
  ProposalDetailsForm,
  type ProposalDetailsFormHandle,
} from "@/components/proposals/ProposalDetailsForm";
import { getProposalTemplate } from "@/lib/proposal-templates";
```

Remove the existing import line:

```ts
import { ProposalDetailsForm } from "@/components/proposals/ProposalDetailsForm";
```

Inside `ProposalWizard()`, add a ref after `useSearchParams`:

```ts
const detailsFormRef = useRef<ProposalDetailsFormHandle | null>(null);
const templateSlug = searchParams.get("template");
```

Also add `import { useRef } from "react";` to the existing React import.

Replace the pre-fill effect (currently lines ~40-54):

```ts
// Pre-fill form from ?template= query param
useEffect(() => {
  const templateSlug = searchParams.get("template");
  if (!templateSlug) return;

  const template = getProposalTemplate(templateSlug);
  if (!template) return;

  // Only pre-fill if the form is still empty (don't overwrite user edits)
  const currentTitle = methods.getValues("title");
  const currentDesc = methods.getValues("description");
  if (currentTitle || currentDesc) return;

  methods.setValue("title", template.defaultTitle, { shouldDirty: false });
  methods.setValue("description", template.description, { shouldDirty: false });
}, [searchParams, methods]);
```

with:

```ts
// Pre-fill title from template (description is compiled inside TemplateDetailsForm).
useEffect(() => {
  if (!templateSlug) return;
  const template = getProposalTemplate(templateSlug);
  if (!template) return;
  const currentTitle = methods.getValues("title");
  if (currentTitle) return;
  methods.setValue("title", template.defaultTitle, { shouldDirty: false });
}, [templateSlug, methods]);
```

Replace `handleNextToTransactions`:

```ts
const handleNextToTransactions = async () => {
  const isValid = await trigger(["title", "description"]);
  if (isValid) {
    setCurrentTab("transactions");
  }
};
```

with:

```ts
const handleNextToTransactions = async () => {
  const handle = detailsFormRef.current;
  const isValid = handle ? await handle.validate() : await trigger(["title", "description"]);
  if (isValid) {
    setCurrentTab("transactions");
  }
};
```

In the JSX, replace the existing `<ProposalDetailsForm />` with:

```tsx
<ProposalDetailsForm ref={detailsFormRef} templateSlug={templateSlug} />
```

- [ ] **Step 2: Drop markdown blobs from `proposal-templates.ts`**

Replace the entire contents of `src/lib/proposal-templates.ts` with:

```ts
/**
 * Proposal templates for Gnars DAO.
 *
 * Each entry holds the display metadata for a template that is pre-filled into
 * the ProposalWizard when the user navigates to /propose?template=<slug>.
 *
 * Structured field schemas live in `src/lib/proposal-template-schemas.ts`.
 * Templates are derived from analysis of 77 executed Gnars proposals on Base.
 */

import { TEMPLATE_SCHEMAS } from "./proposal-template-schemas";

export interface ProposalTemplate {
  slug: string;
  title: string;
  /** Pre-filled proposal title (user edits freely) */
  defaultTitle: string;
}

export const PROPOSAL_TEMPLATES: Record<string, ProposalTemplate> = Object.fromEntries(
  Object.entries(TEMPLATE_SCHEMAS).map(([slug, schema]) => [
    slug,
    { slug, title: schema.title, defaultTitle: schema.defaultTitle },
  ]),
);

export function getProposalTemplate(slug: string): ProposalTemplate | undefined {
  return PROPOSAL_TEMPLATES[slug];
}

export const TEMPLATE_SLUGS = Object.keys(PROPOSAL_TEMPLATES);
```

- [ ] **Step 3: Verify lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 4: Run vitest suite end-to-end**

Run: `pnpm test`
Expected: all tests pass (existing + new template tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/proposals/ProposalWizard.tsx src/lib/proposal-templates.ts
git commit -m "feat(propose): wire template form + remove legacy markdown blobs"
```

---

## Task 10: Manual verification in dev server

**Files:** none

- [ ] **Step 1: Start dev server**

Run (in background): `pnpm dev`
Open browser to `http://localhost:3000/propose/templates`.

- [ ] **Step 2: Click each of the 6 template cards**

For each template, verify:

- Lands on `/propose?template=<slug>`.
- Title input is pre-filled with `defaultTitle`.
- Structured fields render (labels + helper text).
- Budget section shows "No budget lines yet" empty state + "Add line" button.
- No markdown textarea visible.
- Banner upload still works.

- [ ] **Step 3: Test validation on `athlete-sponsorship`**

- Click "Next: Add Transactions" with all fields empty → see inline errors under Profile, Budget, Timeline.
- Add a profile value, leave budget empty → only Budget + Timeline errors remain.
- Add a budget line with label + amount 0 → "Amount must be > 0" under amount field.
- Add amount > 0, fill Timeline → Next button proceeds to Transactions tab.

- [ ] **Step 4: Test step-3 preview**

- On Transactions tab, add any send-ETH tx to a test address.
- Click "Next: Preview & Submit".
- Confirm the rendered markdown in preview matches: `## Athlete Profile`, `## Budget Breakdown` with bullets + totals, `## Timeline & Milestones`. No empty sections.

- [ ] **Step 5: Test blank proposal path (no template)**

- Navigate to `/propose` (no query param).
- Confirm legacy markdown textarea renders with Edit/Preview toggle.
- Typing a description + title → Next advances.

- [ ] **Step 6: Test template switching behavior**

- From `/propose?template=athlete-sponsorship`, fill the profile field.
- Change URL to `/propose?template=event-activation`.
- Confirm: template form switches to event fields; profile value is discarded (not applicable to event schema); no crash.

- [ ] **Step 7: Stop dev server**

Kill the dev server process.

- [ ] **Step 8: Commit any small fixes found during verification**

If issues surfaced, fix them, re-run `pnpm lint` + `pnpm test`, then commit with a descriptive message. Otherwise proceed.

---

## Task 11: Lint + format + PR

**Files:** none

- [ ] **Step 1: Final lint + format**

Run: `pnpm lint && pnpm format:check`
Expected: no issues.

If format:check fails, run `pnpm format` and commit the changes:

```bash
git add -A && git commit -m "chore: format"
```

- [ ] **Step 2: Push branch**

```bash
git push -u origin feat/proposal-template-fields
```

- [ ] **Step 3: Open PR**

```bash
gh pr create --title "feat(propose): structured input fields for proposal templates" --body "$(cat <<'EOF'
## Summary
- Replace markdown-skeleton templates with labeled input fields per section.
- Budget becomes a structured repeater (label + amount + currency) with auto-totals.
- Values compile to the same markdown shape and land in `description` — onchain payload unchanged.

## Changes
- `src/lib/proposal-template-schemas.ts` — types, 6 template schemas, compiler, zod validator builder.
- `src/lib/proposal-templates.ts` — simplified metadata; re-exports schema titles.
- `src/components/proposals/schema.ts` — optional `templateFields` on proposal form.
- `src/components/proposals/TemplateDetailsForm.tsx` — structured fields host with nested useForm + imperative validate.
- `src/components/proposals/BudgetRepeater.tsx` — budget rows component.
- `src/components/proposals/ProposalDetailsHeader.tsx` — hoisted title+banner subform.
- `src/components/proposals/ProposalDetailsForm.tsx` — switches between template mode and legacy markdown.
- `src/components/proposals/ProposalWizard.tsx` — branches validation on template mode; drops markdown-blob pre-fill.

## Test plan
- [ ] `pnpm test` (vitest) — compiler + validator tests pass.
- [ ] Visit `/propose?template=<slug>` for each of 6 templates — fields render, title pre-fills.
- [ ] Required-field validation blocks advancing; inline errors surface.
- [ ] Budget repeater sums per currency; empty/invalid rows ignored in output.
- [ ] Step-3 preview renders compiled markdown identically to prior manual-markdown output.
- [ ] `/propose` (no template) still renders legacy textarea.

Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Report PR URL to user**

Copy the URL emitted by `gh pr create` and include it in the session summary.

---

## Self-review checklist

- [x] Spec coverage — every spec section maps to a task:
  - Architecture / file structure → Tasks 1–9
  - Template schemas → Tasks 1, 2
  - Validation → Task 3 (compiler); Tasks 7, 8, 9 (UI)
  - Data flow (compile on change) → Task 7
  - Edge cases (no template, unknown slug, switch slug) → Task 10
  - Migration (drop markdown blobs) → Task 9
  - Testing (compiler unit tests) → Tasks 1, 2, 3
- [x] No placeholders. Every code step has full code.
- [x] Type consistency: `TemplateFieldDef`, `TemplateSchema`, `BudgetRow`, `TemplateValues`, `TemplateDetailsFormHandle`, `ProposalDetailsFormHandle` — names match across tasks.
