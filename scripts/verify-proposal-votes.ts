import { createPublicClient, fallback, http, type Address } from "viem";
import { base, mainnet } from "viem/chains";

const SUBGRAPH_URL =
  "https://api.goldsky.com/api/public/project_cm33ek8kjx6pz010i2c3w8z25/subgraphs/nouns-builder-base-mainnet/latest/gn";

const DAO_ADDRESS = "0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17";
const PROPOSAL_NUMBER = 111;

const ENS_NAMES = ["marinioac.eth", "preciousnoggles.eth"] as const;

const tokenAbi = [
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
    name: "getVotes",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
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
    name: "clock",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint48" }],
  },
  {
    name: "CLOCK_MODE",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

type SubgraphProposal = {
  proposalNumber: number;
  snapshotBlockNumber: string;
  voteStart: string;
  voteEnd: string;
  title: string | null;
};

type SubgraphVote = {
  voter: string;
  support: string;
  weight: string;
  timestamp: string;
  transactionHash: string;
};

async function subgraphQuery<TData>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<TData> {
  const res = await fetch(SUBGRAPH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Subgraph error: ${res.status} ${res.statusText} ${text}`);
  }

  const json = (await res.json()) as { data?: TData; errors?: Array<{ message: string }> };
  if (json.errors?.length) {
    throw new Error(`Subgraph query failed: ${json.errors.map((e) => e.message).join("; ")}`);
  }
  if (!json.data) throw new Error("Subgraph query returned no data");
  return json.data;
}

async function main() {
  const baseClient = createPublicClient({
    chain: base,
    transport: fallback([
      http("https://base-rpc.publicnode.com"),
      http("https://base.llamarpc.com"),
      http("https://mainnet.base.org"),
    ]),
  });

  // Kept for optional diagnostics / future use.
  // The UI resolves ENS via ensideas, so we match that behavior below.
  const ethClient = createPublicClient({
    chain: mainnet,
    transport: http("https://cloudflare-eth.com"),
  });

  const proposalQuery = `
    query ProposalByNumber($dao: String!, $n: Int!) {
      proposals(where: { dao: $dao, proposalNumber: $n }, first: 1) {
        proposalNumber
        snapshotBlockNumber
        voteStart
        voteEnd
        title
      }
    }
  `;

  const votesQuery = `
    query VotesForProposal($dao: String!, $n: Int!, $first: Int!, $skip: Int!) {
      proposalVotes(
        where: { proposal_: { dao: $dao, proposalNumber: $n } }
        orderBy: timestamp
        orderDirection: desc
        first: $first
        skip: $skip
      ) {
        voter
        support
        weight
        timestamp
        transactionHash
      }
    }
  `;

  const { proposals } = await subgraphQuery<{ proposals: SubgraphProposal[] }>(proposalQuery, {
    dao: DAO_ADDRESS.toLowerCase(),
    n: PROPOSAL_NUMBER,
  });

  const proposal = proposals[0];
  if (!proposal) throw new Error(`Proposal #${PROPOSAL_NUMBER} not found in subgraph`);

  const snapshotBlock = BigInt(proposal.snapshotBlockNumber);
  const voteStart = BigInt(proposal.voteStart);
  const voteEnd = BigInt(proposal.voteEnd);

  // Pull votes (paginate defensively).
  const allVotes: SubgraphVote[] = [];
  const pageSize = 500;
  for (let skip = 0; skip < 5000; skip += pageSize) {
    const { proposalVotes } = await subgraphQuery<{ proposalVotes: SubgraphVote[] }>(votesQuery, {
      dao: DAO_ADDRESS.toLowerCase(),
      n: PROPOSAL_NUMBER,
      first: pageSize,
      skip,
    });
    allVotes.push(...proposalVotes);
    if (proposalVotes.length < pageSize) break;
  }

  console.log(`Proposal #${proposal.proposalNumber}: ${proposal.title ?? "(no title)"}`);
  console.log(`Snapshot block: ${snapshotBlock}`);
  console.log(`voteStart (subgraph): ${voteStart}`);
  console.log(`voteEnd   (subgraph): ${voteEnd}`);
  console.log(`Total votes indexed: ${allVotes.length}`);
  console.log("");

  // Inspect token clock mode if available (EIP-6372). Helpful to interpret
  // whether getPastVotes expects block numbers or timestamps.
  try {
    const clockMode = await baseClient.readContract({
      address: DAO_ADDRESS as Address,
      abi: tokenAbi,
      functionName: "CLOCK_MODE",
      args: [],
    });
    const clock = await baseClient.readContract({
      address: DAO_ADDRESS as Address,
      abi: tokenAbi,
      functionName: "clock",
      args: [],
    });
    console.log(`token CLOCK_MODE(): ${clockMode}`);
    console.log(`token clock(): ${clock}`);
    console.log("");
  } catch {
    // ignore if not implemented
  }

  const voterAddresses = Array.from(new Set(allVotes.map((v) => v.voter.toLowerCase())));

  type EnsIdeasResponse = {
    displayName?: string | null;
    name?: string | null;
    avatar?: string | null;
  };

  const nameByAddress = new Map<string, string | null>();
  async function ensIdeasName(address: Address): Promise<string | null> {
    const key = address.toLowerCase();
    if (nameByAddress.has(key)) return nameByAddress.get(key) ?? null;
    try {
      const res = await fetch(`https://api.ensideas.com/ens/resolve/${key}`, {
        headers: { Accept: "application/json", "User-Agent": "gnars-website/vote-verify" },
      });
      if (!res.ok) {
        nameByAddress.set(key, null);
        return null;
      }
      const data = (await res.json()) as EnsIdeasResponse;
      const value = (data.displayName || data.name || null) as string | null;
      nameByAddress.set(key, value);
      return value;
    } catch {
      nameByAddress.set(key, null);
      return null;
    }
  }

  // Resolve names for all voters once so we can match what the UI shows.
  for (const addr of voterAddresses) {
    await ensIdeasName(addr as Address);
  }

  console.log("Votes (UI name → support → weight):");
  for (const v of allVotes) {
    const addr = v.voter.toLowerCase() as Address;
    const nm = (nameByAddress.get(addr) ?? null) || `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    console.log(`  ${nm} -> ${v.support} -> ${v.weight}`);
  }
  console.log("");

  async function countMismatches(timepointLabel: string, timepoint: bigint) {
    const mismatches: Array<{ voter: Address; uiName: string; subgraph: bigint; onchain: bigint }> = [];
    for (const v of allVotes) {
      const voter = v.voter.toLowerCase() as Address;
      const uiName = nameByAddress.get(voter) ?? voter;
      const subgraphWeight = BigInt(v.weight);
      const onchainWeight = await baseClient.readContract({
        address: DAO_ADDRESS as Address,
        abi: tokenAbi,
        functionName: "getPastVotes",
        args: [voter, timepoint],
      });
      if (subgraphWeight !== onchainWeight) {
        mismatches.push({ voter, uiName, subgraph: subgraphWeight, onchain: onchainWeight });
      }
    }
    if (mismatches.length === 0) {
      console.log(`All votes match token.getPastVotes(${timepointLabel}).`);
    } else {
      console.log(
        `Mismatches vs token.getPastVotes(${timepointLabel}) [timepoint=${timepoint}]: ${mismatches.length}`,
      );
      for (const m of mismatches) {
        console.log(`  ${m.uiName} (${m.voter}): subgraph=${m.subgraph} onchain=${m.onchain}`);
      }
    }
    console.log("");
  }

  // Compare against both "snapshotBlockNumber" and "voteStart" since different
  // Governor/token implementations use different clocks (block number vs timestamp).
  await countMismatches("@snapshotBlockNumber", snapshotBlock);
  await countMismatches("@voteStart", voteStart);

  function findVoterByUiName(uiName: string): Address | null {
    const target = uiName.toLowerCase();
    for (const [addr, nm] of nameByAddress.entries()) {
      if (nm?.toLowerCase() === target) return addr as Address;
    }
    return null;
  }

  for (const ensName of ENS_NAMES) {
    const voter = findVoterByUiName(ensName);
    if (!voter) {
      console.log(`${ensName}: could not match to a voter address in proposal #${PROPOSAL_NUMBER}`);
      console.log("");
      continue;
    }

    const vote = allVotes.find((v) => v.voter.toLowerCase() === voter.toLowerCase());
    const onchainVpAtSnapshotBlock = await baseClient.readContract({
      address: DAO_ADDRESS as Address,
      abi: tokenAbi,
      functionName: "getPastVotes",
      args: [voter, snapshotBlock],
    });
    const onchainVpAtVoteStart = await baseClient.readContract({
      address: DAO_ADDRESS as Address,
      abi: tokenAbi,
      functionName: "getPastVotes",
      args: [voter, voteStart],
    });

    const currentBalance = await baseClient.readContract({
      address: DAO_ADDRESS as Address,
      abi: tokenAbi,
      functionName: "balanceOf",
      args: [voter],
    });

    const currentVotes = await baseClient.readContract({
      address: DAO_ADDRESS as Address,
      abi: tokenAbi,
      functionName: "getVotes",
      args: [voter],
    });

    const currentDelegate = await baseClient.readContract({
      address: DAO_ADDRESS as Address,
      abi: tokenAbi,
      functionName: "delegates",
      args: [voter],
    });

    console.log(`${ensName}`);
    console.log(`  voter: ${voter}`);
    console.log(`  onchain getPastVotes(@snapshotBlockNumber): ${onchainVpAtSnapshotBlock}`);
    console.log(`  onchain getPastVotes(@voteStart): ${onchainVpAtVoteStart}`);
    console.log(`  token balance (now): ${currentBalance}`);
    console.log(`  voting power (now): ${currentVotes}`);
    console.log(`  delegate (now): ${currentDelegate} ${currentDelegate.toLowerCase() === voter.toLowerCase() ? "(self)" : ""}`);

    if (!vote) {
      console.log("  subgraph vote: (not found)");
      console.log("");
      continue;
    }

    const subgraphWeight = BigInt(vote.weight);
    console.log(
      `  subgraph vote: ${vote.support} weight=${subgraphWeight} tx=${vote.transactionHash}`,
    );
    console.log(
      `  match snapshotBlockNumber: ${subgraphWeight === onchainVpAtSnapshotBlock ? "YES" : "NO"}`,
    );
    console.log(`  match voteStart: ${subgraphWeight === onchainVpAtVoteStart ? "YES" : "NO"}`);
    console.log("");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
