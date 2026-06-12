import "server-only";
import { getAddress, isAddress } from "viem";
import { DAO_ADDRESSES } from "@/lib/config";
import { serverPublicClient } from "@/lib/rpc";

const gnarsVotesAbi = [
  {
    type: "function",
    name: "getVotes",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export async function getDelegatedGnarsVotingPower(walletAddress?: string | null) {
  if (!walletAddress || !isAddress(walletAddress)) return 0;

  const normalizedWallet = getAddress(walletAddress);

  try {
    const votes = await serverPublicClient.readContract({
      address: DAO_ADDRESSES.token,
      abi: gnarsVotesAbi,
      functionName: "getVotes",
      args: [normalizedWallet],
    });

    return toSafeInteger(votes);
  } catch (error) {
    console.error("[rounds] failed to read delegated Gnars voting power", {
      walletAddress: normalizedWallet,
      tokenAddress: DAO_ADDRESSES.token,
      error,
    });
    return 0;
  }
}

function toSafeInteger(value: bigint) {
  return value > BigInt(Number.MAX_SAFE_INTEGER) ? Number.MAX_SAFE_INTEGER : Number(value);
}
