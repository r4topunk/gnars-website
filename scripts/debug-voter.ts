import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

const GNARS_TOKEN = "0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17";

const tokenAbi = [
  {
    name: "getVotes",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getPastVotes",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "blockNumber", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "delegates",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;


async function debugVoter(voterAddress: string, proposalNumber: number, snapshotBlock: bigint) {
  const client = createPublicClient({
    chain: base,
    transport: http("https://mainnet.base.org"),
  });

  console.log("=".repeat(60));
  console.log(`DEBUG: Voter ${voterAddress}`);
  console.log(`Proposal: #${proposalNumber}`);
  console.log(`Snapshot Block: ${snapshotBlock}`);
  console.log("=".repeat(60));

  // 1. Current balance
  const currentBalance = await client.readContract({
    address: GNARS_TOKEN,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: [voterAddress as `0x${string}`],
  });
  console.log(`\n1. Current GNAR Balance: ${currentBalance}`);

  // 2. Current voting power
  const currentVotes = await client.readContract({
    address: GNARS_TOKEN,
    abi: tokenAbi,
    functionName: "getVotes",
    args: [voterAddress as `0x${string}`],
  });
  console.log(`2. Current Voting Power: ${currentVotes}`);

  // 3. Current delegate
  const currentDelegate = await client.readContract({
    address: GNARS_TOKEN,
    abi: tokenAbi,
    functionName: "delegates",
    args: [voterAddress as `0x${string}`],
  });
  console.log(`3. Current Delegate: ${currentDelegate}`);
  console.log(`   Self-delegated: ${currentDelegate.toLowerCase() === voterAddress.toLowerCase()}`);

  // 4. Voting power at snapshot block
  try {
    const snapshotVotes = await client.readContract({
      address: GNARS_TOKEN,
      abi: tokenAbi,
      functionName: "getPastVotes",
      args: [voterAddress as `0x${string}`, snapshotBlock],
    });
    console.log(`\n4. Voting Power at Snapshot (block ${snapshotBlock}): ${snapshotVotes}`);
  } catch (e) {
    console.log(`\n4. Error getting past votes: ${e}`);
  }

  // 5. Get current block for reference
  const currentBlock = await client.getBlockNumber();
  console.log(`\n5. Current Block: ${currentBlock}`);
  console.log(`   Blocks since snapshot: ${currentBlock - snapshotBlock}`);

  // 6. Check if voter can vote (Governor contract perspective)
  // The governor checks voting power at the proposal's snapshot
  console.log("\n" + "=".repeat(60));
  console.log("ANALYSIS:");
  console.log("=".repeat(60));

  if (currentBalance > 0n && currentVotes === 0n) {
    console.log("⚠️  Has tokens but NO voting power - likely delegated to someone else");
    console.log(`   Delegated to: ${currentDelegate}`);
  } else if (currentBalance === 0n && currentVotes === 0n) {
    console.log("❌ No tokens and no voting power");
    console.log("   This voter had no GNARs at snapshot time");
  } else if (currentVotes > 0n) {
    console.log(`✅ Has ${currentVotes} voting power`);
  }

  // 7. Check the delegate's voting power if different
  if (currentDelegate.toLowerCase() !== voterAddress.toLowerCase()) {
    console.log(`\n📋 Checking delegate (${currentDelegate}):`);

    const delegateVotes = await client.readContract({
      address: GNARS_TOKEN,
      abi: tokenAbi,
      functionName: "getVotes",
      args: [currentDelegate],
    });
    console.log(`   Delegate's current voting power: ${delegateVotes}`);

    try {
      const delegateSnapshotVotes = await client.readContract({
        address: GNARS_TOKEN,
        abi: tokenAbi,
        functionName: "getPastVotes",
        args: [currentDelegate, snapshotBlock],
      });
      console.log(`   Delegate's voting power at snapshot: ${delegateSnapshotVotes}`);
    } catch (e) {
      console.log(`   Error getting delegate's past votes: ${e}`);
    }
  }
}

// Run debug for davinoyesigye.eth on proposal 109
const DAVIN_ADDRESS = "0xdfb6ed808fadddad9154f5605e349fff96e3d939";
const PROPOSAL_109_SNAPSHOT = 40247877n;

debugVoter(DAVIN_ADDRESS, 109, PROPOSAL_109_SNAPSHOT).catch(console.error);
