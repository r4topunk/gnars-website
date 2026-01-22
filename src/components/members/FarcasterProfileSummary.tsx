"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { FarcasterProfile } from "@/services/farcaster";

const numberFormatter = new Intl.NumberFormat("en-US");

interface FarcasterProfileSummaryProps {
  profile?: FarcasterProfile | null;
  size?: "sm" | "md";
  bioLines?: 1 | 2 | 3;
  loading?: boolean;
  className?: string;
}

const sizeStyles = {
  sm: {
    avatar: "h-7 w-7",
    name: "text-sm",
    meta: "text-xs",
  },
  md: {
    avatar: "h-10 w-10",
    name: "text-base",
    meta: "text-sm",
  },
};

function formatCount(value: number | undefined | null) {
  return numberFormatter.format(value ?? 0);
}

export function FarcasterProfileSummary({
  profile,
  size = "sm",
  bioLines = 2,
  loading = false,
  className,
}: FarcasterProfileSummaryProps) {
  if (loading) {
    return (
      <div className={cn("text-xs text-muted-foreground", className)}>Loading Farcaster...</div>
    );
  }

  if (!profile) {
    return (
      <div className={cn("text-xs text-muted-foreground", className)}>Farcaster: Not linked</div>
    );
  }

  const styles = sizeStyles[size];
  const displayName = profile.displayName || profile.username;
  const username = profile.username ? `@${profile.username}` : "";
  const bioClass =
    bioLines === 1 ? "line-clamp-1" : bioLines === 2 ? "line-clamp-2" : "line-clamp-3";

  return (
    <div className={cn("flex items-start gap-3", className)}>
      <Avatar className={styles.avatar}>
        <AvatarImage src={profile.pfpUrl ?? ""} alt={profile.username || "Farcaster"} />
        <AvatarFallback className="text-[10px] font-semibold">
          {(profile.username || "FC").slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={cn("font-semibold", styles.name)}>{displayName}</span>
          {username ? (
            <span className={cn("text-muted-foreground", styles.meta)}>{username}</span>
          ) : null}
        </div>
        <div className={cn("text-muted-foreground", styles.meta)}>
          {formatCount(profile.followerCount)} followers / {formatCount(profile.followingCount)}{" "}
          following
        </div>
        {profile.bio ? (
          <div className={cn("mt-1 text-muted-foreground", styles.meta, bioClass)}>
            {profile.bio}
          </div>
        ) : null}
      </div>
    </div>
  );
}
