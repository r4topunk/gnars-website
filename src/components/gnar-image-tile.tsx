"use client";

import Image from "next/image";

interface GnarImageTileProps {
  imageUrl?: string;
  tokenId: string | number;
}

export function GnarImageTile({ imageUrl, tokenId }: GnarImageTileProps) {
  return (
    <div className="aspect-square bg-gray-100 dark:bg-gray-800 relative rounded-xl overflow-hidden">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={`Gnar ${tokenId}`}
          fill
          className="object-cover rounded-xl"
          loading="lazy"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw"
          quality={30}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <div className="text-4xl font-bold mb-1">#{tokenId}</div>
            <div className="text-xs">Gnar NFT</div>
          </div>
        </div>
      )}
    </div>
  );
}


