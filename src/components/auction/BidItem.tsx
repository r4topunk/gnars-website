// src/components/auction/BidItem.tsx
"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { formatEther } from "viem";
import { AddressDisplay } from "@/components/ui/address-display";
import { cn } from "@/lib/utils";

interface BidItemProps {
  bidder: string;
  amount: string; // wei
  bidTime: number; // unix timestamp
  comment: string | null;
  isNew?: boolean;
}

function formatEth(weiStr: string): string {
  const eth = formatEther(BigInt(weiStr));
  const num = parseFloat(eth);
  return num.toFixed(num < 0.01 ? 5 : 4);
}

export function BidItem({ bidder, amount, bidTime, comment, isNew }: BidItemProps) {
  const timeAgo = formatDistanceToNowStrict(new Date(bidTime * 1000), { addSuffix: true });

  return (
    <div
      className={cn(
        "rounded-lg border border-border/50 bg-muted/30 p-3 transition-all",
        isNew && "animate-in fade-in slide-in-from-top-2 duration-500 ring-1 ring-primary/30",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <AddressDisplay
          address={bidder}
          variant="compact"
          showAvatar={true}
          avatarSize="xs"
          showCopy={false}
          showExplorer={false}
          truncateLength={4}
        />
        <span className="text-sm font-bold text-green-500 tabular-nums">
          {formatEth(amount)} ETH
        </span>
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2">
        {comment ? (
          <p className="flex-1 text-xs italic text-muted-foreground line-clamp-2 break-words">
            &ldquo;{comment}&rdquo;
          </p>
        ) : (
          <span />
        )}
        <span className="shrink-0 text-[10px] text-muted-foreground">
          {timeAgo}
        </span>
      </div>
    </div>
  );
}
