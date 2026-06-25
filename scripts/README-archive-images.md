# Gnars Archive Image Migration

Migrates the historical blog archive's broken local image references
(`/images/<name>`) to IPFS, pinned via Pinata, served through the
`ipfs.skatehive.app` gateway.

## Why

The 56 posts in `src/content/blog/` were imported from the legacy Jekyll site
`gnars-dao/gnarsdotcom`, but their images were never copied into this repo — so
every historical post renders broken images. The image files still live in the
`gnars-dao/gnarsdotcom` repo under `images/`. This script pulls them, pins them
to IPFS, and rewrites the markdown references.

## What it does

1. Scans `src/content/blog/*.md` for `/images/<name>` references (frontmatter + inline).
2. Downloads each from `gnars-dao/gnarsdotcom` (via `gh api` raw bytes).
3. Uploads to Pinata (`uploads.pinata.cloud/v3/files`, `network=public`) with
   standardized metadata (see below).
4. Writes a manifest at `scripts/data/archive-image-cids.json`
   (`originalName → { cid, gatewayUrl, … }`), updated incrementally so a crash
   never re-pins.
5. Rewrites the posts, replacing `/images/<name>` with the gateway URL.

## Prerequisites

- `gh` CLI authenticated (read access to the public `gnars-dao/gnarsdotcom`).
- `PINATA_JWT` in `.env.local` (already present for the app) **or** exported in the env.

## Usage

```bash
# 1. Validate: downloads every source image, no upload, no writes
node scripts/migrate-archive-images.mjs --dry-run

# 2. Execute: upload to Pinata + rewrite posts
node scripts/migrate-archive-images.mjs

# Re-apply the manifest to posts without re-uploading (e.g. after a revert)
node scripts/migrate-archive-images.mjs --rewrite-only
```

The run is idempotent: images already in the manifest are skipped, so re-running
after a partial failure only handles what's left.

## Pinata metadata standard

Every pinned file carries:

| field          | value                              |
| -------------- | ---------------------------------- |
| `name`         | `gnars-archive/<originalFilename>` |
| `source`       | `gnars-archive`                    |
| `origin`       | `gnarsdotcom`                      |
| `originalPath` | `/images/<originalFilename>`       |

This keeps archive assets queryable/groupable in Pinata and traceable back to
the legacy source. The same `source`/`origin` keyvalue convention is what the
future curation pipeline (Google Drive → Pinata) should follow — see
`docs/features/blog-archive.md`.

## Notes

- Network-restricted environments (e.g. CI sandboxes) may reach `gh`/api.github.com
  but not `raw.githubusercontent.com` or `uploads.pinata.cloud`. Download falls
  back through `gh api`; the **upload step must run where Pinata is reachable**.
- The 4 newest posts (2023–24) already use IPFS URLs and are left untouched.
