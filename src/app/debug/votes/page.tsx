"use client";

import { useVotes } from "@/hooks/useVotes";
import { GNARS_ADDRESSES } from "@/lib/config";

export default function VotesDebugPage() {
  const testAddress = "0x8Bf5941d27176242745B716251943Ae4892a3C26";

  const votesData = useVotes({
    chainId: 8453,
    collectionAddress: GNARS_ADDRESSES.token,
    governorAddress: GNARS_ADDRESSES.governor,
    signerAddress: testAddress,
    enabled: true,
  });

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Votes Debug Page</h1>

      <div className="space-y-4">
        <div className="rounded-lg border p-4">
          <h2 className="text-lg font-semibold mb-2">Test Configuration</h2>
          <div className="space-y-1 text-sm font-mono">
            <p>Wallet: {testAddress}</p>
            <p>Chain ID: 8453 (Base)</p>
            <p>Token: {GNARS_ADDRESSES.token}</p>
            <p>Governor: {GNARS_ADDRESSES.governor}</p>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="text-lg font-semibold mb-2">Hook Results</h2>
          <div className="space-y-1 text-sm">
            <p>Loading: {votesData.isLoading ? "Yes" : "No"}</p>
            <p>Voting Power: {votesData.votingPower.toString()}</p>
            <p>Has Voting Power: {votesData.hasVotingPower ? "Yes" : "No"}</p>
            <p>Is Delegating: {votesData.isDelegating ? "Yes" : "No"}</p>
            <p>Delegated To: {votesData.delegatedTo || "N/A"}</p>
            <p>Proposal Threshold: {votesData.proposalThreshold.toString()}</p>
            <p>Has Threshold: {votesData.hasThreshold ? "Yes" : "No"}</p>
            <p>Votes Required: {votesData.proposalVotesRequired.toString()}</p>
            <p>Total Votes: {votesData.votes.toString()}</p>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="text-lg font-semibold mb-2">Raw Data (JSON)</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(
              votesData,
              (key, value) => (typeof value === "bigint" ? value.toString() : value),
              2,
            )}
          </pre>
        </div>
      </div>
    </div>
  );
}
