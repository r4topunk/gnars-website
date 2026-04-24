import { z, type ZodType } from "zod";

export type TemplateFieldDef =
  | {
      id: string;
      label: string;
      helper: string;
      type: "textarea";
      rows?: number;
      required?: boolean;
      /** Concrete example shown as placeholder inside the textarea. */
      placeholder?: string;
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
        placeholder:
          "Ana Luiza, 22, surfer from Peniche, Portugal. @analuizasurfs on IG. This is a renewal of Prop #42 — stoked to shred another season with Gnars.",
      },
      {
        id: "content-plan",
        label: "Sport & Content Plan",
        type: "textarea",
        rows: 5,
        helper:
          "Video parts, clips, photo sets, posting cadence (e.g. 2x/week wearing Noggles), events/competitions, collabs with other Gnars shredders.",
        placeholder:
          "- 2 full video parts (one mid-season, one year-end)\n- Weekly IG Reels + TikToks wearing Noggles\n- WSL Rio Pro coverage in September\n- Collab edit with @othershredder",
      },
      {
        id: "reach",
        label: "Social Reach & Audience",
        type: "textarea",
        rows: 4,
        helper:
          "Current audience: follower counts per platform, engagement, past features, how this sponsorship expands Gnars visibility.",
        placeholder:
          "Instagram 12.4k / TikTok 3.2k / X 800 / Farcaster 450. Avg 8k views per reel. Featured in Surfer Magazine Aug 2025.",
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
        placeholder:
          "Oct 1 2026 – Mar 31 2027 (6 months). Monthly propdates with photo + clip drops. Mid-season video part by Jan 15.",
      },
      {
        id: "track-record",
        label: "Track Record & References",
        type: "textarea",
        rows: 4,
        helper:
          "Past work, competition results, past Gnars proposals (if renewal), community endorsements.",
        placeholder:
          "2nd place Billabong Pro 2025 (link). Gnars-sponsored rider since Prop #31. Endorsed by @teamcaptain on Farcaster.",
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
        placeholder:
          "Crypto + skate weekend during ETHRio. 3 days of sessions + panels at Cidade do Samba, bridging onchain builders with the local skate scene.",
      },
      {
        id: "logistics",
        label: "Location & Logistics",
        type: "textarea",
        rows: 4,
        helper:
          "Venue, city/country, dates, duration, attendance, travel/accommodation needs, permits.",
        placeholder:
          "Cidade do Samba, Rio de Janeiro. Apr 12–14 2026. ~200 attendees. Venue pre-booked. No permits required; private space.",
      },
      {
        id: "content-plan",
        label: "Content Capture Plan",
        type: "textarea",
        rows: 4,
        helper:
          "Photo/video coverage, who films/edits, deliverables, distribution channels, post-event timeline.",
        placeholder:
          "2 filmers + 1 photographer on site. Daily recap reels (same-day), 5-min final edit within 2 weeks. Distributed via Farcaster, IG, YouTube.",
      },
      {
        id: "budget",
        label: "Budget Breakdown",
        type: "budget",
        required: true,
        helper: "Venue, travel, equipment, content production, merch, marketing, contingency.",
      },
      {
        id: "marketing",
        label: "Marketing & Promotion",
        type: "textarea",
        rows: 4,
        helper:
          "Pre-event social, on-site branding (Noggles, merch, banners), partner cross-promotion, post-event recap.",
        placeholder:
          "4-week Farcaster + IG countdown. Noggles banners + merch on site. Cross-promo with ETHRio org. Post-event recap droposal.",
      },
      {
        id: "metrics",
        label: "Success Metrics",
        type: "textarea",
        rows: 4,
        required: true,
        helper:
          "Attendance, content views, new community members, press mentions, on-chain activity generated.",
        placeholder:
          "200 attendees, 50k combined video views, 10+ new token holders, coverage in at least 2 skate/crypto outlets.",
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
        placeholder:
          "Noggles Rail at Ibirapuera skatepark, São Paulo. First Gnars installation in Brazil, in one of the most-skated parks in LATAM.",
      },
      {
        id: "permits",
        label: "Location & Permits",
        type: "textarea",
        rows: 4,
        helper:
          "Exact location, public vs private land, permits/approvals, landowner/municipality contact, legal/liability notes.",
        placeholder:
          "Public park, managed by SP Parques & Urbanismo. Met with park director on Feb 10 — verbal approval, signed authorization letter pending.",
      },
      {
        id: "construction",
        label: "Materials & Construction",
        type: "textarea",
        rows: 5,
        helper:
          "Materials, dimensions, method, timeline, fabricator, Noggles branding integration (shape, color, placement).",
        placeholder:
          "6m steel round rail, 60mm diameter, powder-coated black. Noggles profile laser-cut into each end cap. Fabricator: Rampa X (São Paulo). 4-week build.",
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
        placeholder:
          "Free public access 24/7. Maintenance handled by local collective SP Sessions. Expected 5+ year lifespan. Adds a missing feature to the park.",
      },
      {
        id: "docs-plan",
        label: "Documentation Plan",
        type: "textarea",
        rows: 4,
        helper:
          "Build process photo/video, inauguration event, social content plan, related droposals.",
        placeholder:
          "Build time-lapse video. Opening session event + film crew. Commemorative droposal tied to the opening (separate prop).",
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
        placeholder:
          "20-minute documentary exploring surfing's role in São Tomé's coastal communities. Shot on 16mm to honor skate/surf film heritage.",
      },
      {
        id: "production",
        label: "Production Plan",
        type: "textarea",
        rows: 5,
        helper:
          "Format and length, creative team roles, equipment/software, locations, post-production workflow.",
        placeholder:
          "10-day shoot + 6-week post. Director Jane Doe, DP John Roe. RED Komodo + underwater housing. Edit in DaVinci Resolve, score original.",
      },
      {
        id: "distribution",
        label: "Distribution Strategy",
        type: "textarea",
        rows: 4,
        helper:
          "Primary platforms, release schedule, cross-promotion, festival/media partnerships, archival plan.",
        placeholder:
          "YouTube premiere + Zora drop same day. Festival submissions (SXSW, Hot Docs). Archived on Arweave. Cross-posted on Farcaster + X.",
      },
      {
        id: "licensing",
        label: "CC0 & Licensing",
        type: "textarea",
        rows: 4,
        helper:
          "CC0? If not, what rights does the DAO retain? Remix allowed? Third-party clearances (music, footage).",
        placeholder:
          "CC0. All footage original, score commissioned work-for-hire (rights assigned). No third-party clearances needed.",
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
        placeholder:
          "- Rough cut: Jan 20 2026\n- Social trailer: Feb 1\n- Final delivery: Feb 15\n- Propdates every 3 weeks with BTS + stills",
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
        placeholder:
          "Gnars Hub — a mobile app aggregating proposals, propdates, and the TV feed. For members who want to stay plugged in on the go.",
      },
      {
        id: "architecture",
        label: "Technical Architecture",
        type: "textarea",
        rows: 5,
        helper:
          "Stack, system architecture, integration with existing Gnars infra, external deps, smart contract changes.",
        placeholder:
          "Expo + React Native. Reuses gnars-website's /services layer via a shared package. Subgraph queries via @buildeross/sdk. No contract changes.",
      },
      {
        id: "open-source",
        label: "Open Source Strategy",
        type: "textarea",
        rows: 4,
        helper:
          "Open source? License? Repo link. Reusable by other DAOs? Contribution to Builder/Nouns/Base ecosystem.",
        placeholder:
          "MIT license. Repo at github.com/r4topunk/gnars-hub. Template reusable for any Builder DAO with minor config swaps.",
      },
      {
        id: "timeline",
        label: "Development Timeline",
        type: "textarea",
        rows: 4,
        required: true,
        helper:
          "Phases with scope + duration, key milestones, demo points, when users can test it.",
        placeholder:
          "- Phase 1 (4w): proposals + propdates feed\n- Phase 2 (3w): wallet integration + voting\n- Phase 3 (2w): push notifications\n- TestFlight beta end of Phase 2",
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
        placeholder:
          "3 months maintenance covered (bug fixes, minor updates). After that, a separate prop for ongoing support. Sentry for monitoring.",
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
        placeholder:
          '"First Rail" — a commemorative photo drop celebrating the opening of the Ibirapuera Noggles Rail (Prop #54). Captures the first session.',
      },
      {
        id: "artwork",
        label: "Artwork & Artist",
        type: "textarea",
        rows: 4,
        helper:
          "Artist name, background, portfolio. Style, medium, number of pieces, original vs derived.",
        placeholder:
          "5 photographs by Lucas Lima (@lukeslens). SP-based skate photographer, 10+ years shooting for Thrasher. All shot during the opening day.",
      },
      {
        id: "mint",
        label: "Mint Details",
        type: "textarea",
        rows: 5,
        required: true,
        helper:
          "Edition type (open or fixed), size, price, duration, chain (Base), royalty %, revenue split config.",
        placeholder:
          "- Open edition\n- 0.001 ETH per mint\n- 14-day window: Dec 1–15 2026\n- Chain: Base\n- 10% secondary royalty\n- Split: 50% artist / 40% treasury / 10% rail maintenance fund",
      },
      {
        id: "irl",
        label: "Connection to IRL",
        type: "textarea",
        rows: 4,
        helper:
          "Link to related proposal (event, installation, sponsorship). Photos/videos from the activation. Why this moment deserves commemoration.",
        placeholder:
          "Follows Prop #54 (Ibirapuera rail). Photos from the Nov 8 opening session — 80+ attendees, first Gnars rail in LATAM.",
      },
      {
        id: "revenue",
        label: "Revenue Split & Treasury Impact",
        type: "textarea",
        rows: 4,
        required: true,
        helper:
          "Revenue split percentages (artist, treasury, other), expected mint revenue, treasury benefit, secondary royalties.",
        placeholder:
          "Split: 50% artist / 40% treasury / 10% earmarked for rail maintenance fund. Conservative estimate: 80 mints = ~0.08 ETH, ~0.032 ETH to treasury.",
      },
      {
        id: "promotion",
        label: "Timeline & Promotion",
        type: "textarea",
        rows: 4,
        helper:
          "Drop date, pre-mint promo plan, allowlist vs open, post-mint community engagement (holders channel, utility).",
        placeholder:
          "Mint Dec 1–15 2026. Farcaster thread + IG story countdown starting Nov 24. Open mint (no allowlist). Post-mint: holders-only Telegram.",
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

const budgetRowSchema = z.object({
  label: z.string().min(1, "Label required"),
  amount: z.number().positive("Amount must be greater than 0"),
  currency: z.enum(["ETH", "USDC"]),
});

export function buildTemplateValidator(slug: string): ZodType<TemplateValues> {
  const schema = TEMPLATE_SCHEMAS[slug];
  if (!schema) return z.record(z.string(), z.unknown()) as unknown as ZodType<TemplateValues>;

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
  return z.object(shape).passthrough() as unknown as ZodType<TemplateValues>;
}
