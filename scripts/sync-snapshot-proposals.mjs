#!/usr/bin/env node
/**
 * Sync Snapshot Proposals
 *
 * Fetches all proposals from Snapshot.org GraphQL API for gnars.eth space
 * and saves to public/data/snapshot-proposals.json
 *
 * Usage:
 *   node scripts/sync-snapshot-proposals.mjs [--dry-run]
 *
 * API Docs: https://docs.snapshot.box/tools/api
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SNAPSHOT_HUB_URL = "https://hub.snapshot.org/graphql";
const GNARS_SPACE = "gnars.eth";
const OUTPUT_FILE = path.join(__dirname, "../public/data/snapshot-proposals.json");
const BACKUP_FILE = path.join(__dirname, "../public/data/snapshot-proposals.backup.json");

// Parse CLI args
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");

/**
 * Fetch proposals from Snapshot GraphQL API
 * Using pagination to get ALL proposals
 */
async function fetchAllProposals() {
  const proposals = [];
  let skip = 0;
  const first = 100; // Max per page
  let hasMore = true;

  console.log(`📡 Fetching proposals from Snapshot.org (space: ${GNARS_SPACE})...\n`);

  while (hasMore) {
    const query = `
      query Proposals {
        proposals(
          first: ${first},
          skip: ${skip},
          where: {
            space_in: ["${GNARS_SPACE}"]
          },
          orderBy: "created",
          orderDirection: desc
        ) {
          id
          ipfs
          space {
            id
            name
            avatar
            network
            admins
            moderators
            members
            symbol
            terms
          }
          type
          title
          body
          discussion
          author
          quorum
          quorumType
          start
          end
          snapshot
          choices
          scores
          scores_total
          scores_state
          state
          strategies {
            name
            params
            network
          }
          validation {
            name
            params
          }
          created
          updated
          votes
          privacy
          plugins
          flagged
        }
      }
    `;

    try {
      const response = await fetch(SNAPSHOT_HUB_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
      }

      const batch = data.data.proposals;
      proposals.push(...batch);

      console.log(
        `  ✅ Fetched ${batch.length} proposals (skip: ${skip}, total: ${proposals.length})`,
      );

      // Check if there are more proposals
      if (batch.length < first) {
        hasMore = false;
      } else {
        skip += first;
        // Rate limiting: wait 500ms between requests
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`\n❌ Failed to fetch proposals (skip: ${skip}):`, error.message);
      throw error;
    }
  }

  return proposals;
}

/**
 * Compare old vs new proposals
 */
function compareProposals(oldProposals, newProposals) {
  const oldIds = new Set(oldProposals.map((p) => p.id));
  const newIds = new Set(newProposals.map((p) => p.id));

  const added = newProposals.filter((p) => !oldIds.has(p.id));
  const removed = oldProposals.filter((p) => !newIds.has(p.id));
  const unchanged = newProposals.filter((p) => oldIds.has(p.id));

  return { added, removed, unchanged };
}

/**
 * Save proposals to JSON file
 */
function saveProposals(proposals) {
  if (DRY_RUN) {
    console.log("\n🔵 DRY RUN - Would save to:", OUTPUT_FILE);
    return;
  }

  // Backup existing file
  if (fs.existsSync(OUTPUT_FILE)) {
    fs.copyFileSync(OUTPUT_FILE, BACKUP_FILE);
    console.log(`  💾 Backup saved: ${path.basename(BACKUP_FILE)}`);
  }

  // Write new file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(proposals, null, 2), "utf8");
  console.log(`  ✅ Saved ${proposals.length} proposals to ${path.basename(OUTPUT_FILE)}`);
}

/**
 * Print summary
 */
function printSummary(oldProposals, newProposals, comparison) {
  console.log("\n" + "=".repeat(60));
  console.log("📊 Sync Summary");
  console.log("=".repeat(60));
  console.log(`Old proposals:     ${oldProposals.length}`);
  console.log(`New proposals:     ${newProposals.length}`);
  console.log(`Added:             ${comparison.added.length} ✨`);
  console.log(
    `Removed:           ${comparison.removed.length} ${comparison.removed.length > 0 ? "⚠️" : ""}`,
  );
  console.log(`Unchanged:         ${comparison.unchanged.length}`);
  console.log("=".repeat(60));

  if (comparison.added.length > 0) {
    console.log("\n✨ New proposals:");
    comparison.added.forEach((p) => {
      const date = new Date(p.created * 1000).toISOString().split("T")[0];
      console.log(`  - ${p.title} (${date})`);
    });
  }

  if (comparison.removed.length > 0) {
    console.log("\n⚠️  Removed proposals:");
    comparison.removed.forEach((p) => {
      console.log(`  - ${p.title}`);
    });
  }

  if (DRY_RUN) {
    console.log("\n🔵 DRY RUN - No changes written to disk");
  }
}

/**
 * Main
 */
async function main() {
  console.log("🚀 Snapshot Proposals Sync\n");

  if (DRY_RUN) {
    console.log("🔵 Running in DRY-RUN mode\n");
  }

  // Load existing proposals
  let oldProposals = [];
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      oldProposals = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf8"));
      console.log(`📂 Loaded ${oldProposals.length} existing proposals\n`);
    } catch (error) {
      console.warn("⚠️  Failed to load existing proposals:", error.message);
    }
  }

  // Fetch new proposals
  const newProposals = await fetchAllProposals();

  // Compare
  const comparison = compareProposals(oldProposals, newProposals);

  // Save
  if (!DRY_RUN && newProposals.length > 0) {
    console.log("\n📝 Saving proposals...");
    saveProposals(newProposals);
  }

  // Summary
  printSummary(oldProposals, newProposals, comparison);

  // Exit code
  if (comparison.removed.length > 0) {
    console.log("\n⚠️  WARNING: Some proposals were removed. Review changes before committing.");
    process.exit(1);
  }

  console.log("\n✅ Sync completed successfully!");
}

main().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
