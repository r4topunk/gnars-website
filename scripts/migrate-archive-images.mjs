#!/usr/bin/env node
/**
 * Migrate Gnars Archive (blog) images to IPFS/Pinata.
 *
 * The 56 historical posts in `src/content/blog/` reference images via local
 * `/images/<name>` paths that never existed in this repo — they live in the
 * legacy Jekyll source `gnars-dao/gnarsdotcom`. This script:
 *
 *   1. Scans every `.md` for `/images/<name>` references (frontmatter + inline).
 *   2. Downloads each referenced image from the gnarsdotcom repo.
 *   3. Uploads it to Pinata (public network) following the project's IPFS
 *      conventions (Pinata v3 /files, skatehive gateway).
 *   4. Records original-name -> CID in a manifest (idempotent re-runs).
 *   5. Rewrites the `.md` files, replacing `/images/<name>` with the
 *      skatehive gateway URL.
 *
 * Usage:
 *   node scripts/migrate-archive-images.mjs --dry-run   # download-check only, no upload/write
 *   node scripts/migrate-archive-images.mjs             # upload + rewrite
 *   node scripts/migrate-archive-images.mjs --rewrite-only  # rewrite .md from existing manifest
 *
 * Env:
 *   PINATA_JWT  (required unless --dry-run / --rewrite-only) — loaded from .env.local
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BLOG_DIR = path.join(__dirname, "../src/content/blog");
const MANIFEST_FILE = path.join(__dirname, "data/archive-image-cids.json");
const SOURCE_REPO = "gnars-dao/gnarsdotcom";
const GATEWAY = "https://ipfs.skatehive.app/ipfs/";
const PINATA_UPLOAD_URL = "https://uploads.pinata.cloud/v3/files";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const REWRITE_ONLY = args.includes("--rewrite-only");

const IMAGE_REF_RE = /\/images\/[A-Za-z0-9._@()%-]+\.(?:jpe?g|png|gif|webp|svg)/gi;

const stats = {
  referenced: 0,
  downloaded: 0,
  uploaded: 0,
  skipped: 0,
  failed: 0,
  filesRewritten: 0,
};

/** Load PINATA_JWT from process.env or .env.local (no dotenv dep). */
function loadPinataJwt() {
  if (process.env.PINATA_JWT) return process.env.PINATA_JWT;
  const envPath = path.join(__dirname, "../.env.local");
  if (!fs.existsSync(envPath)) return null;
  const line = fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith("PINATA_JWT="));
  if (!line) return null;
  return line
    .slice("PINATA_JWT=".length)
    .trim()
    .replace(/^["']|["']$/g, "");
}

function readManifest() {
  if (!fs.existsSync(MANIFEST_FILE)) return {};
  return JSON.parse(fs.readFileSync(MANIFEST_FILE, "utf8").replace(/^﻿/, ""));
}

function writeManifest(manifest) {
  fs.mkdirSync(path.dirname(MANIFEST_FILE), { recursive: true });
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

/** Collect every distinct `/images/<name>` reference across all posts. */
function collectReferences() {
  const names = new Set();
  for (const file of fs.readdirSync(BLOG_DIR)) {
    if (!file.endsWith(".md")) continue;
    const content = fs.readFileSync(path.join(BLOG_DIR, file), "utf8");
    for (const match of content.matchAll(IMAGE_REF_RE)) {
      names.add(match[0].replace(/^\/images\//, ""));
    }
  }
  return [...names].sort();
}

/** Build name -> raw download_url map from the gnarsdotcom repo via gh API. */
async function fetchSourceIndex() {
  const { execFileSync } = await import("child_process");
  const raw = execFileSync("gh", ["api", `repos/${SOURCE_REPO}/contents/images`, "--paginate"], {
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  });
  // --paginate concatenates JSON arrays; normalize to a single array.
  const items = JSON.parse(`[${raw.replace(/\]\s*\[/g, ",")}]`).flat();
  const index = {};
  for (const item of items) {
    if (item.type === "file") index[item.name] = item.download_url;
  }
  return index;
}

const MIME_BY_EXT = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
};

/**
 * Download a source image. Uses `gh api` raw bytes (routes via api.github.com),
 * which works in restricted environments where raw.githubusercontent.com is
 * unreachable. Falls back to a plain fetch if `gh` is unavailable.
 */
async function downloadImage(name) {
  const ext = name.split(".").pop().toLowerCase();
  const type = MIME_BY_EXT[ext] || "application/octet-stream";
  try {
    const { execFileSync } = await import("child_process");
    const buffer = execFileSync(
      "gh",
      [
        "api",
        `repos/${SOURCE_REPO}/contents/images/${name}`,
        "-H",
        "Accept: application/vnd.github.raw",
      ],
      { encoding: "buffer", maxBuffer: 64 * 1024 * 1024 },
    );
    return { buffer, type };
  } catch {
    const res = await fetch(
      `https://raw.githubusercontent.com/${SOURCE_REPO}/main/images/${name}`,
      { signal: AbortSignal.timeout(30000) },
    );
    if (!res.ok) throw new Error(`download ${res.status}`);
    return { buffer: Buffer.from(await res.arrayBuffer()), type };
  }
}

async function uploadToPinata(jwt, name, buffer, type) {
  const form = new FormData();
  form.append("file", new Blob([buffer], { type }), name);
  form.append("network", "public");
  form.append("name", `gnars-archive/${name}`);
  form.append(
    "keyvalues",
    JSON.stringify({
      source: "gnars-archive",
      origin: "gnarsdotcom",
      originalPath: `/images/${name}`,
    }),
  );

  const res = await fetch(PINATA_UPLOAD_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
  });
  if (!res.ok) throw new Error(`pinata ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const cid = json?.data?.cid;
  if (!cid) throw new Error("no cid in pinata response");
  return { cid, id: json.data.id, size: json.data.size };
}

/** Replace every `/images/<name>` with its gateway URL across all posts. */
function rewritePosts(manifest) {
  // Longest names first so no token is a prefix of another.
  const entries = Object.entries(manifest).sort((a, b) => b[0].length - a[0].length);
  for (const file of fs.readdirSync(BLOG_DIR)) {
    if (!file.endsWith(".md")) continue;
    const filePath = path.join(BLOG_DIR, file);
    let content = fs.readFileSync(filePath, "utf8");
    const before = content;
    for (const [name, info] of entries) {
      content = content.split(`/images/${name}`).join(`${GATEWAY}${info.cid}`);
    }
    if (content !== before) {
      if (!DRY_RUN) fs.writeFileSync(filePath, content, "utf8");
      stats.filesRewritten++;
      console.log(`  ✏️  ${file}`);
    }
  }
}

async function main() {
  console.log(`🚀 Gnars archive image migration${DRY_RUN ? " (dry-run)" : ""}\n`);
  const manifest = readManifest();

  if (REWRITE_ONLY) {
    console.log("📝 Rewrite-only: applying existing manifest to posts...");
    rewritePosts(manifest);
    console.log(`\n✅ Rewrote ${stats.filesRewritten} files from manifest.`);
    return;
  }

  const refs = collectReferences();
  stats.referenced = refs.length;
  console.log(`🔎 ${refs.length} distinct /images/* references in posts.\n`);

  const jwt = loadPinataJwt();
  if (!DRY_RUN && !jwt) {
    console.error("❌ PINATA_JWT not found (env or .env.local). Aborting.");
    process.exit(1);
  }

  console.log("📥 Indexing source images from gnars-dao/gnarsdotcom...");
  const sourceIndex = await fetchSourceIndex();
  console.log(`   ${Object.keys(sourceIndex).length} files in source repo.\n`);

  const missingSource = refs.filter((n) => !sourceIndex[n]);
  if (missingSource.length) {
    console.warn(`⚠️  ${missingSource.length} referenced images NOT found in source repo:`);
    missingSource.forEach((n) => console.warn(`     - ${n}`));
    console.warn("");
  }

  for (let i = 0; i < refs.length; i++) {
    const name = refs[i];
    const tag = `[${i + 1}/${refs.length}]`;
    if (manifest[name]?.cid) {
      stats.skipped++;
      console.log(`${tag} ⏭️  ${name} (already pinned ${manifest[name].cid.slice(0, 10)}…)`);
      continue;
    }
    if (!sourceIndex[name]) {
      stats.failed++;
      console.log(`${tag} ❌ ${name} — no source`);
      continue;
    }
    try {
      const { buffer, type } = await downloadImage(name);
      stats.downloaded++;
      if (DRY_RUN) {
        console.log(`${tag} 🔵 ${name} — would upload (${(buffer.length / 1024).toFixed(0)} KB)`);
        continue;
      }
      const { cid, id, size } = await uploadToPinata(jwt, name, buffer, type);
      manifest[name] = {
        cid,
        id,
        size,
        gatewayUrl: `${GATEWAY}${cid}`,
        pinnedAt: new Date().toISOString(),
      };
      writeManifest(manifest); // persist incrementally so a crash never re-pins
      stats.uploaded++;
      console.log(`${tag} ✅ ${name} → ${cid}`);
      await new Promise((r) => setTimeout(r, 120)); // gentle rate limit
    } catch (err) {
      stats.failed++;
      console.log(`${tag} ❌ ${name} — ${err.message}`);
    }
  }

  if (!DRY_RUN && stats.failed === 0) {
    console.log("\n📝 Rewriting posts with gateway URLs...");
    rewritePosts(manifest);
  } else if (!DRY_RUN) {
    console.log("\n⚠️  Skipping rewrite — some images failed. Fix, re-run, then --rewrite-only.");
  }

  console.log("\n" + "=".repeat(48));
  console.log("📊 Summary");
  console.log(`  Referenced:     ${stats.referenced}`);
  console.log(`  Downloaded:     ${stats.downloaded}`);
  console.log(`  Uploaded:       ${stats.uploaded}`);
  console.log(`  Already pinned: ${stats.skipped}`);
  console.log(`  Failed:         ${stats.failed}`);
  console.log(`  Files rewritten:${stats.filesRewritten}`);
  console.log("=".repeat(48));
  if (DRY_RUN) console.log("\n🔵 DRY RUN — no uploads, no writes.");
  if (stats.failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("\n❌ Fatal:", err);
  process.exit(1);
});
