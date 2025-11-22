import { cache } from "react";
import {
  getProfileBalances,
  setApiKey,
  type GetProfileBalancesQuery
} from "@zoralabs/coins-sdk";
import { ZoraCoinHoldingsClient, type ZoraCoin } from "./ZoraCoinHoldingsClient";

// SDK response types matching reference script
interface BalanceEdge {
  node?: {
    balance?: string;
    id?: string;
    coin?: {
      id?: string;
      address?: string;
      symbol?: string;
      name?: string;
      tokenPrice?: {
        priceInUsdc?: string;
      };
      marketCap?: string;
      image?: {
        small?: string;
        medium?: string;
        large?: string;
      };
      mediaContent?: {
        previewImage?: {
          small?: string;
          medium?: string;
          large?: string;
          blurhash?: string | null;
        } | string;
      };
      chainId?: number;
      volume24h?: string;
      creator?: {
        address?: string;
        displayName?: string;
        handle?: string;
        avatar?: {
          medium?: string;
          small?: string;
          large?: string;
        };
      };
    };
    balanceUsd?: number;
    usdValue?: number;
  };
}

interface ProfileBalancesData {
  profile?: {
    coinBalances?: {
      edges?: BalanceEdge[];
      pageInfo?: {
        hasNextPage?: boolean;
        endCursor?: string | null;
      };
    };
  };
}

const loadZoraCoins = cache(async (treasuryAddress: string): Promise<ZoraCoin[]> => {
  // Validate input
  if (!treasuryAddress || !treasuryAddress.startsWith("0x")) {
    throw new Error("Invalid treasury address");
  }

  // Set API key if available (optional for read queries)
  const apiKey = process.env.NEXT_PUBLIC_ZORA_API_KEY;
  if (apiKey) {
    setApiKey(apiKey);
  }

  try {
    // Query with proper parameters matching reference script
    const query: GetProfileBalancesQuery = {
      identifier: treasuryAddress,
      count: 100, // Fetch up to 100 holdings
      excludeHidden: false,
    };

    const response = await getProfileBalances(query);

    // Check if response has data (matching reference script pattern)
    const responseWithData = response as { data?: ProfileBalancesData };
    if (!response || !responseWithData.data) {
      console.warn("No response data from Zora API for", treasuryAddress);
      return [];
    }

    // Extract balances from edges structure
    const balanceEdges = responseWithData.data.profile?.coinBalances?.edges || [];

    if (balanceEdges.length === 0) {
      return [];
    }

    // Transform SDK response to our format
    const coins: ZoraCoin[] = balanceEdges
      .filter((edge: BalanceEdge) => {
        const node = edge.node;
        // Only include balances with actual value
        return node?.balance && BigInt(node.balance) > 0n;
      })
      .map((edge: BalanceEdge) => {
        const node = edge.node!;
        const coin = node.coin!;

        // Calculate balance from raw value (assuming 18 decimals)
        const rawBalance = BigInt(node.balance || "0");
        const balance = Number(rawBalance) / 1e18;

        // Calculate USD value from balance and price
        let usdValue = node.balanceUsd || node.usdValue || 0;
        if (!usdValue && coin.tokenPrice?.priceInUsdc) {
          const priceUsd = parseFloat(coin.tokenPrice.priceInUsdc);
          usdValue = balance * priceUsd;
        }

        // Get image URL - prioritize small size for performance
        let imageUrl: string | undefined;

        // Try mediaContent.previewImage first
        if (coin.mediaContent?.previewImage) {
          const previewImage = coin.mediaContent.previewImage;
          if (typeof previewImage === 'object' && 'small' in previewImage) {
            imageUrl = previewImage.small || previewImage.medium;
          } else if (typeof previewImage === 'string') {
            imageUrl = previewImage;
          }
        }

        // Fallback to coin.image
        if (!imageUrl && coin.image) {
          if (typeof coin.image === 'object' && 'small' in coin.image) {
            imageUrl = coin.image.small || coin.image.medium;
          } else if (typeof coin.image === 'string') {
            imageUrl = coin.image;
          }
        }

        const coinData = {
          id: coin.id || coin.address || "unknown",
          address: coin.address || "",
          name: coin.name || "Unknown",
          symbol: coin.symbol || "???",
          chainId: coin.chainId || 8453, // Default to Base
          balance,
          balanceRaw: node.balance || "0",
          usdValue,
          marketCap: coin.marketCap ? parseFloat(coin.marketCap) : 0,
          volume24h: coin.volume24h ? parseFloat(coin.volume24h) : 0,
          image: imageUrl,
          creatorAddress: coin.creator?.address,
          creatorName: coin.creator?.displayName || coin.creator?.handle,
        };

        console.log("Server - Coin data:", { name: coin.name, imageUrl, rawImage: coin.image });

        return coinData;
      });

    // Sort by USD value descending
    coins.sort((a, b) => b.usdValue - a.usdValue);

    return coins;
  } catch (error) {
    console.error("Error fetching Zora coin balances:", error);
    throw error;
  }
});

interface ZoraCoinHoldingsProps {
  treasuryAddress: string;
}

export async function ZoraCoinHoldings({ treasuryAddress }: ZoraCoinHoldingsProps) {
  try {
    const coins = await loadZoraCoins(treasuryAddress);
    return <ZoraCoinHoldingsClient coins={coins} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load Zora coin holdings";
    return <ZoraCoinHoldingsClient coins={[]} error={message} />;
  }
}
