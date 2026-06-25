# Blog Archive (Historical Posts)

The archive preserves 56 historical posts imported from the legacy Jekyll site
`gnars-dao/gnarsdotcom`, primarily for SEO (fixing 404s from old URLs and keeping
high-quality content indexed). It is **distinct** from the live `/blogs` system,
which pulls from the Paragraph API (`src/services/blogs.ts`).

## How it works

| Concern   | Location                                                              |
| --------- | --------------------------------------------------------------------- |
| Content   | `src/content/blog/*.md` (frontmatter + markdown body)                 |
| Loader    | `src/lib/posts.ts` (`getPostMetadata`, `getPostBySlug`)               |
| Route     | `src/app/[locale]/[slug]/page.tsx` (root-level `/<slug>`)             |
| Redirects | `next.config.ts` → `generateBlogRedirects()` (trailing-slash cleanup) |
| Sitemap   | `src/app/sitemap.xml/route.ts` (markdown post entries)                |

Posts resolve at the locale root (`/<slug>`, e.g. `/sub-dao-culture`). They are
**not linked in navigation** by design — discoverable via sitemap/search only.
Posts dated before 2023 show a "historical content" notice banner.

## Image migration (IPFS/Pinata)

The imported posts referenced images via local `/images/<name>` paths that were
never copied into this repo, so every post rendered broken media. The source
images live in `gnars-dao/gnarsdotcom/images`. They were migrated to IPFS and
pinned via Pinata (gateway `ipfs.skatehive.app`), and the markdown references
rewritten to gateway URLs.

- Script: `scripts/migrate-archive-images.mjs` (see `scripts/README-archive-images.md`)
- Manifest: `scripts/data/archive-image-cids.json` (`originalName → CID`, audit trail)
- Pinata metadata standard: `name = gnars-archive/<file>`, keyvalues
  `{ source: "gnars-archive", origin: "gnarsdotcom", originalPath }`.

The 4 newest posts (2023–24) already used IPFS URLs and were left untouched.

## Future curation pipeline (Google Drive → IPFS) — proposal

Goal: let non-developers curate archive/media content without committing to the
repo, while keeping IPFS as the source of truth for assets.

### Proposed shared Drive structure

```
Gnars Archive/                      ← shared internal folder
├── _inbox/                         ← raw drops awaiting curation
├── posts/
│   └── <year>/<post-slug>/
│       ├── cover.<ext>             ← becomes frontmatter `image`
│       ├── 01-<descriptor>.<ext>   ← inline images, ordered
│       └── post.md                 ← optional draft body/frontmatter
└── _published/                     ← moved here once live on the site
```

Naming rules: lowercase kebab-case; `cover.*` reserved for the hero; inline
images numbered for stable ordering; one folder per post keyed by its slug.

### Pinata metadata standard (shared with the migration script)

Each asset pinned with keyvalues:

| field          | value                                        |
| -------------- | -------------------------------------------- |
| `source`       | `gnars-archive`                              |
| `origin`       | `google-drive` (or `gnarsdotcom` for legacy) |
| `postSlug`     | `<post-slug>`                                |
| `role`         | `cover` \| `inline`                          |
| `originalPath` | Drive-relative path                          |

### Sync flow (to be implemented when curation starts)

1. Curators organize a post folder in the shared Drive per the structure above.
2. A sync step exports the folder, pins each asset to Pinata with the metadata
   above, and emits/updates the post's `.md` (frontmatter `image` + inline
   gateway URLs) in `src/content/blog/`.
3. PR review publishes the post.

This generalizes `scripts/migrate-archive-images.mjs` (which already implements
steps 2–3 for the gnarsdotcom source) to a Google Drive source.

> Status: proposal. The migration script (legacy source) is implemented; the
> Drive export/sync step is not yet built.
