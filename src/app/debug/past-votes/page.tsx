"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount, useReadContract } from "wagmi";
import { GNARS_ADDRESSES } from "@/lib/config";
import { subgraphQuery } from "@/lib/subgraph";

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
] as const;

const VOTES_BY_VOTER_QUERY = `
  query GetVotesByVoter($voter: String!, $proposalNumber: Int!) {
    proposalVotes(
      where: {
        voter: $voter,
        proposal_: { proposalNumber: $proposalNumber }
      }
      first: 1
    ) {
      id
      voter
      support
      weight
      reason
      timestamp
      transactionHash
      proposal {
        proposalNumber
        title
        snapshotBlockNumber
      }
    }
  }
`;

export default function DebugPastVotesPage() {
  const { address } = useAccount();
  const [blockNumber, setBlockNumber] = useState("40336201");
  const [proposalNumber, setProposalNumber] = useState("110");

  const {
    data: pastVotes,
    status: pastStatus,
    error: pastError,
  } = useReadContract({
    address: GNARS_ADDRESSES.TOKEN as `0x${string}`,
    abi: tokenAbi,
    functionName: "getPastVotes",
    args: address ? [address, BigInt(blockNumber)] : undefined,
    chainId: 8453,
  });

  const { data: currentVotes, status: currentStatus } = useReadContract({
    address: GNARS_ADDRESSES.TOKEN as `0x${string}`,
    abi: tokenAbi,
    functionName: "getVotes",
    args: address ? [address] : undefined,
    chainId: 8453,
  });

  // Fetch vote from subgraph
  const {
    data: subgraphData,
    status: subgraphStatus,
    error: subgraphError,
  } = useQuery({
    queryKey: ["debug-vote", address?.toLowerCase(), proposalNumber],
    queryFn: async () => {
      if (!address) return null;
      const result = await subgraphQuery<{ proposalVotes: any[] }>(VOTES_BY_VOTER_QUERY, {
        voter: address.toLowerCase(),
        proposalNumber: parseInt(proposalNumber),
      });
      return result;
    },
    enabled: Boolean(address),
  });

  const vote = subgraphData?.proposalVotes?.[0];

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Voting Power - Contract vs Subgraph</h1>

      <div className="space-y-4">
        <div>
          <label className="block mb-2 font-semibold">Your Address:</label>
          <code className="block p-2 bg-muted rounded">{address || "Not connected"}</code>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-2 font-semibold">Block Number (for getPastVotes):</label>
            <input
              type="text"
              value={blockNumber}
              onChange={(e) => setBlockNumber(e.target.value)}
              className="p-2 border rounded w-full"
            />
          </div>
          <div>
            <label className="block mb-2 font-semibold">Proposal Number:</label>
            <input
              type="text"
              value={proposalNumber}
              onChange={(e) => setProposalNumber(e.target.value)}
              className="p-2 border rounded w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="border p-4 rounded bg-red-50">
            <h2 className="font-bold mb-2 text-red-700">❌ Contract: getPastVotes</h2>
            <div className="space-y-1">
              <div>
                Status: <span className="font-mono">{pastStatus}</span>
              </div>
              <div className="text-2xl font-bold">{pastVotes?.toString() || "undefined"} votes</div>
              {pastError && (
                <div className="text-red-600 text-sm mt-2">Error: {pastError.message}</div>
              )}
            </div>
          </div>

          <div className="border p-4 rounded bg-green-50">
            <h2 className="font-bold mb-2 text-green-700">✓ Subgraph: Vote Weight</h2>
            <div className="space-y-1">
              <div>
                Status: <span className="font-mono">{subgraphStatus}</span>
              </div>
              {vote ? (
                <>
                  <div className="text-2xl font-bold">{vote.weight} votes</div>
                  <div className="text-sm text-muted-foreground mt-2">
                    <div>
                      Support:{" "}
                      {vote.support === 1 ? "FOR" : vote.support === 0 ? "AGAINST" : "ABSTAIN"}
                    </div>
                    <div>Snapshot Block: {vote.proposal.snapshotBlockNumber}</div>
                    {vote.reason && <div className="mt-1 italic">"{vote.reason}"</div>}
                  </div>
                </>
              ) : (
                <div className="text-muted-foreground">No vote found</div>
              )}
              {subgraphError && (
                <div className="text-red-600 text-sm mt-2">Error: {subgraphError.message}</div>
              )}
            </div>
          </div>
        </div>

        <div className="border p-4 rounded">
          <h2 className="font-bold mb-2">Current Votes (getVotes):</h2>
          <div>Status: {currentStatus}</div>
          <div className="text-xl font-bold">{currentVotes?.toString() || "undefined"} votes</div>
        </div>

        <div className="border p-4 rounded bg-blue-50">
          <h2 className="font-bold mb-2">💡 Solution:</h2>
          <p className="text-sm">
            The subgraph stores the actual voting weight used when you cast your vote. This is more
            reliable than calling <code className="bg-white px-1">getPastVotes</code>
            which can fail due to checkpoint timing issues.
          </p>
          <p className="text-sm mt-2">
            <strong>Recommendation:</strong> Use the weight from the subgraph vote record instead of
            querying historical contract state.
          </p>
        </div>

        <div className="border p-4 rounded bg-muted">
          <h2 className="font-bold mb-2">Raw Subgraph Response:</h2>
          <pre className="text-xs overflow-auto">{JSON.stringify(subgraphData, null, 2)}</pre>
        </div>

        <div className="border p-4 rounded bg-muted">
          <h2 className="font-bold mb-2">Debug Info:</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(
              {
                address,
                blockNumber,
                blockNumberBigInt: BigInt(blockNumber).toString(),
                proposalNumber: parseInt(proposalNumber),
                tokenContract: GNARS_ADDRESSES.TOKEN,
                chainId: 8453,
              },
              null,
              2,
            )}
          </pre>
        </div>
      </div>
    </div>
  );
}
