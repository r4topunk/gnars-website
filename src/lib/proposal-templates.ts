/**
 * Proposal templates for Gnars DAO.
 *
 * Metadata for the templates listed on /propose/templates. When the user
 * clicks a template, ProposalWizard pre-fills `title` with defaultTitle and
 * renders TemplateDetailsForm, which uses the per-template field schema in
 * `proposal-template-schemas.ts` to generate structured inputs.
 *
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
