"use client";

import { GnarCard } from "@/components/auctions/GnarCard";

interface GnarImageTileProps {
  imageUrl?: string;
  tokenId: string | number;
}

export function GnarImageTile({ imageUrl, tokenId }: GnarImageTileProps) {
  return (
    <GnarCard tokenId={tokenId} imageUrl={imageUrl} />
  );
}


