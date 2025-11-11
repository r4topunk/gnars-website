"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink, User } from "lucide-react";
import { toast } from "sonner";
import { Address, isAddress } from "viem";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useENSOptimistic } from "@/hooks/use-ens";

export interface AddressDisplayProps {
  address: string | Address;
  variant?: "default" | "compact" | "detailed" | "card";
  showAvatar?: boolean;
  showENS?: boolean; // kept for API compatibility but ignored for badge
  showCopy?: boolean;
  showExplorer?: boolean;
  className?: string;
  avatarSize?: "xs" | "sm" | "md" | "lg";
  truncateLength?: number;
  customExplorerUrl?: string;
  onAddressClick?: (address: Address) => void;
}

/**
 * Comprehensive address display component with ENS resolution
 */
export function AddressDisplay({
  address,
  variant = "default",
  showAvatar = true,
  showENS = true,
  showCopy = true,
  showExplorer = true,
  className = "",
  avatarSize = "md",
  truncateLength = 6,
  customExplorerUrl,
  onAddressClick,
}: AddressDisplayProps) {
  const normalizedAddress = String(address).toLowerCase() as Address;
  const { data: ensData, isLoading } = useENSOptimistic(normalizedAddress);
  const router = useRouter();
  const isValid = isAddress(address);

  // Validate address (after hooks are called to satisfy hooks rules)
  if (!address || !isValid) {
    return (
      <div className={`inline-flex items-center gap-2 text-muted-foreground ${className}`}>
        <User className="h-4 w-4" />
        <span>Invalid Address</span>
      </div>
    );
  }

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(normalizedAddress);
      toast.success("Address copied to clipboard");
    } catch {
      toast.error("Failed to copy address");
    }
  };

  // Handle explorer link
  const handleExplorerClick = () => {
    const explorerUrl = customExplorerUrl || `https://basescan.org/address/${normalizedAddress}`;
    window.open(explorerUrl, "_blank", "noopener,noreferrer");
  };

  // Handle address click
  const handleAddressClick = () => {
    if (onAddressClick) {
      onAddressClick(normalizedAddress);
      return;
    }
    router.push(`/members/${normalizedAddress}`);
  };

  // Avatar size classes
  const avatarSizeClasses = {
    xs: "h-4 w-4",
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  // Truncate address
  const truncateAddress = (addr: string, length: number) => {
    if (addr.length <= length * 2 + 2) return addr;
    return `${addr.slice(0, length)}...${addr.slice(-length)}`;
  };

  // Generate fallback avatar
  const fallbackAvatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${normalizedAddress}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

  // Compact variant
  if (variant === "compact") {
    return (
      <div
        className={`inline-flex items-center ${avatarSize === "xs" ? "gap-1" : "gap-2"} cursor-pointer hover:text-primary ${className}`}
        onClick={handleAddressClick}
      >
        {showAvatar && (
          <Avatar className={avatarSizeClasses[avatarSize]}>
            <AvatarImage src={ensData?.avatar || fallbackAvatar} alt="Avatar" />
            <AvatarFallback className="text-xs">
              {normalizedAddress.slice(2, 4).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
        <span className="font-mono text-sm">
          {showENS && ensData?.name
            ? ensData.name
            : truncateAddress(normalizedAddress, truncateLength)}
        </span>
      </div>
    );
  }

  // Detailed variant
  if (variant === "detailed") {
    return (
      <div className={`flex items-center gap-3 p-3 border rounded-lg ${className}`}>
        {showAvatar && (
          <Avatar className={avatarSizeClasses[avatarSize]}>
            <AvatarImage src={ensData?.avatar || fallbackAvatar} alt="Avatar" />
            <AvatarFallback className="text-xs">
              {normalizedAddress.slice(2, 4).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="font-medium cursor-pointer hover:text-primary"
              onClick={handleAddressClick}
            >
              {showENS && ensData?.name ? ensData.name : "Unnamed Address"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <code className="text-sm text-muted-foreground font-mono">
              {truncateAddress(normalizedAddress, 8)}
            </code>

            <div className="flex items-center gap-1">
              {showCopy && (
                <Button variant="ghost" size="sm" onClick={handleCopy} className="h-6 w-6 p-0">
                  <Copy className="h-3 w-3" />
                </Button>
              )}

              {showExplorer && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExplorerClick}
                  className="h-6 w-6 p-0"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Card variant
  if (variant === "card") {
    return (
      <div className={`p-4 border rounded-lg hover:bg-muted/50 transition-colors ${className}`}>
        <div className="flex items-center gap-3 mb-3">
          {showAvatar && (
            <Avatar className={avatarSizeClasses[avatarSize]}>
              <AvatarImage src={ensData?.avatar || fallbackAvatar} alt="Avatar" />
              <AvatarFallback className="text-xs">
                {normalizedAddress.slice(2, 4).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="font-semibold truncate cursor-pointer hover:text-primary"
                onClick={handleAddressClick}
              >
                {showENS && ensData?.name ? ensData.name : "Unnamed Address"}
              </span>
            </div>

            <code className="text-sm text-muted-foreground font-mono">
              {truncateAddress(normalizedAddress, 10)}
            </code>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showCopy && (
            <Button variant="outline" size="sm" onClick={handleCopy} className="flex-1">
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          )}

          {showExplorer && (
            <Button variant="outline" size="sm" onClick={handleExplorerClick} className="flex-1">
              <ExternalLink className="h-4 w-4 mr-2" />
              Explorer
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {showAvatar && (
        <Avatar className={avatarSizeClasses[avatarSize]}>
          <AvatarImage src={ensData?.avatar || fallbackAvatar} alt="Avatar" />
          <AvatarFallback className="text-xs">
            {normalizedAddress.slice(2, 4).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}

      <div className="flex items-center gap-2">
        <span
          className={`font-mono cursor-pointer hover:text-primary transition-colors ${
            onAddressClick ? "cursor-pointer" : ""
          }`}
          onClick={handleAddressClick}
        >
          {showENS && ensData?.name
            ? ensData.name
            : truncateAddress(normalizedAddress, truncateLength)}
        </span>

        {isLoading && (
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        )}
      </div>

      <div className="flex items-center gap-1">
        {showCopy && (
          <Button variant="ghost" size="sm" onClick={handleCopy} className="h-6 w-6 p-0">
            <Copy className="h-3 w-3" />
          </Button>
        )}

        {showExplorer && (
          <Button variant="ghost" size="sm" onClick={handleExplorerClick} className="h-6 w-6 p-0">
            <ExternalLink className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Simple address display without ENS resolution (for performance)
 */
export function SimpleAddressDisplay({
  address,
  truncateLength = 6,
  className = "",
}: {
  address: string | Address;
  truncateLength?: number;
  className?: string;
}) {
  if (!address || !isAddress(address)) {
    return <span className={`text-muted-foreground ${className}`}>Invalid Address</span>;
  }

  const normalizedAddress = address.toLowerCase() as Address;
  const truncated = `${normalizedAddress.slice(0, truncateLength)}...${normalizedAddress.slice(-truncateLength)}`;

  return <code className={`font-mono ${className}`}>{truncated}</code>;
}

/**
 * Address display with loading skeleton
 */
export function AddressDisplaySkeleton({
  variant = "default",
  className = "",
}: {
  variant?: "default" | "compact" | "detailed" | "card";
  className?: string;
}) {
  if (variant === "compact") {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <div className="h-6 w-6 rounded-full bg-muted animate-pulse" />
        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (variant === "detailed") {
    return (
      <div className={`flex items-center gap-3 p-3 border rounded-lg ${className}`}>
        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          <div className="h-3 w-32 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className={`p-4 border rounded-lg ${className}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-28 bg-muted rounded animate-pulse" />
            <div className="h-3 w-36 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-8 flex-1 bg-muted rounded animate-pulse" />
          <div className="h-8 flex-1 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
      <div className="h-4 w-24 bg-muted rounded animate-pulse" />
    </div>
  );
}
