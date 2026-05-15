"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface GnarImageTileProps {
  imageUrl?: string;
  tokenId: string | number;
  className?: string;
}

export function GnarImageTile({ imageUrl, tokenId, className }: GnarImageTileProps) {
  const t = useTranslations("auctions");
  const [errored, setErrored] = useState(false);
  const isDataUri = imageUrl?.startsWith("data:");

  return (
    <div className={cn("relative aspect-square overflow-hidden rounded-xl bg-muted", className)}>
      {imageUrl && !errored ? (
        isDataUri ? (
          // data: URIs (on-chain SVGs from Builder metadata) can't use Next.js Image optimizer
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={`Token #${tokenId}`}
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setErrored(true)}
          />
        ) : (
          <Image
            src={imageUrl}
            alt={`Token #${tokenId}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 90vw, 512px"
            onError={() => setErrored(true)}
            unoptimized
          />
        )
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <div className="font-bold mb-1 text-4xl">#{String(tokenId)}</div>
            <div className="text-muted-foreground text-sm">{t("card.imageFallbackLabel")}</div>
          </div>
        </div>
      )}
    </div>
  );
}
