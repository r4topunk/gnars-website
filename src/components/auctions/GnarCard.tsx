"use client";

import Image from "next/image";
import { AddressDisplay } from "@/components/ui/address-display";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface GnarCardProps {
  tokenId: string | number | bigint;
  imageUrl?: string;
  className?: string;
  dateLabel?: string;
  finalBidEth?: string | null;
  winnerAddress?: string | null;
  showPlaceholders?: boolean;
}

export function GnarCard({
  tokenId,
  imageUrl,
  className,
  dateLabel,
  finalBidEth,
  winnerAddress,
  showPlaceholders = false,
}: GnarCardProps) {
  return (
    <Card className={cn("overflow-hidden hover:shadow-md transition-shadow", className)}>
      <CardContent className="space-y-4 px-4">
        <div className="aspect-square bg-gray-100 dark:bg-gray-800 relative overflow-hidden rounded-xl">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={`Gnar ${tokenId}`}
              fill
              className={cn("object-cover rounded-xl")}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw"
              quality={30}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <div className={cn("font-bold mb-1 text-4xl")}>#{String(tokenId)}</div>
                <div className={cn("text-muted-foreground text-sm")}>Gnar NFT</div>
              </div>
            </div>
          )}
        </div>

        <div className={cn("space-y-2")}>
          <div className="flex items-top justify-between">
            <h3 className={cn("font-semibold text-base")}>{`Gnar #${String(tokenId)}`}</h3>
            {dateLabel ? (
              <div className="text-xs text-muted-foreground pt-1">{dateLabel}</div>
            ) : null}
          </div>

          {(finalBidEth != null || showPlaceholders) && (
            <div>
              <div className="text-sm text-muted-foreground">Final bid</div>
              <div className="font-bold text-lg">
                {finalBidEth != null ? `${finalBidEth} ETH` : "-"}
              </div>
            </div>
          )}

          {(finalBidEth != null || showPlaceholders) && (
            <div>
              <div className="text-sm text-muted-foreground">Winner</div>
              <div className="font-mono text-sm">
                {winnerAddress != null && finalBidEth != null ? (
                  <AddressDisplay
                    address={winnerAddress}
                    variant="compact"
                    showAvatar={false}
                    showCopy={false}
                    showExplorer={false}
                  />
                ) : (
                  "-"
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
