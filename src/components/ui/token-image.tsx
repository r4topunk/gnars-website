"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface TokenImageProps {
  src?: string | null;
  tokenId: string | number;
  size?: number;
  className?: string;
}

/**
 * Renders a token image handling both data URIs (on-chain SVGs from Builder metadata)
 * and regular URLs (IPFS/HTTP). Falls back to a placeholder on error.
 */
export function TokenImage({ src, tokenId, size = 96, className }: TokenImageProps) {
  const [errored, setErrored] = useState(false);
  const isDataUri = src?.startsWith("data:");

  if (!src || errored) {
    return (
      <div
        className={cn("rounded-lg bg-muted flex items-center justify-center text-muted-foreground", className)}
        style={{ width: size, height: size }}
      >
        <span className="text-xs font-bold">#{String(tokenId)}</span>
      </div>
    );
  }

  if (isDataUri) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`Token #${tokenId}`}
        className={cn("rounded-lg object-cover", className)}
        style={{ width: size, height: size }}
        onError={() => setErrored(true)}
      />
    );
  }

  return (
    <div className={cn("relative rounded-lg overflow-hidden bg-muted", className)} style={{ width: size, height: size }}>
      <Image
        src={src}
        alt={`Token #${tokenId}`}
        fill
        className="object-cover"
        sizes={`${size}px`}
        unoptimized
        onError={() => setErrored(true)}
      />
    </div>
  );
}
