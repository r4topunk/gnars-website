#!/usr/bin/env node
/**
 * Migrate Snapshot Proposal IPFS Images
 *
 * Extracts all IPFS CIDs from snapshot proposals and:
 * 1. Tests if they're accessible on snapshot.box gateway
 * 2. Pins them to SkateHive IPFS (via Pinata API)
 * 3. Updates snapshot-proposals.json to use skatehive.app gateway
 *
 * Usage:
 *   node scripts/migrate-snapshot-ipfs-images.mjs [--dry-run] [--force-pin]
 *
 * Env vars:
 *   PINATA_JWT - Pinata API JWT token (required for pinning)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SNAPSHOT_GATEWAY = "https://ipfs.snapshot.box/ipfs/";
const SKATEHIVE_GATEWAY = "https://ipfs.skatehive.app/ipfs/";
const PROPOSALS_FILE = path.join(__dirname, "../public/data/snapshot-proposals.json");

// Parse CLI args
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FORCE_PIN = args.includes("--force-pin");

// Stats
let stats = {
  totalCIDs: 0,
  accessible: 0,
  inaccessible: 0,
  pinned: 0,
  failed: 0,
  skipped: 0,
};

/**
 * Extract all unique IPFS CIDs from snapshot proposals
 */
function extractCIDs() {
  console.log("📖 Reading snapshot proposals...");
  const data = JSON.parse(fs.readFileSync(PROPOSALS_FILE, "utf8"));

  const cidSet = new Set();
  data.forEach((proposal) => {
    if (!proposal.body) return;

    // Match ipfs://CID patterns
    const matches = proposal.body.matchAll(/ipfs:\/\/([a-zA-Z0-9]+)/g);
    for (const match of matches) {
      cidSet.add(match[1]);
    }
  });

  stats.totalCIDs = cidSet.size;
  console.log(`✅ Found ${stats.totalCIDs} unique CIDs\n`);

  return Array.from(cidSet);
}

/**
 * Test if CID is accessible on a gateway
 */
async function testCID(cid, gateway) {
  try {
    const response = await fetch(`${gateway}${cid}`, {
      method: "HEAD",
      signal: AbortSignal.timeout(10000), // 10s timeout
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Pin CID to SkateHive IPFS via Pinata
 */
async function pinToSkateHive(cid) {
  const PINATA_JWT = process.env.PINATA_JWT;

  if (!PINATA_JWT) {
    console.error("❌ PINATA_JWT env var not set. Cannot pin.");
    return false;
  }

  try {
    const response = await fetch("https://api.pinata.cloud/pinning/pinByHash", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        hashToPin: cid,
        pinataMetadata: {
          name: `snapshot-proposal-${cid.substring(0, 12)}`,
          keyvalues: {
            source: "snapshot-proposals-migration",
            gateway: "skatehive",
          },
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`  ❌ Pinata error: ${error}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`  ❌ Pin failed: ${error.message}`);
    return false;
  }
}

/**
 * Process all CIDs
 */
async function processCIDs(cids) {
  console.log("🔍 Testing CID accessibility...\n");

  const results = [];

  for (let i = 0; i < cids.length; i++) {
    const cid = cids[i];
    const progress = `[${i + 1}/${cids.length}]`;

    process.stdout.write(`${progress} ${cid.substring(0, 12)}... `);

    // Test Snapshot gateway
    const snapshotOk = await testCID(cid, SNAPSHOT_GATEWAY);

    if (snapshotOk) {
      stats.accessible++;

      // Test SkateHive gateway
      const skatehiveOk = await testCID(cid, SKATEHIVE_GATEWAY);

      if (skatehiveOk && !FORCE_PIN) {
        console.log("✅ Already on SkateHive");
        stats.skipped++;
        results.push({ cid, status: "exists" });
      } else {
        // Need to pin
        if (DRY_RUN) {
          console.log("🔵 Would pin to SkateHive (dry-run)");
          stats.skipped++;
          results.push({ cid, status: "would-pin" });
        } else {
          console.log("📌 Pinning to SkateHive...");
          const pinned = await pinToSkateHive(cid);

          if (pinned) {
            stats.pinned++;
            results.push({ cid, status: "pinned" });
            console.log("  ✅ Pinned successfully");
          } else {
            stats.failed++;
            results.push({ cid, status: "pin-failed" });
          }
        }
      }
    } else {
      console.log("❌ Not accessible on Snapshot gateway");
      stats.inaccessible++;
      results.push({ cid, status: "inaccessible" });
    }

    // Rate limiting: wait 100ms between requests
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return results;
}

/**
 * Update snapshot-proposals.json to use SkateHive gateway
 */
function updateProposalsFile(results) {
  if (DRY_RUN) {
    console.log("\n🔵 Dry-run mode: Would update proposals file");
    return;
  }

  const pinnedCIDs = new Set(
    results.filter((r) => r.status === "pinned" || r.status === "exists").map((r) => r.cid),
  );

  if (pinnedCIDs.size === 0) {
    console.log("\n⏭️  No CIDs to update in proposals file");
    return;
  }

  console.log(`\n📝 Updating proposals file (${pinnedCIDs.size} CIDs)...`);

  const data = JSON.parse(fs.readFileSync(PROPOSALS_FILE, "utf8"));
  let updated = 0;

  data.forEach((proposal) => {
    if (!proposal.body) return;

    const originalBody = proposal.body;

    // Replace ipfs://CID with https://ipfs.skatehive.app/ipfs/CID
    // Only for CIDs that were successfully pinned
    proposal.body = proposal.body.replace(/ipfs:\/\/([a-zA-Z0-9]+)/g, (match, cid) => {
      if (pinnedCIDs.has(cid)) {
        return `${SKATEHIVE_GATEWAY}${cid}`;
      }
      return match; // Keep original if not pinned
    });

    if (proposal.body !== originalBody) {
      updated++;
    }
  });

  // Backup original file
  const backupFile = PROPOSALS_FILE.replace(".json", ".backup.json");
  fs.copyFileSync(PROPOSALS_FILE, backupFile);
  console.log(`  💾 Backup saved: ${path.basename(backupFile)}`);

  // Write updated file
  fs.writeFileSync(PROPOSALS_FILE, JSON.stringify(data, null, 2), "utf8");
  console.log(`  ✅ Updated ${updated} proposals`);
}

/**
 * Print summary
 */
function printSummary() {
  console.log("\n" + "=".repeat(50));
  console.log("📊 Migration Summary");
  console.log("=".repeat(50));
  console.log(`Total CIDs:           ${stats.totalCIDs}`);
  console.log(`Accessible:           ${stats.accessible} ✅`);
  console.log(`Inaccessible:         ${stats.inaccessible} ❌`);
  console.log(`Pinned to SkateHive:  ${stats.pinned} 📌`);
  console.log(`Already on SkateHive: ${stats.skipped} ⏭️`);
  console.log(`Failed to pin:        ${stats.failed} ⚠️`);
  console.log("=".repeat(50));

  if (DRY_RUN) {
    console.log("\n🔵 DRY RUN - No changes made");
    console.log("Run without --dry-run to execute migration");
  }
}

/**
 * Main
 */
async function main() {
  console.log("🚀 Snapshot IPFS Image Migration\n");

  if (DRY_RUN) {
    console.log("🔵 Running in DRY-RUN mode (no changes will be made)\n");
  }

  if (!process.env.PINATA_JWT && !DRY_RUN) {
    console.error("❌ PINATA_JWT environment variable required");
    console.error("   Get your JWT from: https://app.pinata.cloud/developers/api-keys");
    process.exit(1);
  }

  const cids = extractCIDs();
  const results = await processCIDs(cids);
  updateProposalsFile(results);
  printSummary();

  // Exit with error if any inaccessible or failed
  if (stats.inaccessible > 0 || stats.failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
