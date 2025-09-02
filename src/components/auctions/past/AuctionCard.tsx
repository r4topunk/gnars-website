import { GnarCard } from "@/components/auctions/GnarCard";

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
  const isZeroFinal = Number(auction.finalBid) === 0;
  return (
    <GnarCard
      tokenId={auction.tokenId}
      imageUrl={auction.imageUrl}
      dateLabel={auction.endTime.toLocaleDateString()}
      finalBidEth={isZeroFinal ? null : auction.finalBid}
      winnerAddress={isZeroFinal ? null : auction.winner}
      showPlaceholders
    />
  );
}
