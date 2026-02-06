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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error:", message);
    const err = error as { response?: { status?: number; data?: unknown } };
    if (err?.response) {
      console.error("Status:", err.response.status);
      console.error("Data:", JSON.stringify(err.response.data, null, 2));
    }
  }
}

debug();
