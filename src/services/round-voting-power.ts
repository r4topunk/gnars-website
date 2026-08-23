import "server-only";
import { getAddress, isAddress } from "viem";
import { DAO_ADDRESSES } from "@/lib/config";
import { serverPublicClient } from "@/lib/rpc";

const gnarsVotesAbi = [
  {
    type: "function",
    name: "getPastVotes",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      // Named "timepoint" per ERC-5805; the Gnars token runs timestamp clock
      // mode (ERC-6372), so this is a UNIX TIMESTAMP, not a block number —
      // the same fact useCastVote.ts documents for onchain proposal voting.
      { name: "timepoint", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

/**
 * Delegated Gnars voting power AT A FIXED SNAPSHOT, not live.
 *
 * Live `getVotes` would let the same Gnars vote in one round N times:
 * A delegates to B, B votes, A re-delegates to C, C votes — vote usage is
 * tracked per wallet, so every hop arrives with fresh usage and full power.
 * Delegation is free, so 10 Gnars plus N empty wallets would be N ballots.
 *
 * Reading `getPastVotes` at the round's voting-open instant closes that: the
 * checkpoint is immutable, and those 10 Gnars sat in exactly ONE wallet's
 * checkpoint at that timestamp. Re-delegating afterwards moves nothing. This
 * is the same snapshot model the DAO's onchain governor uses for proposals,
 * and the policy that comes with it — delegating transfers the vote; a holder
 * who delegated does not vote, their delegate does.
 */
export async function getDelegatedGnarsVotingPower(
  walletAddress: string | null | undefined,
  snapshotTimestamp: number,
) {
  if (!walletAddress || !isAddress(walletAddress)) return 0;
  // A future timepoint makes ERC-5805 revert (FutureLookup); a round whose
  // voting has not opened has no snapshot yet, and nobody can vote in it
  // anyway — 0 is the true answer, not a degraded one.
  if (!Number.isFinite(snapshotTimestamp) || snapshotTimestamp * 1000 > Date.now()) return 0;

  const normalizedWallet = getAddress(walletAddress);

  try {
    const votes = await serverPublicClient.readContract({
      address: DAO_ADDRESSES.token,
      abi: gnarsVotesAbi,
      functionName: "getPastVotes",
      args: [normalizedWallet, BigInt(snapshotTimestamp)],
    });

    return toSafeInteger(votes);
  } catch (error) {
    console.error("[rounds] failed to read delegated Gnars voting power", {
      walletAddress: normalizedWallet,
      tokenAddress: DAO_ADDRESSES.token,
      snapshotTimestamp,
      error,
    });
    return 0;
  }
}

function toSafeInteger(value: bigint) {
  return value > BigInt(Number.MAX_SAFE_INTEGER) ? Number.MAX_SAFE_INTEGER : Number(value);
}
