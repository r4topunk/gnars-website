"use client";

import { useLocale } from "next-intl";
import { GnarCard } from "@/components/auctions/GnarCard";
import { toIntlLocale } from "@/lib/i18n/format";

export interface PastAuction {
  id: string;
  tokenId: string;
  imageUrl?: string;
  finalBid: string;
  winner: string;
  endTime: Date;
  settled: boolean;
}

export function AuctionCard({ auction }: { auction: PastAuction }) {
  const locale = useLocale();
  const isZeroFinal = Number(auction.finalBid) === 0;
  return (
    <GnarCard
      tokenId={auction.tokenId}
      imageUrl={auction.imageUrl}
      dateLabel={auction.endTime.toLocaleDateString(toIntlLocale(locale))}
      finalBidEth={isZeroFinal ? null : auction.finalBid}
      winnerAddress={isZeroFinal ? null : auction.winner}
      showPlaceholders
    />
  );
}
