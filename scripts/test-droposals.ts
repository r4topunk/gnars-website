/**
 * Test script to debug droposal dates
 *
 * Run with: npx tsx scripts/test-droposals.ts
 */

import { fetchDroposals } from "../src/services/droposals";

async function testDroposals() {
  console.log("🎬 Testing Droposal Dates\n");
  console.log("=".repeat(60));

  const droposals = await fetchDroposals(10);

  console.log(`Found ${droposals.length} droposals\n`);

  for (const d of droposals) {
    console.log(`📦 ${d.name || d.title}`);
    console.log(`   proposalNumber: ${d.proposalNumber}`);
    console.log(`   createdAt (raw): ${d.createdAt}`);
    console.log(`   executedAt (raw): ${d.executedAt}`);

    // Test different interpretations
    const timestamp = d.executedAt || d.createdAt;

    // As seconds (Unix timestamp)
    const asSeconds = new Date(timestamp * 1000);
    console.log(`   As seconds: ${asSeconds.toISOString()} (${asSeconds.toLocaleDateString()})`);

    // As milliseconds
    const asMillis = new Date(timestamp);
    console.log(`   As millis:  ${asMillis.toISOString()} (${asMillis.toLocaleDateString()})`);

    console.log("");
  }

  console.log("=".repeat(60));
}

testDroposals().catch(console.error);
