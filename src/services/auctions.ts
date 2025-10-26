import { formatEther } from "viem";
import { GNARS_ADDRESSES } from "@/lib/config";
import { subgraphQuery } from "@/lib/subgraph";

export type PastAuction = {
  id: string;
  tokenId: string;
  imageUrl?: string;
  finalBid: string;
  winner: string;
  endTime: Date;
  settled: boolean;
};

type AuctionsQuery = {
  auctions: Array<{
    id: string;
    endTime: string;
    settled: boolean;
    token: {
      id: string;
      tokenId: string;
      image?: string | null;
    };
    highestBid?: {
      amount: string;
      bidder: string;
    } | null;
    winningBid?: {
      amount: string;
      bidder: string;
    } | null;
    dao: { id: string };
  }>;
};

const AUCTIONS_GQL = /* GraphQL */ `
  query RecentSettledAuctions($where: Auction_filter, $first: Int!) {
    auctions(where: $where, orderBy: endTime, orderDirection: desc, first: $first) {
      id
      endTime
      settled
      token {
        id
        tokenId
        image
      }
      highestBid {
        amount
        bidder
      }
      winningBid {
        amount
        bidder
      }
      dao {
        id
      }
    }
  }
`;

export async function fetchRecentAuctions(limit: number): Promise<PastAuction[]> {
  const where = {
    dao: GNARS_ADDRESSES.token.toLowerCase(),
    settled: true,
    bidCount_gt: 0,
  };

  const data = await subgraphQuery<AuctionsQuery>(AUCTIONS_GQL, {
    where,
    first: limit,
  });

  const toHttp = (uri?: string | null): string | undefined => {
    if (!uri) return undefined;
    if (uri.startsWith("ipfs://")) {
      return uri.replace("ipfs://", "https://ipfs.io/ipfs/");
    }
    return uri;
  };

  return (data.auctions || []).map((a) => {
    const amountWei = a.winningBid?.amount ?? a.highestBid?.amount ?? "0";
    const amountEth = formatEther(BigInt(amountWei));
    const winner =
      a.winningBid?.bidder ?? a.highestBid?.bidder ?? "0x0000000000000000000000000000000000000000";

    return {
      id: a.id ?? a.token.id,
      tokenId: a.token.tokenId,
      imageUrl: toHttp(a.token.image) ?? undefined,
      finalBid: parseFloat(amountEth).toFixed(3),
      winner,
      endTime: new Date(Number(a.endTime) * 1000),
      settled: a.settled,
    };
  });
}

export async function fetchAllAuctions(limit?: number): Promise<PastAuction[]> {
  const where = {
    dao: GNARS_ADDRESSES.token.toLowerCase(),
    settled: true,
  };

  const data = await subgraphQuery<AuctionsQuery>(AUCTIONS_GQL, {
    where,
    first: limit ?? 1000,
  });

  const toHttp = (uri?: string | null): string | undefined => {
    if (!uri) return undefined;
    if (uri.startsWith("ipfs://")) {
      return uri.replace("ipfs://", "https://ipfs.io/ipfs/");
    }
    return uri;
  };

  return (data.auctions || []).map((a) => {
    const amountWei = a.winningBid?.amount ?? a.highestBid?.amount ?? "0";
    const amountEth = formatEther(BigInt(amountWei));
    const winner =
      a.winningBid?.bidder ?? a.highestBid?.bidder ?? "0x0000000000000000000000000000000000000000";

    return {
      id: a.id ?? a.token.id,
      tokenId: a.token.tokenId,
      imageUrl: toHttp(a.token.image) ?? undefined,
      finalBid: parseFloat(amountEth).toFixed(3),
      winner,
      endTime: new Date(Number(a.endTime) * 1000),
      settled: a.settled,
    };
  });
}

export type NFTToken = {
  tokenId: string;
  imageUrl?: string;
  owner?: string;
};

type AllTokensQuery = {
  tokens: Array<{
    tokenId: string;
    image?: string | null;
    ownerInfo?: {
      owner: string;
    } | null;
  }>;
};

const ALL_TOKENS_GQL = /* GraphQL */ `
  query AllTokens($dao: ID!, $first: Int!, $skip: Int!) {
    tokens(
      where: { dao: $dao }
      orderBy: tokenId
      orderDirection: asc
      first: $first
      skip: $skip
    ) {
      tokenId
      image
      ownerInfo {
        owner
      }
    }
  }
`;

export async function fetchAllNFTTokens(): Promise<NFTToken[]> {
  const dao = GNARS_ADDRESSES.token.toLowerCase();
  const pageSize = 500;
  const allTokens: NFTToken[] = [];
  let skip = 0;

  const normalizeImageUrl = (uri?: string | null): string | undefined => {
    if (!uri) return undefined;
    
    // Handle IPFS URLs
    if (uri.startsWith("ipfs://")) {
      return uri.replace("ipfs://", "https://ipfs.io/ipfs/");
    }
    
    // Handle HTTP URLs - already formatted correctly
    if (uri.startsWith("http://") || uri.startsWith("https://")) {
      return uri;
    }
    
    // Handle data URIs
    if (uri.startsWith("data:")) {
      return uri;
    }
    
    return uri;
  };

  console.log("[fetchAllNFTTokens] Starting fetch for DAO:", dao);

  // Paginate through all tokens
  while (true) {
    console.log(`[fetchAllNFTTokens] Fetching page: skip=${skip}, first=${pageSize}`);
    
    const data = await subgraphQuery<AllTokensQuery>(ALL_TOKENS_GQL, {
      dao,
      first: pageSize,
      skip,
    });

    const tokens = data.tokens || [];
    console.log(`[fetchAllNFTTokens] Received ${tokens.length} tokens from subgraph`);
    
    if (tokens.length === 0) break;

    // Log first token to see structure
    if (skip === 0 && tokens.length > 0) {
      console.log("[fetchAllNFTTokens] Sample token:", tokens[0]);
    }

    // Map all tokens (even without explicit owner, as they're part of the DAO)
    const mapped = tokens
      .filter((t) => t.image) // Only include tokens with images
      .map((t) => ({
        tokenId: t.tokenId,
        imageUrl: normalizeImageUrl(t.image),
        owner: t.ownerInfo?.owner,
      }));

    console.log(`[fetchAllNFTTokens] Mapped ${mapped.length} tokens with images`);
    
    if (mapped.length > 0 && skip === 0) {
      console.log("[fetchAllNFTTokens] Sample mapped token:", mapped[0]);
    }

    allTokens.push(...mapped);

    if (tokens.length < pageSize) break;
    skip += pageSize;
  }

  console.log(`[fetchAllNFTTokens] Total tokens fetched: ${allTokens.length}`);
  return allTokens;
}
