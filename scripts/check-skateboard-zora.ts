import { getProfile } from "@zoralabs/coins-sdk";

async function checkSkateboardZora() {
  console.log("Checking Zora profile for skateboard\n");

  try {
    // Try exact handle
    const response = await getProfile({
      handle: "skateboard",
      chain: 8453,
    });

    if (response?.data?.profile) {
      const profile = response.data.profile;
      console.log("✅ Found Zora profile:");
      console.log("   Handle:", profile.handle);
      console.log("   Public wallet:", profile.publicWallet?.walletAddress || "none");
      
      const linked =
        (
          profile as {
            linkedWallets?: { edges?: Array<{ node?: { walletAddress?: string } }> };
          }
        ).linkedWallets?.edges || [];
      console.log("   Linked wallets:", linked.length);
      for (const edge of linked) {
        console.log("   -", edge.node?.walletAddress);
      }
    } else {
      console.log("❌ No Zora profile found for 'skateboard'");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Error:", message);
  }
}

checkSkateboardZora();
