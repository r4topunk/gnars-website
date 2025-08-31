"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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

  const truncateAddress = (address: string, length = 6) => {
    if (address.length <= length * 2) return address;
    return `${address.slice(0, length)}...${address.slice(-length)}`;
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
            <Card
              key={`${nft.contract.address}-${nft.tokenId}`}
              className="overflow-hidden hover:shadow-lg transition-shadow"
            >
              <CardContent className="p-0">
                <div className="aspect-square bg-muted flex items-center justify-center relative">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={nft.name || `Token #${nft.tokenId}`}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        e.currentTarget.nextElementSibling?.classList.remove("hidden");
                      }}
                    />
                  ) : null}
                  <div className={`text-muted-foreground text-sm ${imageUrl ? "hidden" : ""}`}>
                    No image available
                  </div>
                </div>

                <div className="p-4">
                  <div className="space-y-2">
                    <div className="font-semibold text-sm">
                      {nft.name || `Token #${nft.tokenId}`}
                    </div>

                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>{nft.contract.name || "Unknown Collection"}</div>
                      <div className="font-mono">ID: {nft.tokenId}</div>
                      <div className="font-mono">{truncateAddress(nft.contract.address)}</div>
                    </div>

                    {nft.description && (
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {nft.description}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
