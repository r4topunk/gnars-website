/**
 * Proposal templates for Gnars DAO.
 *
 * Each template provides a markdown skeleton that gets injected into the
 * description field of the ProposalWizard when the user navigates to
 * /propose?template=<slug>.
 *
 * Templates are derived from analysis of 77 executed Gnars proposals on Base.
 */

export interface ProposalTemplate {
  slug: string;
  title: string;
  /** Pre-filled proposal title (user edits freely) */
  defaultTitle: string;
  /** Markdown skeleton with placeholder guidance in each section */
  description: string;
}

export const PROPOSAL_TEMPLATES: Record<string, ProposalTemplate> = {
  "athlete-sponsorship": {
    slug: "athlete-sponsorship",
    title: "Athlete Sponsorship",
    defaultTitle: "[Athlete Name] — Gnars Sponsorship",
    description: `## Athlete Profile

<!-- Introduce the athlete. Include their name, sport (skate, surf, bodyboard, freeride, etc.), location, and social media links. If this is a renewal, reference the previous proposal. -->



## Sport & Content Plan

<!-- What will the athlete deliver during the sponsorship period? Be specific about:
- Number of video parts, clips, or photo sets
- Social media posting cadence (e.g., 2x/week wearing Noggles)
- Events or competitions they'll represent Gnars at
- Any collaborations with other Gnars shredders -->



## Social Reach & Audience

<!-- Share the athlete's current audience and reach:
- Social media follower counts (Instagram, TikTok, X, Farcaster, YouTube)
- Average engagement rates or view counts
- Notable past features, magazine covers, or media appearances
- How this sponsorship expands Gnars' visibility -->



## Budget Breakdown

<!-- Detail the funding request:
- Sponsorship fee (monthly or total)
- Equipment/gear costs
- Travel expenses (if applicable)
- Content production costs (filming, editing)
- Total amount requested in ETH -->



## Timeline & Milestones

<!-- Define the sponsorship period and key checkpoints:
- Start and end dates
- Monthly or quarterly deliverables
- Milestone payments (if applicable)
- How progress will be reported (propdates, social posts, etc.) -->



## Track Record & References

<!-- Why should the DAO fund this athlete?
- Links to previous work, video parts, competition results
- Past Gnars proposals (if renewal)
- References from other Gnars members or community endorsements
- Any existing relationship with the Nouns/Gnars ecosystem -->

`,
  },

  "event-activation": {
    slug: "event-activation",
    title: "Event & Activation",
    defaultTitle: "[Event Name] — Gnars Activation",
    description: `## Event Overview

<!-- Describe the event in one paragraph. What type of event is it? (crypto conference + skate session, standalone skate competition, hacker house, cultural activation, etc.)
Where and when will it take place? What makes it relevant for Gnars? -->



## Location & Logistics

<!-- Provide specific details:
- Venue name and city/country
- Dates and duration
- Expected attendance
- Travel and accommodation needs for Gnars participants
- Any permits or approvals required -->



## Content Capture Plan

<!-- How will the event be documented?
- Photo/video coverage plan
- Who handles filming and editing
- Deliverables: recap video, social clips, photo gallery
- Distribution channels (YouTube, Farcaster, X, etc.)
- Timeline for content delivery after the event -->



## Budget Breakdown

<!-- Detail all costs:
- Venue rental / event fees
- Travel and accommodation
- Equipment (ramps, rails, PA system, etc.)
- Content production (videographer, editor)
- Merchandise / swag
- Marketing and promotion
- Contingency fund
- Total amount requested in ETH -->



## Marketing & Promotion

<!-- How will you promote the event and Gnars' involvement?
- Pre-event social media campaign
- On-site branding (banners, Noggles, merch)
- Cross-promotion with partner organizations
- Post-event recap distribution -->



## Success Metrics

<!-- How will you measure impact?
- Attendance targets
- Content views / engagement targets
- New community members onboarded
- Media coverage or press mentions
- On-chain activity generated (new holders, votes, etc.) -->

`,
  },

  "physical-installation": {
    slug: "physical-installation",
    title: "Physical Installation",
    defaultTitle: "[Location] — Noggles Rail / Installation",
    description: `## Installation Overview

<!-- Describe what you're building and where. Is it a Noggles Rail, a ramp, a skate spot refurbishment, or other infrastructure? What makes this location meaningful for the Gnars community? -->



## Location & Permits

<!-- Provide specifics:
- Exact location (city, country, street/spot name)
- Is this on public or private land?
- What permits or approvals are needed?
- Has the landowner/municipality been contacted?
- Any legal or liability considerations -->



## Materials & Construction

<!-- Detail the build plan:
- Materials list (steel, concrete, wood, etc.)
- Dimensions and specifications
- Construction method and timeline
- Who does the fabrication/installation? (contractor, local builder, DIY)
- Noggles branding integration (shape, color, placement) -->



## Budget Breakdown

<!-- Detail all costs:
- Materials
- Fabrication / manufacturing
- Transportation and shipping
- Installation labor
- Permits and fees
- Signage and branding
- Contingency
- Total amount requested in ETH -->



## Community Access & Sustainability

<!-- How will the community benefit long-term?
- Is the installation publicly accessible?
- Who maintains it over time?
- Expected lifespan and durability
- How does it contribute to the local skate/action sports scene? -->



## Documentation Plan

<!-- How will the installation be documented and shared?
- Photo/video of the build process
- Inauguration event planned?
- Social media content plan
- Links to any related droposals or commemorative content -->

`,
  },

  "content-media": {
    slug: "content-media",
    title: "Content & Media",
    defaultTitle: "[Project Name] — Gnars Content Production",
    description: `## Creative Vision

<!-- Describe the content project. What are you making? (documentary, film, zine, podcast series, photo book, magazine feature, etc.) What story are you telling and how does it connect to Gnars culture? -->



## Production Plan

<!-- Detail the production approach:
- Format and length (e.g., 15-min documentary, 32-page zine, 10-episode series)
- Key creative team members and their roles
- Equipment and software needed
- Shooting locations and schedule
- Post-production workflow (editing, color grading, sound, etc.) -->



## Distribution Strategy

<!-- How will the content reach an audience?
- Primary platforms (YouTube, Zora, Paragraph, Farcaster, etc.)
- Release schedule (single drop vs. episodic)
- Cross-promotion with Gnars channels
- Festival submissions or media partnerships (if applicable)
- Archival plan (IPFS, Arweave, etc.) -->



## CC0 & Licensing

<!-- How will intellectual property be handled?
- Will the content be CC0?
- If not CC0, what usage rights does the DAO retain?
- Can community members remix, reshare, or build on it?
- Are there any third-party rights or clearances needed? (music, footage, etc.) -->



## Budget & Resources

<!-- Detail all costs:
- Pre-production (research, scripting, planning)
- Production (filming, travel, equipment rental)
- Post-production (editing, sound design, color, graphics)
- Distribution (platform fees, marketing)
- If recurring (e.g., Pod Media): cost per episode/period
- Total amount requested in ETH -->



## Deliverables & Timeline

<!-- What exactly will be delivered and when?
- List each deliverable with expected completion date
- Milestone checkpoints for longer projects
- How will progress be communicated? (propdates, drafts, rough cuts)
- Final delivery date -->

`,
  },

  development: {
    slug: "development",
    title: "Development & Tech",
    defaultTitle: "[Feature/Tool Name] — Gnars Development",
    description: `## Project Description

<!-- What are you building? Describe the software, tool, or infrastructure in plain language. What problem does it solve for the Gnars community? Who will use it? -->



## Technical Architecture

<!-- Explain the technical approach:
- Tech stack (frameworks, languages, services)
- System architecture (frontend, backend, smart contracts, etc.)
- How it integrates with existing Gnars infrastructure
- External dependencies or APIs
- Any smart contract changes or deployments required -->



## Open Source Strategy

<!-- How does this benefit the broader ecosystem?
- Will the code be open source? Under what license?
- Repository location (GitHub link if exists)
- Can other DAOs or communities reuse this?
- How does it build on or contribute to Builder DAO, Nouns, or Base ecosystem tooling? -->



## Development Timeline

<!-- Break down the work into phases:
- Phase 1: [Scope] — [Estimated duration]
- Phase 2: [Scope] — [Estimated duration]
- Phase 3: [Scope] — [Estimated duration]
- Key milestones and demo points
- When will users be able to test it? -->



## Budget & Resources

<!-- Detail all costs:
- Developer compensation (rate x hours, or fixed per milestone)
- Infrastructure costs (hosting, RPC, APIs, domains)
- Audit costs (if smart contracts involved)
- Design/UX costs (if applicable)
- Total amount requested in ETH -->



## Post-Launch Support

<!-- What happens after launch?
- Maintenance plan (bug fixes, updates)
- Who maintains it long-term?
- Monitoring and observability plan
- Community feedback and iteration process
- Is future funding needed for ongoing maintenance? -->

`,
  },

  droposal: {
    slug: "droposal",
    title: "Droposal / NFT Drop",
    defaultTitle: "[Collection Name] — Gnars Droposal",
    description: `## Drop Concept

<!-- Describe the NFT collection. What's the concept? What story or moment does it commemorate? How does it connect to Gnars culture or a specific IRL activation? -->



## Artwork & Artist

<!-- Detail the creative side:
- Who created the artwork? (artist name, background, portfolio links)
- Art style and medium (photography, illustration, generative, mixed media)
- Number of unique pieces or editions
- Is the artwork original or derived from existing content? -->



## Mint Details

<!-- Specify the collection parameters:
- Edition type: Open edition or fixed supply?
- Edition size (if fixed)
- Mint price
- Mint duration (start and end dates)
- Chain: Base
- Royalty percentage and recipient
- Revenue split configuration (DAO treasury %, artist %, other) -->



## Connection to IRL

<!-- How does this drop connect to a real-world event or activation?
- Link to related proposal (if this follows an event, installation, or sponsorship)
- Photos, videos, or documentation from the IRL activation
- Why this moment deserves an on-chain commemoration -->



## Revenue Split & Treasury Impact

<!-- How will funds flow?
- Revenue split breakdown (percentages to artist, treasury, other)
- Expected mint revenue (conservative estimate)
- How does this benefit the Gnars treasury?
- Any secondary royalty arrangements -->



## Timeline & Promotion

<!-- When and how will the drop happen?
- Drop date
- Pre-mint promotion plan (social media, Farcaster, Discord)
- Allowlist or open mint?
- Post-mint community engagement (holders channel, utility, etc.) -->

`,
  },
};

/**
 * Get a template by slug, or undefined if not found.
 */
export function getProposalTemplate(slug: string): ProposalTemplate | undefined {
  return PROPOSAL_TEMPLATES[slug];
}

/**
 * All available template slugs.
 */
export const TEMPLATE_SLUGS = Object.keys(PROPOSAL_TEMPLATES);
