/**
 * POIDH V3 Integration Test Script
 *
 * Tests the full contract flow using two thirdweb private-key wallets.
 * Designed to run against a local Anvil fork of Base mainnet so no real ETH is spent.
 *
 * Prerequisites:
 *   1. Install Foundry:  curl -L https://foundry.paradigm.xyz | bash && foundryup
 *   2. Start Anvil:      anvil --fork-url https://mainnet.base.org --chain-id 8453
 *   3. Run this script:  npx tsx scripts/test-poidh.ts
 *
 * Env vars (all optional — defaults use Anvil's deterministic funded accounts):
 *   POIDH_RPC_URL         RPC endpoint (default: http://127.0.0.1:8545)
 *   THIRDWEB_SECRET_KEY   Thirdweb secret key (optional, uses clientId mode if omitted)
 *   POIDH_KEY_A           Private key for wallet A / issuer  (default: Anvil account 0)
 *   POIDH_KEY_B           Private key for wallet B / claimer (default: Anvil account 1)
 *   POIDH_KEY_C           Private key for wallet C / non-participant edge case (default: Anvil account 2)
 */

import {
  createThirdwebClient,
  getContract,
  prepareContractCall,
  readContract,
  sendTransaction,
  waitForReceipt,
} from "thirdweb";
import { defineChain } from "thirdweb/chains";
import { privateKeyToAccount } from "thirdweb/wallets";
import { formatEther, parseEther } from "viem";

// ─── Config ──────────────────────────────────────────────────────────────────

const RPC_URL = process.env.POIDH_RPC_URL ?? "http://127.0.0.1:8545";
const POIDH_CONTRACT_ADDR = "0x5555fa783936c260f77385b4e153b9725fef1719" as `0x${string}`;

// Anvil deterministic funded accounts (from default mnemonic "test test test ... junk")
const DEFAULT_KEY_A =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as `0x${string}`;
const DEFAULT_KEY_B =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as `0x${string}`;
const DEFAULT_KEY_C =
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a" as `0x${string}`;

const KEY_A = (process.env.POIDH_KEY_A ?? DEFAULT_KEY_A) as `0x${string}`;
const KEY_B = (process.env.POIDH_KEY_B ?? DEFAULT_KEY_B) as `0x${string}`;
const KEY_C = (process.env.POIDH_KEY_C ?? DEFAULT_KEY_C) as `0x${string}`;

// ─── ABI (self-contained for script independence) ─────────────────────────────

const POIDH_ABI = [
  // Write
  {
    inputs: [
      { name: "name", type: "string" },
      { name: "description", type: "string" },
    ],
    name: "createSoloBounty",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { name: "name", type: "string" },
      { name: "description", type: "string" },
    ],
    name: "createOpenBounty",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ name: "bountyId", type: "uint256" }],
    name: "joinOpenBounty",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { name: "bountyId", type: "uint256" },
      { name: "name", type: "string" },
      { name: "description", type: "string" },
      { name: "imageUri", type: "string" },
    ],
    name: "createClaim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "bountyId", type: "uint256" },
      { name: "claimId", type: "uint256" },
    ],
    name: "acceptClaim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "bountyId", type: "uint256" },
      { name: "claimId", type: "uint256" },
    ],
    name: "submitClaimForVote",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "bountyId", type: "uint256" },
      { name: "vote", type: "bool" },
    ],
    name: "voteClaim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "bountyId", type: "uint256" }],
    name: "resolveVote",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "bountyId", type: "uint256" }],
    name: "cancelSoloBounty",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "bountyId", type: "uint256" }],
    name: "cancelOpenBounty",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "bountyId", type: "uint256" }],
    name: "withdrawFromOpenBounty",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "bountyId", type: "uint256" }],
    name: "claimRefundFromCancelledOpenBounty",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "bountyId", type: "uint256" }],
    name: "resetVotingPeriod",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  { inputs: [], name: "withdraw", outputs: [], stateMutability: "nonpayable", type: "function" },
  // Read
  {
    inputs: [],
    name: "getBountiesLength",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MIN_BOUNTY_AMOUNT",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MIN_CONTRIBUTION",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "FEE_BPS",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "votingPeriod",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "bountyId", type: "uint256" }],
    name: "everHadExternalContributor",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "bountyId", type: "uint256" }],
    name: "bountyVotingTracker",
    outputs: [
      { name: "yes", type: "uint256" },
      { name: "no", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "bountyId", type: "uint256" }],
    name: "bountyCurrentVotingClaim",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "", type: "address" }],
    name: "pendingWithdrawals",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "bountyId", type: "uint256" }],
    name: "getParticipants",
    outputs: [
      { name: "", type: "address[]" },
      { name: "", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ─── Setup ────────────────────────────────────────────────────────────────────

const baseFork = defineChain({ id: 8453, rpc: RPC_URL });
const client = createThirdwebClient(
  process.env.THIRDWEB_SECRET_KEY
    ? { secretKey: process.env.THIRDWEB_SECRET_KEY }
    : { clientId: "test-poidh-script" },
);

const accountA = privateKeyToAccount({ client, privateKey: KEY_A });
const accountB = privateKeyToAccount({ client, privateKey: KEY_B });
const accountC = privateKeyToAccount({ client, privateKey: KEY_C });

const contract = getContract({
  client,
  chain: baseFork,
  address: POIDH_CONTRACT_ADDR,
  abi: POIDH_ABI,
});

// ─── Test helpers ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function pass(label: string) {
  console.log(`  ✅ PASS [${label}]`);
  passed++;
}

function fail(label: string, detail?: string) {
  console.log(`  ❌ FAIL [${label}]${detail ? ` — ${detail}` : ""}`);
  failed++;
}

function info(msg: string) {
  console.log(`  ℹ️  ${msg}`);
}

async function send(account: typeof accountA, tx: ReturnType<typeof prepareContractCall>) {
  const result = await sendTransaction({ account, transaction: tx });
  await waitForReceipt({ client, chain: baseFork, transactionHash: result.transactionHash });
  return result.transactionHash;
}

async function expectOk(fn: () => Promise<unknown>, label: string) {
  try {
    await fn();
    pass(label);
  } catch (err) {
    fail(label, String(err).split("\n")[0]);
  }
}

async function expectRevert(fn: () => Promise<unknown>, label: string) {
  try {
    await fn();
    fail(label, "expected revert but tx succeeded");
  } catch {
    pass(label);
  }
}

async function check<T>(actual: T, predicate: (v: T) => boolean, label: string, detail?: string) {
  if (predicate(actual)) {
    pass(label);
  } else {
    fail(label, detail ?? `got ${String(actual)}`);
  }
}

// ─── Anvil time control ───────────────────────────────────────────────────────

let anvilAvailable = false;

async function advanceAnvilTime(seconds: number): Promise<boolean> {
  try {
    const r1 = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "evm_increaseTime",
        params: [seconds],
        id: 1,
      }),
    });
    const j1 = (await r1.json()) as { error?: unknown };
    if (j1.error) return false;
    await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "evm_mine", params: [], id: 2 }),
    });
    info(`Time advanced +${seconds}s`);
    return true;
  } catch {
    return false;
  }
}

async function detectAnvil() {
  anvilAvailable = await advanceAnvilTime(1);
  if (!anvilAvailable) {
    info(
      "evm_increaseTime not supported — time-dependent tests (vote resolution) will be skipped.",
    );
  }
}

// ─── Suite 1: Contract constants ─────────────────────────────────────────────

async function testConstants() {
  console.log("\n📋  Contract Constants");

  const [minBounty, minContrib, feeBps, votePeriod] = await Promise.all([
    readContract({ contract, method: "MIN_BOUNTY_AMOUNT" }),
    readContract({ contract, method: "MIN_CONTRIBUTION" }),
    readContract({ contract, method: "FEE_BPS" }),
    readContract({ contract, method: "votingPeriod" }),
  ]);

  await check(feeBps, (v) => v === 250n, "FEE_BPS == 250 (2.5%)");
  await check(votePeriod, (v) => v === 172800n, "votingPeriod == 172800s (48h)");
  info(`MIN_BOUNTY_AMOUNT: ${formatEther(minBounty)} ETH`);
  info(`MIN_CONTRIBUTION:  ${formatEther(minContrib)} ETH`);
}

// ─── Suite 2: Solo bounty — create → claim → direct accept → withdraw ─────────

async function testSoloBountyFlow() {
  console.log("\n🪙  Solo Bounty: create → claim → accept → withdraw");

  const lengthBefore = await readContract({ contract, method: "getBountiesLength" });
  const bountyId = lengthBefore;

  // Create solo bounty (A is issuer)
  await expectOk(
    () =>
      send(
        accountA,
        prepareContractCall({
          contract,
          method: "createSoloBounty",
          params: ["Gnars Test Solo", "Integration test"],
          value: parseEther("0.001"),
        }),
      ),
    "createSoloBounty",
  );
  await check(
    await readContract({ contract, method: "getBountiesLength" }),
    (v) => v === lengthBefore + 1n,
    "Bounty count incremented",
  );

  // No external contributors on a fresh solo bounty
  await check(
    await readContract({ contract, method: "everHadExternalContributor", args: [bountyId] }),
    (v) => v === false,
    "everHadExternalContributor == false (solo, no joiners)",
  );

  // B submits a claim
  await expectOk(
    () =>
      send(
        accountB,
        prepareContractCall({
          contract,
          method: "createClaim",
          params: [bountyId, "B's proof", "Gnars solo test claim", ""],
        }),
      ),
    "createClaim (B)",
  );

  // A accepts directly (solo bounty, no contributors)
  await expectOk(
    () =>
      send(
        accountA,
        prepareContractCall({
          contract,
          method: "acceptClaim",
          params: [bountyId, 0n],
        }),
      ),
    "acceptClaim (A accepts B's claim)",
  );

  // B should have a pending withdrawal (bounty amount minus 2.5% fee)
  const pending = await readContract({
    contract,
    method: "pendingWithdrawals",
    args: [accountB.address as `0x${string}`],
  });
  await check(pending, (v) => v > 0n, `Winner has pending balance (${formatEther(pending)} ETH)`);

  // B withdraws
  await expectOk(
    () => send(accountB, prepareContractCall({ contract, method: "withdraw", params: [] })),
    "withdraw (B claims winnings)",
  );
  const pendingAfter = await readContract({
    contract,
    method: "pendingWithdrawals",
    args: [accountB.address as `0x${string}`],
  });
  await check(pendingAfter, (v) => v === 0n, "Pending balance == 0 after withdraw");
}

// ─── Suite 3: Open bounty — join → submit for vote → vote → resolve ───────────

async function testOpenBountyVoteFlow() {
  console.log("\n🗳️   Open Bounty: create → join → claim → vote → resolve");

  const lengthBefore = await readContract({ contract, method: "getBountiesLength" });
  const bountyId = lengthBefore;

  // A creates open bounty
  await expectOk(
    () =>
      send(
        accountA,
        prepareContractCall({
          contract,
          method: "createOpenBounty",
          params: ["Gnars Open Challenge", "Multiplayer integration test"],
          value: parseEther("0.001"),
        }),
      ),
    "createOpenBounty (A)",
  );

  // B joins
  await expectOk(
    () =>
      send(
        accountB,
        prepareContractCall({
          contract,
          method: "joinOpenBounty",
          params: [bountyId],
          value: parseEther("0.001"),
        }),
      ),
    "joinOpenBounty (B)",
  );

  await check(
    await readContract({ contract, method: "everHadExternalContributor", args: [bountyId] }),
    (v) => v === true,
    "everHadExternalContributor == true after B joined",
  );

  // A creates a claim
  await expectOk(
    () =>
      send(
        accountA,
        prepareContractCall({
          contract,
          method: "createClaim",
          params: [bountyId, "A's skate proof", "Landed the kickflip", ""],
        }),
      ),
    "createClaim (A)",
  );
  const claimId = 0n;

  // acceptClaim must revert when everHadExternalContributor is true
  await expectRevert(
    () =>
      send(
        accountA,
        prepareContractCall({
          contract,
          method: "acceptClaim",
          params: [bountyId, claimId],
        }),
      ),
    "acceptClaim reverts — open bounty with contributor must use vote flow",
  );

  // Submit claim for vote
  await expectOk(
    () =>
      send(
        accountA,
        prepareContractCall({
          contract,
          method: "submitClaimForVote",
          params: [bountyId, claimId],
        }),
      ),
    "submitClaimForVote (A)",
  );

  // Verify vote deadline is set
  const tracker = await readContract({ contract, method: "bountyVotingTracker", args: [bountyId] });
  await check(tracker[2], (v) => v > 0n, "Vote deadline set (bountyVotingTracker.deadline > 0)");
  info(`Vote deadline: ${new Date(Number(tracker[2]) * 1000).toISOString()}`);

  // Both A and B vote
  await expectOk(
    () =>
      send(
        accountA,
        prepareContractCall({ contract, method: "voteClaim", params: [bountyId, true] }),
      ),
    "voteClaim YES (A)",
  );
  await expectOk(
    () =>
      send(
        accountB,
        prepareContractCall({ contract, method: "voteClaim", params: [bountyId, false] }),
      ),
    "voteClaim NO (B)",
  );

  const trackerAfter = await readContract({
    contract,
    method: "bountyVotingTracker",
    args: [bountyId],
  });
  await check(trackerAfter[0], (v) => v > 0n, "Yes weight > 0 after A voted");
  await check(trackerAfter[1], (v) => v > 0n, "No weight > 0 after B voted");
  info(`Votes — Yes: ${formatEther(trackerAfter[0])} ETH  No: ${formatEther(trackerAfter[1])} ETH`);

  if (!anvilAvailable) {
    info("Skipping resolveVote — requires Anvil time advance past 48h voting period.");
    return;
  }

  // Advance time past 48h voting period
  await advanceAnvilTime(48 * 3600 + 60);

  await expectOk(
    () =>
      send(accountA, prepareContractCall({ contract, method: "resolveVote", params: [bountyId] })),
    "resolveVote (after 48h)",
  );

  // If yes > no, the claim is accepted and A has pending winnings
  const pendingA = await readContract({
    contract,
    method: "pendingWithdrawals",
    args: [accountA.address as `0x${string}`],
  });
  info(`Pending for A after resolve: ${formatEther(pendingA)} ETH`);
}

// ─── Suite 4: Cancel open bounty → contributor claims refund ──────────────────

async function testCancelRefundFlow() {
  console.log("\n❌  Cancel Open Bounty + Refund");

  const lengthBefore = await readContract({ contract, method: "getBountiesLength" });
  const bountyId = lengthBefore;

  await expectOk(
    () =>
      send(
        accountA,
        prepareContractCall({
          contract,
          method: "createOpenBounty",
          params: ["Cancellable Bounty", "Will be cancelled"],
          value: parseEther("0.001"),
        }),
      ),
    "createOpenBounty (to cancel)",
  );

  await expectOk(
    () =>
      send(
        accountB,
        prepareContractCall({
          contract,
          method: "joinOpenBounty",
          params: [bountyId],
          value: parseEther("0.001"),
        }),
      ),
    "joinOpenBounty (B)",
  );

  // Issuer cancels
  await expectOk(
    () =>
      send(
        accountA,
        prepareContractCall({ contract, method: "cancelOpenBounty", params: [bountyId] }),
      ),
    "cancelOpenBounty (A)",
  );

  // withdrawFromOpenBounty must revert on a cancelled bounty
  await expectRevert(
    () =>
      send(
        accountB,
        prepareContractCall({ contract, method: "withdrawFromOpenBounty", params: [bountyId] }),
      ),
    "withdrawFromOpenBounty reverts on cancelled bounty",
  );

  // claimRefundFromCancelledOpenBounty is the correct call
  await expectOk(
    () =>
      send(
        accountB,
        prepareContractCall({
          contract,
          method: "claimRefundFromCancelledOpenBounty",
          params: [bountyId],
        }),
      ),
    "claimRefundFromCancelledOpenBounty (B recovers funds)",
  );

  // Double-refund must revert
  await expectRevert(
    () =>
      send(
        accountB,
        prepareContractCall({
          contract,
          method: "claimRefundFromCancelledOpenBounty",
          params: [bountyId],
        }),
      ),
    "Double claimRefund reverts",
  );
}

// ─── Suite 5: resetVotingPeriod ───────────────────────────────────────────────

async function testResetVotingPeriod() {
  console.log("\n🔄  Reset Voting Period");

  if (!anvilAvailable) {
    info("Skipping — requires Anvil time advance.");
    return;
  }

  const bountyId = await readContract({ contract, method: "getBountiesLength" });

  // Create open bounty with B as contributor so vote flow is mandatory
  await send(
    accountA,
    prepareContractCall({
      contract,
      method: "createOpenBounty",
      params: ["Reset Vote Test", "Vote period reset test"],
      value: parseEther("0.001"),
    }),
  );
  await send(
    accountB,
    prepareContractCall({
      contract,
      method: "joinOpenBounty",
      params: [bountyId],
      value: parseEther("0.001"),
    }),
  );
  await send(
    accountA,
    prepareContractCall({
      contract,
      method: "createClaim",
      params: [bountyId, "Claim", "Proof", ""],
    }),
  );
  await send(
    accountA,
    prepareContractCall({ contract, method: "submitClaimForVote", params: [bountyId, 0n] }),
  );

  // Both vote NO → claim loses
  await send(
    accountA,
    prepareContractCall({ contract, method: "voteClaim", params: [bountyId, false] }),
  );
  await send(
    accountB,
    prepareContractCall({ contract, method: "voteClaim", params: [bountyId, false] }),
  );

  await advanceAnvilTime(48 * 3600 + 60);

  // resolveVote with all-no should revert or mark as not accepted and allow reset
  // resetVotingPeriod reverts if the vote WOULD have passed — here it should succeed
  await expectOk(
    () =>
      send(
        accountA,
        prepareContractCall({ contract, method: "resetVotingPeriod", params: [bountyId] }),
      ),
    "resetVotingPeriod succeeds after failed vote",
  );

  // Verify vote tracker is cleared
  const tracker = await readContract({ contract, method: "bountyVotingTracker", args: [bountyId] });
  await check(tracker[2], (v) => v === 0n, "Vote deadline cleared after reset");
}

// ─── Suite 6: Edge cases ──────────────────────────────────────────────────────

async function testEdgeCases() {
  console.log("\n⚠️   Edge Cases");

  const bountyId = await readContract({ contract, method: "getBountiesLength" });

  await send(
    accountA,
    prepareContractCall({
      contract,
      method: "createSoloBounty",
      params: ["Edge Case Bounty", "For edge case tests"],
      value: parseEther("0.001"),
    }),
  );
  await send(
    accountB,
    prepareContractCall({
      contract,
      method: "createClaim",
      params: [bountyId, "B's edge case claim", "Testing access control", ""],
    }),
  );

  // Non-creator cannot accept claim
  await expectRevert(
    () =>
      send(
        accountB,
        prepareContractCall({ contract, method: "acceptClaim", params: [bountyId, 0n] }),
      ),
    "Non-issuer cannot acceptClaim",
  );

  // Non-creator cannot cancel solo bounty
  await expectRevert(
    () =>
      send(
        accountB,
        prepareContractCall({ contract, method: "cancelSoloBounty", params: [bountyId] }),
      ),
    "Non-issuer cannot cancelSoloBounty",
  );

  // Non-participant cannot vote
  const openBountyId = await readContract({ contract, method: "getBountiesLength" });
  await send(
    accountA,
    prepareContractCall({
      contract,
      method: "createOpenBounty",
      params: ["Vote Access Test", "Only participants vote"],
      value: parseEther("0.001"),
    }),
  );
  await send(
    accountB,
    prepareContractCall({
      contract,
      method: "joinOpenBounty",
      params: [openBountyId],
      value: parseEther("0.001"),
    }),
  );
  await send(
    accountA,
    prepareContractCall({
      contract,
      method: "createClaim",
      params: [openBountyId, "Claim", "Proof", ""],
    }),
  );
  await send(
    accountA,
    prepareContractCall({ contract, method: "submitClaimForVote", params: [openBountyId, 0n] }),
  );

  await expectRevert(
    () =>
      send(
        accountC,
        prepareContractCall({ contract, method: "voteClaim", params: [openBountyId, true] }),
      ),
    "Non-participant cannot voteClaim",
  );

  // Cannot resolve vote before deadline
  await expectRevert(
    () =>
      send(
        accountA,
        prepareContractCall({ contract, method: "resolveVote", params: [openBountyId] }),
      ),
    "resolveVote reverts before voting deadline",
  );

  // Joining a cancelled bounty should revert
  await send(
    accountA,
    prepareContractCall({ contract, method: "cancelOpenBounty", params: [openBountyId] }),
  );
  await expectRevert(
    () =>
      send(
        accountB,
        prepareContractCall({
          contract,
          method: "joinOpenBounty",
          params: [openBountyId],
          value: parseEther("0.001"),
        }),
      ),
    "joinOpenBounty reverts on cancelled bounty",
  );

  // AA / contract wallet note
  info("AA wallets: V3 enforces msg.sender == tx.origin for createSoloBounty/createOpenBounty.");
  info(
    "           Smart contract wallets (Gnosis Safe, ERC-4337 AA) will be rejected at the contract.",
  );
  info(
    "           The UI should surface this error clearly — the hook error message will contain 'origin'.",
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(60));
  console.log("  POIDH V3 Integration Tests");
  console.log("=".repeat(60));
  console.log(`  RPC:      ${RPC_URL}`);
  console.log(`  Contract: ${POIDH_CONTRACT_ADDR}`);
  console.log(`  Wallet A (issuer):      ${accountA.address}`);
  console.log(`  Wallet B (contributor): ${accountB.address}`);
  console.log(`  Wallet C (outsider):    ${accountC.address}`);

  await detectAnvil();

  try {
    await testConstants();
    await testSoloBountyFlow();
    await testOpenBountyVoteFlow();
    await testCancelRefundFlow();
    await testResetVotingPeriod();
    await testEdgeCases();
  } catch (err) {
    console.error("\n💥 Unexpected error:", err);
    failed++;
  }

  console.log("\n" + "=".repeat(60));
  console.log(`  Results: ✅ ${passed} passed   ❌ ${failed} failed`);
  console.log("=".repeat(60));
  process.exit(failed > 0 ? 1 : 0);
}

main();
