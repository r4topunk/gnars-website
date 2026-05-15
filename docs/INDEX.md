# Documentation Index

This is the canonical entry point for project documentation. Everything below should reflect the current codebase.

## Start Here

- `README.md` — project overview, setup, and architecture snapshot
- `docs/architecture/exploration-progress.md` — route and codebase inventory (keep current)

## Architecture

- `docs/architecture/thirdweb-wallet-layer.md` — provider tree, reads/writes split, view-mode toggle (EOA/SA), AA config, known escape hatches
- `docs/architecture/exploration-progress.md`
- `docs/architecture/refactor-audit.md`
- `docs/i18n/tone-brief.md` — PT-BR translation tone brief

## Features

- `docs/features/tv.md` — Gnars TV data flow, UX, and mini-app integration
- `docs/features/tv-infinite-menu.md` — 3D sphere menu integration details
- `docs/features/feed.md` — live feed components and integration notes
- `docs/features/coin-proposal.md` — coin proposal wizard
- `docs/features/buy-coin-transaction.md` — proposal transaction type for buy-coin

## Integrations

- `docs/integrations/pinata.md` — IPFS upload integration
- `docs/integrations/splits.md` — 0xSplits droposal revenue sharing
- `docs/integrations/swap.md` — 0x Swap API v2 integration powering /swap, including affiliate-fee config

## Specs

- `docs/superpowers/specs/2026-03-16-vote-card-delegation-breakdown-design.md` — vote card own vs delegated breakdown
- `docs/superpowers/specs/2026-04-24-proposal-template-fields-design.md` — structured input fields per proposal template (replaces markdown skeleton)
- `docs/superpowers/specs/2026-05-11-i18n-en-ptbr-design.md` — i18n EN + PT-BR design

## Research

- `docs/research/agent-team-candidates.md` — top 4 multi-agent task candidates with file lists and agent splits
- `docs/research/seo-metadata-audit.md` — full audit of metadata and OG image coverage across all pages; includes priority list for missing items
- `docs/research/build-bundle-audit.md` — deep audit of next.config, tsconfig, dependencies, Client/Server boundaries, image optimization, and bundle splitting; ranked recommendations
- `docs/research/propdates-audit.md` — DONE/PARTIAL/MISSING audit of propdates feature against Trello card requirements (Phase 1 + Phase 2)
- `docs/research/gnars-tv-audit.md` — comprehensive audit of the TV feed: data flow, Zora SDK calls, creator qualification gates, hardcoded addresses, sorting algorithm, and why specific profiles may not appear
- `docs/research/gnars-tv-network-audit.md` — network-focused audit: all 14 data sources, fetch frequency, caching layers (CDN/Next.js/LRU/client), request waterfall, data volume estimates, error handling, SSR vs CSR split, and 7 identified performance issues with recommendations
- `docs/research/passed-proposals-categorized.md` — all 77 executed proposals categorized into 8 types (athlete sponsorship, events, physical installations, content/media, dev/tech, droposals, travel, partnerships); includes patterns and geographic breakdown

## References (External/Vendor)

- `references/zora_coin_context.md`
- `references/nouns-builder/README.md`
