#!/usr/bin/env node
/**
 * Fetch all historical proposals (Ethereum + Snapshot) and save as static JSON
 * Run once to populate data/ directory
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Endpoints
const ETH_SUBGRAPH = "https://api.studio.thegraph.com/query/84885/gnars-mainnet/v1.0.0";
const SNAPSHOT_GRAPHQL = "https://hub.snapshot.org/graphql";
const SNAPSHOT_SPACE = "gnars.eth";

// Ethereum proposals query (legacy Gnars subgraph schema)
const ETH_QUERY = `
  query AllProposals($first: Int!, $skip: Int!) {
    proposals(
      first: $first
      skip: $skip
      orderBy: createdTimestamp
      orderDirection: desc
    ) {
      id
      title
      description
      status
      proposer { id }
      forVotes
      againstVotes
      abstainVotes
      quorumVotes
      createdTimestamp
      startBlock
      endBlock
      executionETA
    }
  }
`;

// Snapshot proposals query
const SNAPSHOT_QUERY = `
  query SnapshotProposals($space: String!, $first: Int!, $skip: Int!) {
    proposals(
      first: $first
      skip: $skip
      where: { space: $space }
      orderBy: "created"
      orderDirection: desc
    ) {
      id
      title
      body
      choices
      start
      end
      snapshot
      state
      space { id name }
      author
      scores
      scores_total
      votes
      created
    }
  }
`;

async function fetchAllEthProposals() {
  console.log("🔍 Fetching Ethereum mainnet proposals...");
  
  let allProposals = [];
  let skip = 0;
  const batchSize = 100;
  
  while (true) {
    const response = await fetch(ETH_SUBGRAPH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: ETH_QUERY,
        variables: { first: batchSize, skip },
      }),
    });

    const { data } = await response.json();
    const batch = data?.proposals ?? [];
    
    if (batch.length === 0) break;
    
    allProposals = allProposals.concat(batch);
    console.log(`  ✓ Fetched ${batch.length} proposals (total: ${allProposals.length})`);
    
    skip += batchSize;
    
    // Safety: max 1000 proposals
    if (skip > 1000) break;
  }

  console.log(`✅ Found ${allProposals.length} Ethereum proposals`);
  return allProposals;
}

async function fetchAllSnapshotProposals() {
  console.log("🔍 Fetching Snapshot proposals...");
  
  let allProposals = [];
  let skip = 0;
  const batchSize = 100;
  
  while (true) {
    const response = await fetch(SNAPSHOT_GRAPHQL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: SNAPSHOT_QUERY,
        variables: { space: SNAPSHOT_SPACE, first: batchSize, skip },
      }),
    });

    const { data } = await response.json();
    const batch = data?.proposals ?? [];
    
    if (batch.length === 0) break;
    
    allProposals = allProposals.concat(batch);
    console.log(`  ✓ Fetched ${batch.length} proposals (total: ${allProposals.length})`);
    
    skip += batchSize;
    
    // Safety: max 500 proposals
    if (skip > 500) break;
  }

  console.log(`✅ Found ${allProposals.length} Snapshot proposals`);
  return allProposals;
}

async function main() {
  const dataDir = path.join(__dirname, "..", "data");
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Fetch Ethereum proposals
  const ethProposals = await fetchAllEthProposals();
  const ethPath = path.join(dataDir, "ethereum-proposals.json");
  fs.writeFileSync(ethPath, JSON.stringify(ethProposals, null, 2));
  console.log(`💾 Saved to ${ethPath}`);

  // Fetch Snapshot proposals
  const snapshotProposals = await fetchAllSnapshotProposals();
  const snapshotPath = path.join(dataDir, "snapshot-proposals.json");
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshotProposals, null, 2));
  console.log(`💾 Saved to ${snapshotPath}`);

  console.log(`\n✨ Done! Total: ${ethProposals.length + snapshotProposals.length} proposals`);
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
