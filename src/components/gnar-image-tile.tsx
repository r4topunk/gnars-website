"use client";

import { GnarCard } from "./gnar-card";

interface GnarImageTileProps {
  imageUrl?: string;
  tokenId: string | number;
}

export function GnarImageTile({ imageUrl, tokenId }: GnarImageTileProps) {
  return (
    <GnarCard
      tokenId={tokenId}
      imageUrl={imageUrl}
      variant="tile"
      size="md"
    />
  );
}


