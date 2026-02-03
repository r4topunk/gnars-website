import { config } from "dotenv";
import { resolve } from "path";
import { Configuration, NeynarAPIClient } from "@neynar/nodejs-sdk";
import type { Network } from "@neynar/nodejs-sdk/build/api";

config({ path: resolve(process.cwd(), ".env.local") });

async function debug() {
  const apiKey = process.env.NEYNAR_API_KEY;
  if (!apiKey) {
    console.error("No API key");
    process.exit(1);
  }

  const client = new NeynarAPIClient(new Configuration({ apiKey }));

  try {
    const fid = 3;
    console.log(`Fetching balance for FID ${fid}...`);
    const response = await client.fetchUserBalance({
      fid,
      networks: ["base" as Network],
    });

    console.log("\n=== Raw Response ===");
    console.log(JSON.stringify(response, null, 2));
  } catch (error: any) {
    console.error("Error:", error.message);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", JSON.stringify(error.response.data, null, 2));
    }
  }
}

debug();
