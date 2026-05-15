// src/components/auction/BidHistoryModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuctionBids } from "@/hooks/use-auction-bids";
import { useBidComments } from "@/hooks/use-bid-comments";
import { BidItem } from "./BidItem";

interface BidHistoryModalProps {
  tokenId: string | undefined;
  tokenName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return isMobile;
}

function BidListContent({ tokenId, enabled }: { tokenId: string | undefined; enabled: boolean }) {
  const t = useTranslations("auctions");
  const { bids, isLoading, error, newBidIds } = useAuctionBids(tokenId, enabled);
  const txHashes = useMemo(() => bids.map((b) => b.transactionHash), [bids]);
  const { comments } = useBidComments(txHashes);

  if (isLoading) {
    return (
      <div className="space-y-3 p-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">{t("history.loadError")}</p>
    );
  }

  if (bids.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t("history.empty")}</p>;
  }

  return (
    <div className="space-y-2">
      {bids.map((bid) => (
        <BidItem
          key={bid.id}
          bidder={bid.bidder}
          amount={bid.amount}
          bidTime={Number(bid.bidTime)}
          comment={comments.get(bid.transactionHash) ?? null}
          isNew={newBidIds.has(bid.id)}
        />
      ))}
    </div>
  );
}

export function BidHistoryModal({ tokenId, tokenName, open, onOpenChange }: BidHistoryModalProps) {
  const t = useTranslations("auctions");
  const isMobile = useIsMobile();
  const title = tokenName
    ? t("history.titleForName", { tokenName: tokenName.replace("Gnars", "Gnar") })
    : tokenId
      ? t("history.titleForToken", { tokenId })
      : t("history.title");

  const content = (
    <ScrollArea className="max-h-[60vh] pr-2">
      <BidListContent tokenId={tokenId} enabled={open} />
    </ScrollArea>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-xl">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription className="sr-only">{t("history.srDescription")}</SheetDescription>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{t("history.srDescription")}</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
