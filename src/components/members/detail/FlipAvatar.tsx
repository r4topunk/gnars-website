"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface FlipAvatarProps {
  address: string;
  ensAvatar?: string | null;
  zoraAvatar?: string | null;
  displayName?: string | null;
  size?: "sm" | "md" | "lg";
}

export function FlipAvatar({
  address,
  ensAvatar,
  zoraAvatar,
  displayName,
  size = "lg",
}: FlipAvatarProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const sizeClasses = {
    sm: "h-12 w-12",
    md: "h-16 w-16",
    lg: "h-20 w-20",
  };

  const hasBothAvatars = ensAvatar && zoraAvatar && ensAvatar !== zoraAvatar;

  return (
    <div
      className={cn("relative", sizeClasses[size])}
      style={{ perspective: "1000px" }}
      onMouseEnter={() => hasBothAvatars && setIsFlipped(true)}
      onMouseLeave={() => hasBothAvatars && setIsFlipped(false)}
    >
      <div
        className={cn(
          "relative w-full h-full transition-transform duration-500",
          hasBothAvatars && "cursor-pointer",
        )}
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front face - ENS Avatar */}
        <div
          className="absolute inset-0"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          <Avatar className={cn("w-full h-full", hasBothAvatars && "ring-2 ring-primary/20")}>
            {ensAvatar && <AvatarImage src={ensAvatar} alt={displayName ?? address} />}
            <AvatarFallback>{address.slice(2, 4).toUpperCase()}</AvatarFallback>
          </Avatar>
          {hasBothAvatars && (
            <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
              ENS
            </div>
          )}
        </div>

        {/* Back face - Zora Avatar */}
        {hasBothAvatars && (
          <div
            className="absolute inset-0"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <Avatar className="w-full h-full ring-2 ring-purple-500/50">
              <AvatarImage src={zoraAvatar ?? ""} alt={`${displayName ?? address} (Zora)`} />
              <AvatarFallback>{address.slice(2, 4).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="absolute bottom-0 right-0 bg-purple-500 text-white rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
              ZORA
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
