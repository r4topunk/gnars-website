import { useMemo } from "react";
import { type Address, getAddress } from "viem";
import { useReadContract } from "wagmi";
import gnarsLootboxV4Abi from "@/utils/abis/gnarsLootboxV4Abi";

export function useAllowedNft(lootboxAddress: Address, nftAddress: string) {
  const normalizedAddress = useMemo(() => {
    if (!nftAddress) return null;
    try {
      return getAddress(nftAddress.trim());
    } catch {
      return null;
    }
  }, [nftAddress]);

  return useReadContract({
    address: lootboxAddress,
    abi: gnarsLootboxV4Abi,
    functionName: "allowedERC721",
    args: normalizedAddress ? [normalizedAddress] : undefined,
    query: { enabled: Boolean(normalizedAddress) },
  });
}
