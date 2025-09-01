"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GnarCard } from "@/components/gnar-card";

interface NftHoldingsProps {
  treasuryAddress: string;
}

interface NFT {
  tokenId: string;
  tokenType: string;
  name?: string;
  description?: string;
  image?: {
    originalUrl?: string;
    thumbnailUrl?: string;
    pngUrl?: string;
  };
  media?: Array<{
    gateway: string;
    thumbnail?: string;
    raw?: string;
    format?: string;
  }>;
  contract: {
    address: string;
    name?: string;
    symbol?: string;
  };
  tokenUri?: {
    gateway?: string;
    raw?: string;
  };
}

interface AlchemyNftResponse {
  ownedNfts: NFT[];
  totalCount: number;
  pageKey?: string;
}

export function NftHoldings({ treasuryAddress }: NftHoldingsProps) {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNftHoldings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch NFTs using Alchemy API
      const response = await fetch("/api/alchemy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "alchemy_getNfts",
          params: [treasuryAddress, { withMetadata: true }],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch NFT holdings");
      }

      const data = await response.json();
      const nftData: AlchemyNftResponse = data.result;

      setNfts(nftData.ownedNfts || []);
    } catch (err) {
      console.error("Error fetching NFT holdings:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch NFT holdings");
    } finally {
      setIsLoading(false);
    }
  }, [treasuryAddress]);

  useEffect(() => {
    fetchNftHoldings();
  }, [fetchNftHoldings]);

  const getImageUrl = (nft: NFT): string | null => {
    // Try multiple image sources in order of preference
    if (nft.image?.thumbnailUrl) return nft.image.thumbnailUrl;
    if (nft.image?.pngUrl) return nft.image.pngUrl;
    if (nft.image?.originalUrl) return nft.image.originalUrl;
    if (nft.media && nft.media[0]) {
      return nft.media[0].thumbnail || nft.media[0].gateway;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="aspect-square w-full mb-3 rounded-lg" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
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

  if (nfts.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground py-12">
            <div className="text-lg font-medium mb-2">No NFTs found</div>
            <div className="text-sm">The treasury currently holds no NFTs</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">NFT Collection</h3>
          <p className="text-sm text-muted-foreground">
            {nfts.length} NFT{nfts.length !== 1 ? "s" : ""} found
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {nfts.map((nft) => {
          const imageUrl = getImageUrl(nft);

          return (
            <GnarCard
              key={`${nft.contract.address}-${nft.tokenId}`}
              tokenId={nft.tokenId}
              imageUrl={imageUrl || undefined}
              title={nft.name || `Token #${nft.tokenId}`}
              subtitle={nft.contract.name || "Unknown Collection"}
              variant="card"
              size="sm"
              contentClassName="space-y-2"
            />
          );
        })}
      </div>
    </div>
  );
}
