import { z, type ZodType } from "zod";

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
        helper: "Materials, fabrication, transport, labor, permits, signage, contingency.",
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
  const valid = rows.filter(
    (r) => isBudgetRow(r) && r.label.trim().length > 0 && r.amount > 0,
  );
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
