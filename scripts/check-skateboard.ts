import { config } from "dotenv";
import { resolve } from "path";
import { Configuration, NeynarAPIClient } from "@neynar/nodejs-sdk";

config({ path: resolve(process.cwd(), ".env.local") });

async function checkSkateboard() {
  const apiKey = process.env.NEYNAR_API_KEY;
  if (!apiKey) {
    console.error("NEYNAR_API_KEY not set");
    process.exit(1);
  }

  const client = new NeynarAPIClient(new Configuration({ apiKey }));

  try {
    // Search for @skateboard user
    console.log("🔍 Searching for @skateboard on Farcaster...\n");

    const searchResult = await client.searchUser({ q: "skateboard", limit: 10 });
    const users = searchResult.result?.users || [];

    for (const user of users) {
      if (user.username === "skateboard") {
        console.log(`✅ Found @skateboard`);
        console.log(`   FID: ${user.fid}`);
        console.log(`   Display Name: ${user.display_name}`);
        console.log(`   Followers: ${user.follower_count}`);
        console.log(`   Verified Addresses: ${user.verified_addresses?.eth_addresses?.length || 0}\n`);

        if (user.verified_addresses?.eth_addresses && user.verified_addresses.eth_addresses.length > 0) {
          console.log(`   Wallets:`);
          for (const addr of user.verified_addresses.eth_addresses) {
            console.log(`   - ${addr}`);
          }
        }

        return user.fid;
      }
    }

    console.log("❌ @skateboard not found in search results");
    console.log("\nSearch results:");
    for (const user of users.slice(0, 5)) {
      console.log(`- @${user.username} (FID ${user.fid})`);
    }
  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

checkSkateboard();
