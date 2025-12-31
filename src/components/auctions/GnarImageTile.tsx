"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface GnarImageTileProps {
  imageUrl?: string;
  tokenId: string | number;
  className?: string;
}

export function GnarImageTile({ imageUrl, tokenId, className }: GnarImageTileProps) {
  return (
    <div className={cn("relative aspect-square overflow-hidden rounded-xl bg-muted", className)}>
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={`Gnar ${tokenId}`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 90vw, 512px"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <div className="font-bold mb-1 text-4xl">#{String(tokenId)}</div>
            <div className="text-muted-foreground text-sm">Gnar NFT</div>
          </div>
        </div>
      )}
    </div>
  );
}
