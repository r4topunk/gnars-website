import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useFormContext } from "react-hook-form";
import { NftGridSkeleton } from "@/components/skeletons/nftGridSkeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { GNARS_ADDRESSES } from "@/lib/config";
import { subgraphQuery } from "@/lib/subgraph";
import { cn } from "@/lib/utils";
import { type ProposalFormValues } from "../../schema";

interface Props {
  index: number;
}

export function SendNFTsForm({ index }: Props) {
  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = useFormContext<ProposalFormValues>();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState<Array<{ id: number; imageUrl?: string }>>([]);
  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(null);
  const [visibleTokensCount, setVisibleTokensCount] = useState(60);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  type TreasuryTokensQuery = {
    tokens: Array<{ tokenId: string; image?: string | null }>;
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
      }
    }
  `;

  useEffect(() => {
    let ignore = false;
    async function loadAllTokens() {
      try {
        setIsLoading(true);
        setError(null);
        const pageSize = 500;
        let all: Array<{ id: number; imageUrl?: string }> = [];
        let skip = 0;
        // page through all results from the API
        for (;;) {
          const page = await subgraphQuery<TreasuryTokensQuery>(TREASURY_TOKENS_GQL, {
            dao: GNARS_ADDRESSES.token.toLowerCase(),
            owner: GNARS_ADDRESSES.treasury.toLowerCase(),
            first: pageSize,
            skip,
          });
          if (ignore) return;
          const mapped = (page.tokens || []).map((t) => ({
            id: Number(t.tokenId),
            imageUrl: t.image ?? undefined,
          }));
          all = all.concat(mapped);
          if (!page.tokens || page.tokens.length < pageSize) break;
          skip += pageSize;
        }
        setTokens(all);
      } catch (err) {
        if (!ignore) setError(err instanceof Error ? err.message : "Failed to fetch NFT holdings");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    void loadAllTokens();
    return () => {
      ignore = true;
    };
  }, [TREASURY_TOKENS_GQL]);

  useEffect(() => {
    const viewportEl = viewportRef.current;
    const sentinelEl = sentinelRef.current;
    if (!viewportEl || !sentinelEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setVisibleTokensCount((prev) => prev + 60);
        }
      },
      { root: viewportEl, rootMargin: "200px 0px", threshold: 0 },
    );
    // Only observe if there are more tokens to show
    if (visibleTokensCount < tokens.length) {
      observer.observe(sentinelEl);
    }
    return () => observer.disconnect();
  }, [visibleTokensCount, tokens.length]);

  // Initialize selected state from form if already present
  useEffect(() => {
    const current = watch(`transactions.${index}.tokenId` as const);
    const parsed = current ? parseInt(String(current), 10) : NaN;
    if (!Number.isNaN(parsed)) {
      setSelectedTokenId(parsed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const handleSelect = (id: number) => {
    setSelectedTokenId(id);
    const token = tokens.find((t) => t.id === id);
    setValue(`transactions.${index}.contractAddress` as const, GNARS_ADDRESSES.token);
    setValue(`transactions.${index}.from` as const, GNARS_ADDRESSES.treasury);
    setValue(`transactions.${index}.tokenId` as const, String(id));
    if (token?.imageUrl) {
      setValue(`transactions.${index}.nftImage` as const, token.imageUrl);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Select a Gnar from Treasury *</Label>
        <Card className="py-0">
          <CardContent>
            <ScrollArea className="h-80" viewportRef={viewportRef}>
              {isLoading ? (
                <NftGridSkeleton />
              ) : error ? (
                <div className="text-sm text-destructive">
                  Failed to load treasury NFTs: {error}
                </div>
              ) : tokens.length === 0 ? (
                <div className="text-sm text-muted-foreground">No Gnars found in treasury.</div>
              ) : (
                <div className="my-6 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 pr-2">
                  {tokens.slice(0, visibleTokensCount).map((t) => {
                    const isSelected = selectedTokenId === t.id;
                    return (
                      <button
                        key={`gnar-${t.id}`}
                        type="button"
                        onClick={() => handleSelect(t.id)}
                        className={cn(
                          "cursor-pointer relative aspect-square overflow-hidden rounded-lg bg-muted",
                          "border-1 border-transparent hover:border-primary transition focus:outline-none",
                          isSelected && "border-2 border-primary shadow",
                        )}
                        aria-pressed={isSelected}
                      >
                        {t.imageUrl ? (
                          <Image
                            src={t.imageUrl}
                            alt={`Gnar ${t.id}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 25vw, 128px"
                            quality={20}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                              <div className="font-bold mb-1 text-xl">#{String(t.id)}</div>
                              <div className="text-muted-foreground text-[10px]">Gnar NFT</div>
                            </div>
                          </div>
                        )}
                        <div className="absolute top-1.5 left-1.5">
                          <Badge
                            variant={isSelected ? "default" : "secondary"}
                            className="font-mono text-[10px]"
                          >
                            #{String(t.id)}
                          </Badge>
                        </div>
                      </button>
                    );
                  })}
                  {visibleTokensCount < tokens.length && (
                    <div ref={sentinelRef} className="col-span-full h-6" />
                  )}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
        {errors.transactions?.[index] && "tokenId" in (errors.transactions?.[index] as object) && (
          <p className="text-xs text-red-500">Please select an NFT</p>
        )}
      </div>

      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="to">To Address *</Label>
        <Input
          id="to"
          placeholder="0x... or ENS name"
          {...register(`transactions.${index}.to` as const)}
        />
        {errors.transactions?.[index] && "to" in (errors.transactions?.[index] as object) && (
          <p className="text-xs text-red-500">
            {String(
              (errors.transactions?.[index] as Record<string, unknown>).to &&
                (errors.transactions?.[index] as Record<string, { message?: string }>).to?.message,
            )}
          </p>
        )}
      </div>

      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe the purpose of this NFT transfer..."
          {...register(`transactions.${index}.description` as const)}
        />
      </div>
    </div>
  );
}
