"use client";

import { useEffect, useState } from "react";
import { GnarCard } from "@/components/auctions/GnarCard";
import { LoadingGridSkeleton } from "@/components/skeletons/loading-grid-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { GNARS_ADDRESSES } from "@/lib/config";
import { subgraphQuery } from "@/lib/subgraph";

interface NftHoldingsProps {
  treasuryAddress: string;
}

type TreasuryTokensQuery = {
  tokens: Array<{
    tokenId: string;
    image?: string | null;
    mintedAt?: string | null;
    auction?: {
      endTime: string;
      settled: boolean;
      highestBid?: { amount: string; bidder: string } | null;
      winningBid?: { amount: string; bidder: string } | null;
    } | null;
  }>;
};

const TREASURY_TOKENS_GQL = /* GraphQL */ `
  query TreasuryTokens($dao: ID!, $owner: Bytes!, $first: Int!, $skip: Int!) {
    tokens(
      where: { dao: $dao, owner: $owner }
      orderBy: tokenId
      orderDirection: asc
      first: $first
      skip: $skip
    ) {
      tokenId
      image
      mintedAt
      auction {
        endTime
        settled
        highestBid {
          amount
          bidder
        }
        winningBid {
          amount
          bidder
        }
      }
    }
  }
`;

export function NftHoldings({ treasuryAddress }: NftHoldingsProps) {
  const [tokens, setTokens] = useState<
    Array<{
      id: number;
      imageUrl?: string;
      dateLabel?: string;
      finalBidEth?: string | null;
      winnerAddress?: string | null;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        setIsLoading(true);
        setError(null);
        const dao = GNARS_ADDRESSES.token.toLowerCase();
        const owner = treasuryAddress.toLowerCase();

        // Fetch all tokens using pagination (max 1000 per query in The Graph)
        const BATCH_SIZE = 1000;
        let allTokens: TreasuryTokensQuery["tokens"] = [];
        let skip = 0;
        let hasMore = true;

        while (hasMore && !ignore) {
          const data = await subgraphQuery<TreasuryTokensQuery>(TREASURY_TOKENS_GQL, {
            dao,
            owner,
            first: BATCH_SIZE,
            skip,
          });

          if (ignore) return;

          const tokens = data.tokens || [];
          allTokens = [...allTokens, ...tokens];

          // If we got less than BATCH_SIZE results, we've reached the end
          hasMore = tokens.length === BATCH_SIZE;
          skip += BATCH_SIZE;
        }

        if (ignore) return;

        const mapped = allTokens.map((t) => {
          const endTime = t.auction?.endTime ? Number(t.auction.endTime) : undefined;
          const mintedAt = t.mintedAt ? Number(t.mintedAt) : undefined;
          const dateLabel = endTime
            ? new Date(endTime * 1000).toLocaleDateString()
            : mintedAt
              ? new Date(mintedAt * 1000).toLocaleDateString()
              : undefined;
          const finalBidWei = t.auction?.winningBid?.amount ?? t.auction?.highestBid?.amount;
          const finalBidEth = finalBidWei
            ? (() => {
                try {
                  const eth = Number(finalBidWei) / 1e18;
                  return eth.toFixed(3).replace(/\.0+$/, "");
                } catch {
                  return null;
                }
              })()
            : null;
          const winner = t.auction?.winningBid?.bidder ?? null;
          return {
            id: Number(t.tokenId),
            imageUrl: t.image ?? undefined,
            dateLabel,
            finalBidEth,
            winnerAddress: finalBidEth ? winner : null,
          };
        });
        setTokens(mapped);
      } catch (err) {
        console.error("Error fetching treasury NFTs:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch NFT holdings");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [treasuryAddress]);

  if (isLoading) {
    return <LoadingGridSkeleton items={8} />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">Error loading NFT holdings: {error}</div>
        </CardContent>
      </Card>
    );
  }

  if (tokens.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground py-12">
            <div className="text-lg font-medium mb-2">No NFTs found</div>
            <div className="text-sm">The treasury currently holds no Gnars</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Gnars in Treasury</h3>
          <p className="text-sm text-muted-foreground">
            {tokens.length} Gnar{tokens.length !== 1 ? "s" : ""} found
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {tokens.map((t) => (
          <GnarCard
            key={`gnar-${t.id}`}
            tokenId={t.id}
            imageUrl={t.imageUrl}
            dateLabel={t.dateLabel}
            finalBidEth={t.finalBidEth ?? null}
            winnerAddress={t.winnerAddress ?? null}
          />
        ))}
      </div>
    </div>
  );
}
