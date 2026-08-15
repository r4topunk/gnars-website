"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useDaoAuction } from "@buildeross/hooks";
import { formatEther } from "viem";
import { useReadContract } from "wagmi";
import { AuctionBidForm } from "@/components/auction/AuctionBidForm";
import { AuctionSettleButton } from "@/components/auction/AuctionSettleButton";
import { GnarImageTile } from "@/components/auctions/GnarImageTile";
import { useAuctionBids } from "@/hooks/use-auction-bids";
import { useAuctionLive } from "@/hooks/use-auction-live";
import { useBidComments } from "@/hooks/use-bid-comments";
import { useUserAddress } from "@/hooks/use-user-address";
import { CHAIN, DAO_ADDRESSES } from "@/lib/config";
import { cn } from "@/lib/utils";
import auctionAbi from "@/utils/abis/auctionAbi";
import { avatarGradient, GOLD, truncateAddress } from "./gov-ui";

/** No bids yet: the contract still returns a bidder, all zeroes. */
const ZERO_BIDDER = /^0x0{40}$/i;

/** Live H:M:S to the auction's end. */
function useCountdown(endTimeSec: number | undefined) {
  const [now, setNow] = useState<number | null>(null);

  // Starts null and fills in after mount: the server has no "now", and
  // rendering one would guarantee a hydration mismatch on every load.
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!endTimeSec || now === null) return null;
  const remaining = Math.max(0, endTimeSec * 1000 - now);
  const totalSeconds = Math.floor(remaining / 1000);
  return {
    ended: remaining === 0,
    hours: String(Math.floor(totalSeconds / 3600)).padStart(2, "0"),
    minutes: String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0"),
    seconds: String(totalSeconds % 60).padStart(2, "0"),
    /** 0–1 of the auction window already spent. */
    elapsed: null as number | null,
  };
}

/**
 * The live auction, styled as the reference's hero card: gold live badge and
 * flip-clock countdown, the Gnar in a gold-rimmed frame, the bid figure in the
 * gold ramp over a time-elapsed bar, the leading comment, and the bid
 * leaderboard.
 *
 * The bidding itself stays `AuctionBidForm` — that component carries the whole
 * write path (thirdweb account abstraction, chain switching, comment encoding,
 * revalidation) and re-implementing it for a skin would be re-implementing the
 * risky part.
 */
export function AuctionPanel() {
  const t = useTranslations("newhome.gov");
  const { address } = useUserAddress();

  const { highestBid, highestBidder, endTime, startTime, tokenId, tokenUri } = useDaoAuction({
    collectionAddress: DAO_ADDRESSES.token,
    auctionAddress: DAO_ADDRESSES.auction,
    chainId: CHAIN.id,
  });

  const auctionLive = useAuctionLive(tokenId ? BigInt(tokenId) : undefined);
  const displayBid = auctionLive.polledHighestBid ?? highestBid;
  const displayBidder = auctionLive.polledHighestBidder ?? highestBidder;
  const displayEndTime = auctionLive.polledEndTime ?? endTime;

  const { bids } = useAuctionBids(tokenId?.toString(), true, 15_000);
  const leadingTx = bids.length > 0 ? bids[0].transactionHash : undefined;
  const txHashes = useMemo(() => (leadingTx ? [leadingTx] : []), [leadingTx]);
  const { comments } = useBidComments(txHashes);
  const leadingComment = leadingTx ? comments.get(leadingTx) : undefined;

  const countdown = useCountdown(displayEndTime);

  const { data: reservePriceWei } = useReadContract({
    address: DAO_ADDRESSES.auction as `0x${string}`,
    abi: auctionAbi,
    functionName: "reservePrice",
    chainId: CHAIN.id,
    query: { staleTime: 60 * 1000 },
  });
  const { data: minBidIncrementRaw } = useReadContract({
    address: DAO_ADDRESSES.auction as `0x${string}`,
    abi: auctionAbi,
    functionName: "minBidIncrement",
    chainId: CHAIN.id,
    query: { staleTime: 60 * 1000 },
  });

  // Share of the auction window already spent — what the bar under the bid reads.
  const [elapsedPct, setElapsedPct] = useState(0);
  useEffect(() => {
    if (!startTime || !displayEndTime || displayEndTime <= startTime) return;
    const compute = () => {
      const span = (displayEndTime - startTime) * 1000;
      const done = Date.now() - startTime * 1000;
      setElapsedPct(Math.min(100, Math.max(0, (done / span) * 100)));
    };
    compute();
    const id = setInterval(compute, 5000);
    return () => clearInterval(id);
  }, [startTime, displayEndTime]);

  const imageUrl = tokenUri?.image?.startsWith("ipfs://")
    ? tokenUri.image.replace("ipfs://", "https://ipfs.io/ipfs/")
    : tokenUri?.image;

  const isWinner =
    address && displayBidder && address.toLowerCase() === displayBidder.toLowerCase();
  const isLive = countdown ? !countdown.ended : false;

  const noop = useCallback(() => {}, []);

  return (
    // Same surface as the proposals/feed panel it sits beside in GovSection
    // (`rounded-2xl border-border bg-card p-5`), keeping only the gold border as
    // the accent that tells the two apart. It used to paint a literal near-black
    // gradient with a 50px black drop shadow, so on a light page the auction
    // stayed a dark slab while everything around it inverted.
    <div className="flex h-full flex-col gap-4 rounded-2xl border border-[#f7c948]/25 bg-card p-5">
      {/* Badge + countdown */}
      <div className="flex items-center justify-between gap-3">
        {/* The badge tracks the clock. Between an auction ending and someone
            settling it, the card is still onchain truth but it is not live —
            saying "live auction" over a 00:00:00 countdown is just wrong. */}
        <span
          className="inline-flex items-center gap-[7px] rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em]"
          style={
            isLive
              ? { backgroundImage: GOLD, color: "#1a1205" }
              : {
                  background: "color-mix(in oklab,var(--foreground) 8%,transparent)",
                  color: "var(--muted-foreground)",
                }
          }
        >
          <span
            aria-hidden
            className="size-1.5 rounded-full"
            style={
              isLive
                ? { background: "#1a1205", animation: "gnars-pulse 1.8s infinite" }
                : { background: "var(--muted-foreground)" }
            }
          />
          {isLive ? t("liveAuction") : t("awaitingSettlement")}
        </span>
        <div className="flex gap-[3px] font-mono text-[15px] font-bold text-foreground">
          {countdown ? (
            [countdown.hours, countdown.minutes, countdown.seconds].map((part, i) => (
              <span key={i} className="flex items-center gap-[3px]">
                {i > 0 && <span className="text-muted-foreground/70">:</span>}
                <span className="rounded-[5px] bg-foreground/10 px-[7px] py-[3px] tabular-nums">
                  {part}
                </span>
              </span>
            ))
          ) : (
            <span className="rounded-[5px] bg-foreground/10 px-[7px] py-[3px] text-muted-foreground">
              --
            </span>
          )}
        </div>
      </div>

      {/* The Gnar */}
      <div className="relative aspect-square overflow-hidden rounded-[14px] border-2 border-[#f7c948]/55 bg-muted shadow-[0_0_0_5px_rgba(247,201,72,.08),inset_0_0_34px_rgba(245,133,31,.18)]">
        <GnarImageTile tokenId={Number(tokenId || 0)} imageUrl={imageUrl} />
        {tokenId != null && (
          <span className="absolute left-2.5 top-2.5 rounded-lg bg-[#0a0908]/70 px-2.5 py-1 font-mono text-xs font-bold text-[#f7c948] backdrop-blur-sm">
            #{tokenId.toString()}
          </span>
        )}
        {/* An auction that closed without a bid reports the zero address as its
            "winner" — crowning that reads as a real leader, so it is dropped.

            `text-white`, not `text-foreground`: both chips here sit ON the Gnar
            artwork, so they stay dark in either theme — and a foreground that
            inverts would have painted near-black text onto a near-black chip the
            moment the page went light. The #id chip above was already safe (gold
            on dark); this one was not. */}
        {displayBidder && !ZERO_BIDDER.test(displayBidder) && (
          <span className="absolute right-2.5 top-2.5 flex items-center gap-1.5 rounded-lg bg-[#0a0908]/70 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
            👑 {truncateAddress(displayBidder)}
          </span>
        )}
      </div>

      {/* Current bid + time elapsed */}
      <div>
        <div className="mb-[7px] flex items-baseline justify-between gap-3">
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t("currentBid")}
          </span>
          {/* The ramp stays, but it darkens in light mode. The dark-mode ramp
              runs #f7c948 → #f5851f; clipped into text on a white card its light
              end lands near 1.6:1, so the card's single most important number
              would be the least readable thing on it. Same ramp shape, amber
              stops, set as classes rather than the inline GOLD so each theme can
              carry its own. */}
          <span className="bg-[linear-gradient(90deg,#b45309,#c2410c)] bg-clip-text font-mono text-3xl font-extrabold leading-none tabular-nums text-transparent dark:bg-[linear-gradient(90deg,#f7c948,#f5851f)]">
            {displayBid ? Number(displayBid).toFixed(3) : "0.000"} ETH
          </span>
        </div>
        <div className="flex h-2.5 overflow-hidden rounded-full border border-border bg-muted">
          <span
            className="block h-full rounded-full bg-[linear-gradient(90deg,#f59e0b,#FF2D2D)] transition-[width] duration-1000"
            style={{ width: `${elapsedPct}%` }}
          />
        </div>
        {leadingComment && displayBidder && !ZERO_BIDDER.test(displayBidder) && (
          <p className="mt-1.5 text-[11.5px] italic text-muted-foreground">
            “{leadingComment}” — {truncateAddress(displayBidder ?? "")}
          </p>
        )}
      </div>

      {/* Leaderboard */}
      {bids.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-muted/40 p-3">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {t("leaderboard", { count: bids.length })}
          </span>
          {bids.slice(0, 4).map((bid, i) => (
            <div key={bid.id} className="flex items-center gap-2.5 py-[5px]">
              {/* Gold only carries the leader in dark. #f7c948 on a white card is
                  ~1.6:1 — the same trap stake-ui documents — so light mode steps
                  down to amber. */}
              <span
                className={cn(
                  "w-4 font-mono text-[11.5px] font-bold",
                  i === 0 ? "text-amber-700 dark:text-[#f7c948]" : "text-muted-foreground",
                )}
              >
                {i + 1}
              </span>
              <span
                aria-hidden
                className="size-[18px] shrink-0 rounded-full"
                style={{ backgroundImage: avatarGradient(bid.bidder) }}
              />
              <span className="flex-1 truncate text-[12.5px] font-medium text-foreground/85">
                {truncateAddress(bid.bidder)}
              </span>
              <span className="font-mono text-[12.5px] font-bold tabular-nums text-foreground">
                {Number(formatEther(BigInt(bid.amount))).toFixed(3)} Ξ
              </span>
            </div>
          ))}
        </div>
      )}

      {isLive ? (
        <AuctionBidForm
          tokenId={tokenId ? BigInt(tokenId) : undefined}
          highestBid={displayBid}
          reservePriceEth={reservePriceWei ? Number(formatEther(reservePriceWei)) : 0.01}
          minBidIncrementPct={minBidIncrementRaw ? Number(minBidIncrementRaw) : 10}
          onBidConfirmed={noop}
        />
      ) : (
        <AuctionSettleButton isWinner={!!isWinner} />
      )}

      <p className="text-xs leading-[1.5] text-muted-foreground/70">{t("auctionFootnote")}</p>
    </div>
  );
}
