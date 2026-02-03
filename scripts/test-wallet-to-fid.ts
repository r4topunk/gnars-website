import { config } from "dotenv";
import { resolve } from "path";
import { Configuration, NeynarAPIClient } from "@neynar/nodejs-sdk";

config({ path: resolve(process.cwd(), ".env.local") });

async function testWalletToFid() {
  const apiKey = process.env.NEYNAR_API_KEY;
  if (!apiKey) {
    console.error("NEYNAR_API_KEY not set");
    process.exit(1);
  }

  const client = new NeynarAPIClient(new Configuration({ apiKey }));

  // @skateboard's wallets (from search result)
  const skateboardWallets = [
    "0x41cb654d1f47913acab158a8199191d160dabe4a",
    "0x4a0a41f0278c732562e2a09008dfb0e4b9189eb3",
    "0x2d1882304c9a6fa7f987c1b41c9fd5e8cf0516e2",
    "0x793b7ec1e64336391eb0b40ad2c197cc33e5dd28",
    "0x8bf5941d27176242745b716251943ae4892a3c26",
  ];

  console.log("🔍 Testing wallet → FID mapping for @skateboard\n");

  try {
    const response = await client.fetchBulkUsersByEthOrSolAddress({
      addresses: skateboardWallets,
    });

    console.log(`Found ${Object.keys(response).length} mappings\n`);

    for (const [address, users] of Object.entries(response)) {
      const normalized = address.toLowerCase();
      if (users && users.length > 0) {
        for (const user of users) {
          console.log(`✅ ${normalized} → FID ${user.fid} (@${user.username})`);
          if (user.fid === 20721) {
            console.log(`   ⭐ This is @skateboard!`);
          }
        }
      } else {
        console.log(`❌ ${normalized} → No FID found`);
      }
    }
  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

testWalletToFid();
