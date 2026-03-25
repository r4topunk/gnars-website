// src/components/auction/BidItem.tsx
"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { MessageSquare } from "lucide-react";
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

      {comment && (
        <div className="mt-2 flex items-start gap-1.5">
          <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-indigo-400" />
          <p className="rounded border-l-2 border-indigo-500/50 bg-indigo-500/5 px-2 py-1 text-xs text-indigo-300">
            {comment.length > 140 ? `${comment.slice(0, 140)}…` : comment}
          </p>
        </div>
      )}

      <div className="mt-1.5 text-right text-[10px] text-muted-foreground">
        {timeAgo}
      </div>
    </div>
  );
}
