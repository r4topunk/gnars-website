"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AddressDisplay } from "@/components/ui/address-display";

export interface GnarCardProps {
  tokenId: string | number | bigint;
  imageUrl?: string;
  title?: string;
  subtitle?: string;
  variant?: "tile" | "card" | "preview";
  size?: "sm" | "md" | "lg";
  showBadge?: boolean;
  badgeText?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  className?: string;
  imageClassName?: string;
  contentClassName?: string;
  priority?: boolean;
  onClick?: () => void;
  // Optional auction/details panel (matches member page pattern)
  dateLabel?: string;
  finalBidEth?: string | null;
  winnerAddress?: string | null;
}

export function GnarCard({
  tokenId,
  imageUrl,
  title,
  subtitle,
  variant = "tile",
  size = "md",
  showBadge = false,
  badgeText,
  badgeVariant = "default",
  className,
  imageClassName,
  contentClassName,
  priority = false,
  onClick,
  dateLabel,
  finalBidEth,
  winnerAddress,
}: GnarCardProps) {
  const sizeClasses = {
    sm: "text-2xl",
    md: "text-4xl",
    lg: "text-6xl",
  };

  const titleSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
  };

  const subtitleSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const renderImage = () => (
    <div
      className={cn(
        "aspect-square bg-gray-100 dark:bg-gray-800 relative overflow-hidden",
        // Match auctions card look: rounded-xl for tile and card; preview keeps rounded-lg
        variant === "preview" ? "rounded-lg" : "rounded-xl",
        imageClassName
      )}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={`Gnar ${tokenId}`}
          fill
          className={cn(
            "object-cover",
            variant === "preview" ? "rounded-lg" : "rounded-xl"
          )}
          loading={priority ? "eager" : "lazy"}
          priority={priority}
          sizes={
            variant === "preview"
              ? "(max-width: 1024px) 100vw, 50vw"
              : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw"
          }
          quality={variant === "preview" ? 80 : 30}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <div className={cn("font-bold mb-1", sizeClasses[size])}>#{tokenId}</div>
            <div className={cn("text-muted-foreground", subtitleSizeClasses[size])}>
              Gnar NFT
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    if (variant === "tile") {
      return null;
    }

    const hasDetails = Boolean(dateLabel || finalBidEth !== undefined || winnerAddress !== undefined);

    if (hasDetails) {
      const finalText = finalBidEth && finalBidEth !== "-" ? `${finalBidEth} ETH` : "-";
      return (
        <div className={cn("space-y-2", contentClassName)}>
          <div className="flex items-top justify-between">
            <h3 className={cn("font-semibold", titleSizeClasses[size])}>{`Gnar #${String(tokenId)}`}</h3>
            {dateLabel ? <div className="text-xs text-muted-foreground pt-1">{dateLabel}</div> : null}
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Final bid</div>
            <div className="font-bold text-lg">{finalText}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Winner</div>
            <div className="font-mono text-sm">
              {finalText === "-" ? (
                "-"
              ) : winnerAddress ? (
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
        </div>
      );
    }

    return (
      <div className={cn("space-y-2", contentClassName)}>
        {title && (
          <h3 className={cn("font-semibold", titleSizeClasses[size])}>
            {title}
          </h3>
        )}
        {subtitle && (
          <p className={cn("text-muted-foreground", subtitleSizeClasses[size])}>
            {subtitle}
          </p>
        )}
      </div>
    );
  };

  if (variant === "tile") {
    return (
      <div className={cn("relative", className)} onClick={onClick}>
        {renderImage()}
        {showBadge && badgeText && (
          <Badge
            variant={badgeVariant}
            className="absolute top-2 right-2"
          >
            {badgeText}
          </Badge>
        )}
      </div>
    );
  }

  if (variant === "preview") {
    return (
      <div className={cn("relative", className)} onClick={onClick}>
        {renderImage()}
        {showBadge && badgeText && (
          <Badge
            variant={badgeVariant}
            className="absolute top-2 right-2"
          >
            {badgeText}
          </Badge>
        )}
        {renderContent()}
      </div>
    );
  }

  // Card variant
  return (
    <Card
      className={cn(
        "overflow-hidden hover:shadow-md transition-shadow",
        onClick ? "cursor-pointer" : "",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="space-y-4 px-4">
        {renderImage()}
        {renderContent()}
      </CardContent>
    </Card>
  );
}
