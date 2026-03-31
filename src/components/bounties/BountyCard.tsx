import Link from "next/link";
import { Clock, ExternalLink, Users } from "lucide-react";
import { formatEther } from "viem";
import { Button } from "@/components/ui/button";
import { CHAIN_NAMES } from "@/lib/poidh/config";
import type { PoidhBounty } from "@/types/poidh";
import { useEthPrice, formatEthToUsd } from "@/hooks/use-eth-price";

interface BountyCardProps {
  bounty: PoidhBounty;
}

/** Extract first markdown image URL from text */
function extractImageUrl(text: string): string | null {
  const match = text.match(/!\[.*?\]\((.*?)\)/);
  return match ? match[1] : null;
}

/** Strip markdown image syntax for plain text preview */
function stripMarkdownImages(text: string): string {
  return text.replace(/!\[.*?\]\(.*?\)/g, '').replace(/Thumbnail:\s*/gi, '').trim();
}

const STATUS_STYLES = {
  Canceled: "bg-red-500/10 text-red-400 border-red-500/20",
  Voting: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  Open: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
} as const;

const CHAIN_DOT_COLORS: Record<number, string> = {
  8453: "bg-blue-500", // Base
  42161: "bg-cyan-400", // Arbitrum
};

export function BountyCard({ bounty }: BountyCardProps) {
  const chainName = CHAIN_NAMES[bounty.chainId as keyof typeof CHAIN_NAMES] || "Unknown";
  const amountEth = formatEther(BigInt(bounty.amount));
  const daysAgo = Math.floor((Date.now() - bounty.createdAt * 1000) / (1000 * 60 * 60 * 24));
  const timeLabel = daysAgo === 0 ? "Today" : daysAgo === 1 ? "1d ago" : `${daysAgo}d ago`;

  const getStatus = (): keyof typeof STATUS_STYLES => {
    if (bounty.isCanceled) return "Canceled";
    if (bounty.isVoting) return "Voting";
    return "Open";
  };

  const status = getStatus();
  const dotColor = CHAIN_DOT_COLORS[bounty.chainId] ?? "bg-gray-400";
  const detailHref = `/community/bounties/${bounty.chainId}/${bounty.id}`;
  const thumbnailUrl = extractImageUrl(bounty.description);
  const cleanDescription = stripMarkdownImages(bounty.description);
  const { ethPrice } = useEthPrice();
  const ethAmount = parseFloat(amountEth);
  const usdValue = formatEthToUsd(ethAmount, ethPrice);

  return (
    <div className="group relative flex flex-col rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-200 overflow-hidden">
      {/* Top accent line */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="flex flex-col flex-1 p-5 gap-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
            <span className="text-xs font-medium text-muted-foreground truncate">{chainName}</span>
          </div>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border shrink-0 ${STATUS_STYLES[status]}`}
          >
            {status}
          </span>
        </div>

        {/* Thumbnail */}
        {thumbnailUrl && (
          <div className="rounded-lg overflow-hidden border border-border/50 -mx-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnailUrl}
              alt={bounty.title || bounty.name}
              className="w-full h-32 object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* Title */}
        <h3 className="font-bold text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-150">
          {bounty.title || bounty.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed flex-1">
          {cleanDescription}
        </p>

        {/* Reward */}
        <div className="rounded-lg bg-muted/40 px-4 py-3 border border-border/50">
          <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Reward</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-primary">{ethAmount.toFixed(4)}</span>
            <span className="text-sm font-medium text-muted-foreground">ETH</span>
            {ethPrice > 0 && (
              <span className="ml-auto text-sm font-medium text-emerald-600 dark:text-emerald-400">{usdValue}</span>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 shrink-0" />
            <span>{timeLabel}</span>
          </div>
          {bounty.isMultiplayer && (
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground/40">·</span>
              <Users className="w-3 h-3 shrink-0" />
              <span>Multiplayer</span>
            </div>
          )}
          {bounty.hasClaims && (
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground/40">·</span>
              <span>Has claims</span>
            </div>
          )}
          {bounty.isOpenBounty && (
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground/40">·</span>
              <span>📹 Video required</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-5 pb-5">
        <Link href={detailHref} className="flex-1">
          <Button variant="outline" className="w-full text-sm font-medium hover:bg-muted/60">
            View Details
            <ExternalLink className="w-3.5 h-3.5 ml-1.5 opacity-60" />
          </Button>
        </Link>
        <Link href={detailHref} className="flex-1">
          <Button className="w-full text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground">
            Make Attempt
          </Button>
        </Link>
      </div>
    </div>
  );
}
