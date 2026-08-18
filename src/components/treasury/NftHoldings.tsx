"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { GnarCard } from "@/components/auctions/GnarCard";
import { LoadingGridSkeleton } from "@/components/skeletons/loading-grid-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DAO_ADDRESSES } from "@/lib/config";
import { toIntlLocale } from "@/lib/i18n/format";
import { subgraphQuery } from "@/lib/subgraph";

/**
 * Tiles shown on the card before the dialog takes over. Seven plus the "see the
 * rest" cell fills exactly two rows of the four-column grid, which is what the
 * design shows — and what keeps this card a similar height to the Token
 * Holdings card beside it. Rendering all of them inline is what made the page
 * scroll for screens on end and left a tall column of page background next to a
 * short neighbour.
 */
// 15 + the "+N" tile: full width gives the grid 8 columns from `sm`, so the
// preview is two complete rows there — and exactly four complete rows of the
// 4-column mobile grid. Both breakpoints close without holes.
const PREVIEW_COUNT = 15;

interface NftHoldingsProps {
  treasuryAddress: string;
}

type TreasuryTokensQuery = {
  tokens: Array<{
    tokenId: string;
    image?: string | null;
    mintedAt?: string | null;
    auction?: {
      endTime: string;
      settled: boolean;
      highestBid?: { amount: string; bidder: string } | null;
      winningBid?: { amount: string; bidder: string } | null;
    } | null;
  }>;
};

const TREASURY_TOKENS_GQL = /* GraphQL */ `
  query TreasuryTokens($dao: ID!, $owner: Bytes!, $first: Int!, $skip: Int!) {
    tokens(
      where: { dao: $dao, owner: $owner }
      orderBy: tokenId
      orderDirection: asc
      first: $first
      skip: $skip
    ) {
      tokenId
      image
      mintedAt
      auction {
        endTime
        settled
        highestBid {
          amount
          bidder
        }
        winningBid {
          amount
          bidder
        }
      }
    }
  }
`;

export function NftHoldings({ treasuryAddress }: NftHoldingsProps) {
  const t = useTranslations("treasury");
  const locale = useLocale();
  const intlLocale = toIntlLocale(locale);
  const PAGE_SIZE = 20;
  const [tokens, setTokens] = useState<
    Array<{
      id: number;
      imageUrl?: string;
      dateLabel?: string;
      finalBidEth?: string | null;
      winnerAddress?: string | null;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        setIsLoading(true);
        setError(null);
        const dao = DAO_ADDRESSES.token.toLowerCase();
        const owner = treasuryAddress.toLowerCase();

        // Fetch all tokens using pagination (max 1000 per query in The Graph)
        const BATCH_SIZE = 1000;
        let allTokens: TreasuryTokensQuery["tokens"] = [];
        let skip = 0;
        let hasMore = true;

        while (hasMore && !ignore) {
          const data = await subgraphQuery<TreasuryTokensQuery>(TREASURY_TOKENS_GQL, {
            dao,
            owner,
            first: BATCH_SIZE,
            skip,
          });

          if (ignore) return;

          const tokens = data.tokens || [];
          allTokens = [...allTokens, ...tokens];

          // If we got less than BATCH_SIZE results, we've reached the end
          hasMore = tokens.length === BATCH_SIZE;
          skip += BATCH_SIZE;
        }

        if (ignore) return;

        const mapped = allTokens.map((token) => {
          const endTime = token.auction?.endTime ? Number(token.auction.endTime) : undefined;
          const mintedAt = token.mintedAt ? Number(token.mintedAt) : undefined;
          const dateLabel = endTime
            ? new Date(endTime * 1000).toLocaleDateString(intlLocale)
            : mintedAt
              ? new Date(mintedAt * 1000).toLocaleDateString(intlLocale)
              : undefined;
          const finalBidWei =
            token.auction?.winningBid?.amount ?? token.auction?.highestBid?.amount;
          const finalBidEth = finalBidWei
            ? (() => {
                try {
                  const eth = Number(finalBidWei) / 1e18;
                  return eth.toFixed(3).replace(/\.0+$/, "");
                } catch {
                  return null;
                }
              })()
            : null;
          const winner = token.auction?.winningBid?.bidder ?? null;
          return {
            id: Number(token.tokenId),
            imageUrl: token.image ?? undefined,
            dateLabel,
            finalBidEth,
            winnerAddress: finalBidEth ? winner : null,
          };
        });
        setTokens(mapped);
      } catch (err) {
        console.error("Error fetching treasury NFTs:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch NFT holdings");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [treasuryAddress, intlLocale]);

  // Reset visible count when tokens change
  useEffect(() => {
    if (!tokens) return;
    setVisibleCount((prev) => Math.min(Math.max(PAGE_SIZE, prev), tokens.length));
  }, [tokens, PAGE_SIZE]);

  // IntersectionObserver to load more on scroll
  useEffect(() => {
    if (!sentinelRef.current || isLoading) return;
    const el = sentinelRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;

        setVisibleCount((prev) => {
          const next = prev + PAGE_SIZE;
          return next;
        });
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => {
      observer.unobserve(el);
      observer.disconnect();
    };
  }, [tokens, isLoading, PAGE_SIZE]);

  if (isLoading) {
    return <LoadingGridSkeleton items={8} />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">{t("nfts.errorLoading", { error })}</div>
        </CardContent>
      </Card>
    );
  }

  if (tokens.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground py-12">
            <div className="text-lg font-medium mb-2">{t("nfts.empty")}</div>
            <div className="text-sm">{t("nfts.emptyDescription")}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const remaining = tokens.length - PREVIEW_COUNT;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">{t("nfts.title")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("nfts.count", { count: tokens.length })}
          </p>
        </div>
      </div>

      {/* Preview: plain image tiles, not GnarCards. The card sits in a narrow
          column, and the full card's date/bid/winner rows would be unreadable at
          this width — the detail belongs in the dialog, where there is room. */}
      <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-8">
        {tokens.slice(0, PREVIEW_COUNT).map((token) => (
          <div
            key={`preview-${token.id}`}
            title={`Gnar #${token.id}`}
            className="aspect-square overflow-hidden rounded-lg bg-muted"
          >
            {token.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- subgraph URLs are unbounded hosts; next/image would need every one allow-listed
              <img
                src={token.imageUrl}
                alt={`Gnar #${token.id}`}
                loading="lazy"
                className="size-full object-cover"
              />
            ) : null}
          </div>
        ))}

        {remaining > 0 ? (
          <Dialog>
            <DialogTrigger asChild>
              {/* The count is the point: "+571" and "+4" are different
                  decisions, and a bare "see more" hides which one this is. */}
              <button
                type="button"
                className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border border-border bg-muted/50 font-mono text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
              >
                +{remaining}
              </button>
            </DialogTrigger>
            {/* Same scrollbar treatment as GnarsStakeDialog: without it the long
                grid brings back the platform's default wide grey track running
                down the inside of a rounded panel. */}
            <DialogContent className="max-h-[88vh] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-[900px] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-foreground/20 [&::-webkit-scrollbar-thumb:hover]:bg-foreground/30 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5">
              <DialogHeader>
                <DialogTitle>{t("nfts.title")}</DialogTitle>
                <DialogDescription>{t("nfts.count", { count: tokens.length })}</DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tokens.slice(0, visibleCount).map((token) => (
                  <GnarCard
                    key={`gnar-${token.id}`}
                    tokenId={token.id}
                    imageUrl={token.imageUrl}
                    dateLabel={token.dateLabel}
                    finalBidEth={token.finalBidEth ?? null}
                    winnerAddress={token.winnerAddress ?? null}
                  />
                ))}
              </div>
              {/* Paging moved in here with the grid, so the sentinel scrolls
                  inside the dialog instead of extending the page. */}
              {visibleCount < tokens.length ? <div ref={sentinelRef} className="h-10" /> : null}
            </DialogContent>
          </Dialog>
        ) : null}
      </div>
    </div>
  );
}
