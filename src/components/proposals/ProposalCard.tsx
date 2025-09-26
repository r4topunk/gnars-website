"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MinusCircle, ThumbsDown, ThumbsUp } from "lucide-react";
import { Proposal } from "@/components/proposals/types";
import { extractFirstUrl, getStatusConfig, normalizeImageUrl } from "@/components/proposals/utils";
import { AddressDisplay } from "@/components/ui/address-display";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProposalStatus } from "@/lib/schemas/proposals";
import { cn } from "@/lib/utils";

export function ProposalCard({
  proposal,
  showBanner = false,
}: {
  proposal: Proposal;
  showBanner?: boolean;
}) {
  const { Icon, color } = getStatusConfig(proposal.status);

  const totalVotes =
    (proposal.forVotes ?? 0) + (proposal.againstVotes ?? 0) + (proposal.abstainVotes ?? 0);
  const forPercentage = totalVotes > 0 ? (proposal.forVotes / totalVotes) * 100 : 0;
  const againstPercentage = totalVotes > 0 ? (proposal.againstVotes / totalVotes) * 100 : 0;
  const abstainPercentage = totalVotes > 0 ? (proposal.abstainVotes / totalVotes) * 100 : 0;

  const quorumMarkerPercent =
    proposal.quorumVotes > 0 && totalVotes > 0
      ? Math.min(100, (proposal.quorumVotes / totalVotes) * 100)
      : 100;

  const timeCreated = formatDistanceToNow(new Date(proposal.timeCreated * 1000), {
    addSuffix: true,
  });
  const voteEndTime = new Date(proposal.voteEnd);
  const isVotingActive = proposal.status === ProposalStatus.ACTIVE && voteEndTime > new Date();
  const isPending = proposal.status === ProposalStatus.PENDING;

  const bannerUrl = normalizeImageUrl(extractFirstUrl(proposal.description));
  const currentBannerSrc = bannerUrl ?? "/logo-banner.jpg";
  const [bannerSrc, setBannerSrc] = useState<string>(currentBannerSrc);
  const [isImageLoaded, setIsImageLoaded] = useState<boolean>(false);

  // Keep local banner src in sync when proposal changes
  useEffect(() => {
    setBannerSrc(currentBannerSrc);
  }, [currentBannerSrc]);

  return (
    <Link href={`/proposals/${proposal.proposalNumber}`} className="block">
      <Card className="overflow-hidden cursor-pointer transition-transform transition-shadow hover:-translate-y-0.5 hover:shadow-md">
        {showBanner && (
          <div className="mx-4 border rounded-md overflow-hidden">
            <AspectRatio ratio={16 / 9}>
              {/* Image skeleton placeholder to avoid empty gap while loading */}
              {!isImageLoaded && <Skeleton className="absolute inset-0" />}
              <Image
                src={bannerSrc}
                alt="Proposal banner"
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className={`object-cover transition-opacity duration-300 ${isImageLoaded ? "opacity-100" : "opacity-0"}`}
                priority={false}
                onLoadingComplete={() => setIsImageLoaded(true)}
                onError={() => {
                  if (bannerSrc !== "/logo-banner.jpg") setBannerSrc("/logo-banner.jpg");
                }}
              />
            </AspectRatio>
          </div>
        )}
        <CardContent className="px-4 py-2">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-medium text-muted-foreground">
                    Prop #{proposal.proposalNumber}
                  </span>
                  <div className="flex-shrink-0">
                    <Badge className={`${color} text-xs`}>
                      <Icon className="w-3 h-3 mr-1" />
                      {proposal.status}
                    </Badge>
                  </div>
                </div>
                <h4 className="font-semibold text-sm leading-tight sm:truncate pr-2">
                  {proposal.title}
                </h4>
                <div className="text-xs text-muted-foreground mt-1">
                  by{" "}
                  <AddressDisplay
                    address={proposal.proposer}
                    variant="compact"
                    showAvatar={false}
                    showENS={true}
                    showCopy={false}
                    showExplorer={false}
                  />{" "}
                  • {timeCreated}
                </div>
              </div>
            </div>

            {(totalVotes > 0 || isPending) && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Voting Progress</span>
                  <span className={cn(isPending && "italic")}>{isPending ? "not started" : `${totalVotes} votes`}</span>
                </div>
                <div className="space-y-1">
                  <div className="relative">
                    {isPending && totalVotes === 0 ? (
                      <div className="h-1.5 rounded bg-muted" />
                    ) : (
                      <div className="flex gap-0.5">
                        {proposal.forVotes > 0 && (
                          <div
                            className={cn(
                              "h-1.5 bg-green-500",
                              proposal.againstVotes === 0 && proposal.abstainVotes === 0
                                ? "rounded"
                                : "rounded-l",
                            )}
                            style={{ width: `${forPercentage}%` }}
                          />
                        )}
                        {proposal.againstVotes > 0 && (
                          <div
                            className={cn(
                              "h-1.5 bg-red-500",
                              proposal.forVotes === 0 && proposal.abstainVotes === 0
                                ? "rounded"
                                : proposal.abstainVotes === 0
                                  ? "rounded-r"
                                  : "",
                            )}
                            style={{ width: `${againstPercentage}%` }}
                          />
                        )}
                        {proposal.abstainVotes > 0 && (
                          <div
                            className={cn(
                              "h-1.5 bg-gray-300",
                              proposal.forVotes === 0 && proposal.againstVotes === 0
                                ? "rounded"
                                : "rounded-r",
                            )}
                            style={{ width: `${abstainPercentage}%` }}
                          />
                        )}
                      </div>
                    )}
                    {proposal.quorumVotes > 0 && totalVotes > 0 && (
                      <div className="pointer-events-none absolute inset-0">
                        <div
                          className="absolute top-0 bottom-0 w-1 bg-yellow-300"
                          style={{ left: `${quorumMarkerPercent}%`, transform: "translateX(-50%)" }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between text-xs">
                    <div className={cn("flex items-center gap-1", isPending && "text-muted-foreground")}> 
                      <ThumbsUp className={cn("w-3 h-3", isPending ? "text-muted-foreground" : "text-green-500")} />
                      <span>
                        {proposal.forVotes} ({forPercentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div className={cn("flex items-center gap-1", isPending && "text-muted-foreground")}> 
                      <ThumbsDown className={cn("w-3 h-3", isPending ? "text-muted-foreground" : "text-red-500")} />
                      <span>
                        {proposal.againstVotes} ({againstPercentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div className={cn("flex items-center gap-1", isPending && "text-muted-foreground")}>
                      <MinusCircle className={cn("w-3 h-3", isPending ? "text-muted-foreground" : "text-gray-400")} />
                      <span>
                        {proposal.abstainVotes} ({abstainPercentage.toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isVotingActive && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Voting ends</span>
                <span className="font-medium">
                  {formatDistanceToNow(voteEndTime, { addSuffix: true })}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
