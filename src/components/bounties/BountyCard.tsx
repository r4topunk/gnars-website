import { formatEther } from "viem";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { formatEthToUsd, useEthPrice } from "@/hooks/use-eth-price";
import { Link } from "@/i18n/navigation";
import { CHAIN_NAMES } from "@/lib/poidh/config";
import type { PoidhBounty } from "@/types/poidh";

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
  return text
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/Thumbnail:\s*/gi, "")
    .trim();
}

const STATUS_STYLES = {
  Canceled: "bg-red-500/10 text-red-400 border-red-500/20",
  Voting: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  Open: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Closed: "bg-muted text-muted-foreground border-border",
} as const;

const CHAIN_DOT_COLORS: Record<number, string> = {
  8453: "bg-blue-500", // Base
  42161: "bg-cyan-400", // Arbitrum
};

export function BountyCard({ bounty }: BountyCardProps) {
  const chainName = CHAIN_NAMES[bounty.chainId as keyof typeof CHAIN_NAMES] || "Unknown";
  const amountEth = formatEther(BigInt(bounty.amount));
  // eslint-disable-next-line react-hooks/purity -- intentional render-time clock read for "Xd ago" label
  const daysAgo = Math.floor((Date.now() - bounty.createdAt * 1000) / (1000 * 60 * 60 * 24));
  const timeLabel = daysAgo === 0 ? "Today" : daysAgo === 1 ? "1d ago" : `${daysAgo}d ago`;

  const getStatus = (): keyof typeof STATUS_STYLES => {
    if (bounty.isCanceled) return "Canceled";
    if (bounty.isVoting) return "Voting";
    if (bounty.isCompleted) return "Closed";
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
    <Card className="group hover:border-primary/50 overflow-hidden py-0">
      <CardContent className="flex flex-col flex-1 px-5 pt-5 pb-0 gap-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
            <span className="text-xs font-medium text-muted-foreground truncate">{chainName}</span>
          </div>
          <Badge variant="outline" className={STATUS_STYLES[status]}>
            {status}
          </Badge>
        </div>

        {/* Title */}
        <h3 className="font-bold text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-150">
          {bounty.title || bounty.name}
        </h3>

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

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed flex-1">
          {cleanDescription}
        </p>

        {/* Reward */}
        <div className="rounded-lg bg-muted/40 px-4 py-3 border border-border/50">
          <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
            Reward
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-primary">{ethAmount.toFixed(4)}</span>
            <span className="text-sm font-medium text-muted-foreground">ETH</span>
            {ethPrice > 0 && (
              <span className="ml-auto text-sm font-medium text-emerald-600 dark:text-emerald-400">
                {usdValue}
              </span>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{timeLabel}</span>
          {bounty.isMultiplayer && (
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground/40">·</span>
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
              <span>Video required</span>
            </div>
          )}
        </div>
      </CardContent>

      {/* Actions */}
      <CardFooter className="px-5 pb-5 pt-4">
        <Link href={detailHref} className="block w-full">
          <Button className="w-full text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground">
            View
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
