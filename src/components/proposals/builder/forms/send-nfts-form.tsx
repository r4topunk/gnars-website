import Image from "next/image";
import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingGridSkeleton } from "@/components/skeletons/loading-grid-skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GNARS_ADDRESSES } from "@/lib/config";
import { subgraphQuery } from "@/lib/subgraph";
import { cn } from "@/lib/utils";
import { type ProposalFormValues } from "../../schema";

interface Props { index: number }

export function SendNFTsForm({ index }: Props) {
  const { register, formState: { errors }, setValue, watch } = useFormContext<ProposalFormValues>();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState<Array<{ id: number; imageUrl?: string }>>([]);
  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(null);

  type TreasuryTokensQuery = {
    tokens: Array<{ tokenId: string; image?: string | null }>
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
    async function load() {
      try {
        setIsLoading(true);
        setError(null);
        const pageSize = 500;
        let all: Array<{ id: number; imageUrl?: string }> = [];
        let skip = 0;
        // page through all results
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const page = await subgraphQuery<TreasuryTokensQuery>(TREASURY_TOKENS_GQL, {
            dao: GNARS_ADDRESSES.token.toLowerCase(),
            owner: GNARS_ADDRESSES.treasury.toLowerCase(),
            first: pageSize,
            skip,
          });
          const mapped = (page.tokens || []).map((t) => ({ id: Number(t.tokenId), imageUrl: t.image ?? undefined }));
          all = all.concat(mapped);
          if (!page.tokens || page.tokens.length < pageSize) break;
          skip += pageSize;
          if (ignore) return;
        }
        if (ignore) return;
        setTokens(all);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch NFT holdings");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, [TREASURY_TOKENS_GQL]);

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
    setValue(`transactions.${index}.contractAddress` as const, GNARS_ADDRESSES.token);
    setValue(`transactions.${index}.from` as const, GNARS_ADDRESSES.treasury);
    setValue(`transactions.${index}.tokenId` as const, String(id));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Select a Gnar from Treasury *</Label>
        <Card className="py-0">
          <CardContent>
            {isLoading ? (
              <LoadingGridSkeleton items={8} />
            ) : error ? (
              <div className="text-sm text-destructive">Failed to load treasury NFTs: {error}</div>
            ) : tokens.length === 0 ? (
              <div className="text-sm text-muted-foreground">No Gnars found in treasury.</div>
            ) : (
              <ScrollArea className="h-80">
                <div className="my-6 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 pr-2">
                  {tokens.map((t) => {
                    const isSelected = selectedTokenId === t.id;
                    return (
                      <button
                        key={`gnar-${t.id}`}
                        type="button"
                        onClick={() => handleSelect(t.id)}
                        className={cn(
                          "relative aspect-square overflow-hidden rounded-lg bg-muted",
                          "ring-1 ring-transparent hover:ring-primary transition focus:outline-none",
                          isSelected && "ring-2 ring-primary shadow"
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
                          <Badge variant={isSelected ? "default" : "secondary"} className="font-mono text-[10px]">
                            #{String(t.id)}
                          </Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
        {errors.transactions?.[index]?.tokenId && (
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
        {errors.transactions?.[index]?.to && (
          <p className="text-xs text-red-500">{String(errors.transactions?.[index]?.to?.message)}</p>
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
