"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ProposalStatusBadge } from "@/components/proposals/ProposalStatusBadge";
import { Proposal } from "@/components/proposals/types";
import { extractFirstUrl, normalizeImageUrl } from "@/components/proposals/utils";
import { AddressDisplay } from "@/components/ui/address-display";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useEthPrice } from "@/hooks/use-eth-price";
import { getProposalFundingTotals, getProposalRequestedUsdTotal } from "@/lib/proposal-funding";
import { ProposalStatus } from "@/lib/schemas/proposals";
import { cn } from "@/lib/utils";

function formatUsdAmount(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

function formatAssetAmount(value: number, maxFractionDigits = 4): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

export function ProposalCard({
  proposal,
  showBanner = false,
}: {
  proposal: Proposal;
  showBanner?: boolean;
}) {
  const { ethPrice } = useEthPrice();
  const totalVotes =
    (proposal.forVotes ?? 0) + (proposal.againstVotes ?? 0) + (proposal.abstainVotes ?? 0);

  const baseValue = Math.max(proposal.quorumVotes, totalVotes, 1);
  const forPercentage = (proposal.forVotes / baseValue) * 100;
  const againstPercentage = (proposal.againstVotes / baseValue) * 100;
  const abstainPercentage = (proposal.abstainVotes / baseValue) * 100;

  const quorumMarkerPercent =
    proposal.quorumVotes > 0 ? (proposal.quorumVotes / baseValue) * 100 : 100;

  const timeCreated = formatDistanceToNow(new Date(proposal.timeCreated * 1000), {
    addSuffix: true,
  });
  const isPending = proposal.status === ProposalStatus.PENDING;

  const bannerUrl = normalizeImageUrl(extractFirstUrl(proposal.description));
  const currentBannerSrc = bannerUrl ?? "/logo-banner.jpg";
  const [bannerSrc, setBannerSrc] = useState<string>(currentBannerSrc);
  const [isImageLoaded, setIsImageLoaded] = useState<boolean>(false);

  const fundingTotals = useMemo(
    () =>
      getProposalFundingTotals({
        targets: proposal.targets,
        values: proposal.values,
        calldatas: proposal.calldatas,
      }),
    [proposal.targets, proposal.values, proposal.calldatas],
  );

  const hasFundingRequest = fundingTotals.totalEthWei > 0n || fundingTotals.totalUsdcRaw > 0n;
  const hasEthRequest = fundingTotals.totalEthWei > 0n;
  const canEstimateEthInUsd = !hasEthRequest || ethPrice > 0;
  const usdRequestedTotal = getProposalRequestedUsdTotal(fundingTotals, ethPrice);

  const requestedTotalText = canEstimateEthInUsd
    ? formatUsdAmount(usdRequestedTotal)
    : fundingTotals.totalUsdcRaw > 0n
      ? `${formatUsdAmount(fundingTotals.totalUsdc)} + ETH`
      : "ETH quote unavailable";

  const requestedLines = hasFundingRequest
    ? [
        fundingTotals.totalEthWei > 0n ? `${formatAssetAmount(fundingTotals.totalEth)} ETH` : null,
        fundingTotals.totalUsdcRaw > 0n ? `${formatAssetAmount(fundingTotals.totalUsdc, 2)} USDC` : null,
      ].filter(Boolean)
    : ["No direct ETH/USDC transfer"];

  useEffect(() => {
    setBannerSrc(currentBannerSrc);
    setIsImageLoaded(false);
  }, [currentBannerSrc]);

  return (
    <Link href={`/proposals/${proposal.proposalNumber}`} className="block">
      <Card className="overflow-hidden cursor-pointer transition-transform transition-shadow hover:-translate-y-0.5 hover:shadow-md">
        {showBanner && (
          <div className="mx-4 border rounded-md overflow-hidden">
            <AspectRatio ratio={16 / 9}>
              {!isImageLoaded && <Skeleton className="absolute inset-0" />}
              <Image
                src={bannerSrc}
                alt="Proposal banner"
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className={`object-cover transition-opacity duration-300 ${isImageLoaded ? "opacity-100" : "opacity-0"}`}
                priority={false}
                onLoad={() => setIsImageLoaded(true)}
                onError={() => {
                  if (bannerSrc !== "/logo-banner.jpg") setBannerSrc("/logo-banner.jpg");
                  setIsImageLoaded(false);
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
                    <ProposalStatusBadge status={proposal.status} className="text-xs" />
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

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Voting Progress</span>
                <span className={cn(isPending && "italic")}>
                  {isPending
                    ? "not started"
                    : totalVotes === 0
                      ? "no votes yet"
                      : `${totalVotes} votes`}
                </span>
              </div>
              <div className="space-y-1">
                <div className="relative">
                  {totalVotes === 0 ? (
                    <div className="h-1.5 rounded bg-muted" />
                  ) : (
                    <div className="relative h-1.5 rounded bg-muted/50 overflow-hidden">
                      <div className="absolute inset-0 flex gap-0.5">
                        {proposal.forVotes > 0 && (
                          <div
                            className="h-full bg-green-500"
                            style={{ width: `${forPercentage}%` }}
                          />
                        )}
                        {proposal.againstVotes > 0 && (
                          <div
                            className="h-full bg-red-500"
                            style={{ width: `${againstPercentage}%` }}
                          />
                        )}
                        {proposal.abstainVotes > 0 && (
                          <div
                            className="h-full bg-gray-300"
                            style={{ width: `${abstainPercentage}%` }}
                          />
                        )}
                      </div>
                    </div>
                  )}
                  {proposal.quorumVotes > 0 && totalVotes > proposal.quorumVotes && (
                    <div className="pointer-events-none absolute inset-0">
                      <div
                        className="absolute top-0 bottom-0 w-1 bg-yellow-500"
                        style={{ left: `${quorumMarkerPercent}%`, transform: "translateX(-50%)" }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1 border-t border-border/60 pt-2">
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs text-muted-foreground pt-0.5">Requested</span>
                <div className="min-w-0 text-right">
                  <div className="font-medium text-foreground tabular-nums">{requestedTotalText}</div>
                  <div className="mt-0.5 space-y-0.5 text-[11px] text-muted-foreground tabular-nums">
                    {requestedLines.map((line) => (
                      <div key={line} className="truncate">
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
