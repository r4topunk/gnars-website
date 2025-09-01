"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
        variant === "tile" ? "rounded-xl" : "rounded-lg",
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
            variant === "tile" ? "rounded-xl" : "rounded-lg"
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
        "overflow-hidden hover:shadow-md transition-shadow cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-0">
        {renderImage()}
        {renderContent() && (
          <div className="p-4">
            {renderContent()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
