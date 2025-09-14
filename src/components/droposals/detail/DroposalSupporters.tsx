"use client";

/**
 * DroposalSupporters
 * Renders a grid of supporters (wallets) who minted the edition.
 * Expects the NFT contract `tokenAddress` and optional `totalSupply` to optimize fetching.
 */
import { SectionHeader } from "@/components/common/SectionHeader";
import { AddressDisplay, AddressDisplaySkeleton } from "@/components/ui/address-display";
import { Card, CardContent } from "@/components/ui/card";
import { useSupporters } from "@/hooks/use-supporters";

export interface DroposalSupportersProps {
  tokenAddress?: `0x${string}` | null;
  totalSupply?: string | null; // string coming from decoded params
}

export function DroposalSupporters({ tokenAddress, totalSupply }: DroposalSupportersProps) {
  const totalSupplyBigInt = totalSupply ? BigInt(totalSupply) : null;
  const { visibleSupporters, isLoading, error } = useSupporters({
    contractAddress: tokenAddress ?? null,
    totalSupply: totalSupplyBigInt,
    batchSize: 200,
    itemsPerPage: 200,
    autoLoad: Boolean(tokenAddress),
  });

  return (
    <Card>
      <SectionHeader title="Supporters" description="Collectors who minted this drop" />
      <CardContent>
        {isLoading && (
          <div className="flex flex-wrap items-center gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md border px-3 py-2">
                <AddressDisplaySkeleton variant="compact" />
                <div className="h-3 w-8 bg-muted rounded" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && error && <div className="text-sm text-destructive">{error}</div>}

        {!isLoading && !error && visibleSupporters.length === 0 && (
          <div className="text-muted-foreground">No supporters found.</div>
        )}

        {!isLoading && !error && visibleSupporters.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            {visibleSupporters.map((s) => (
              <div
                key={s.address}
                className="flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted/50"
              >
                <AddressDisplay
                  address={s.address as `0x${string}`}
                  variant="compact"
                  showCopy={false}
                  showExplorer={false}
                />
                <span className="ml-1 text-xs text-muted-foreground">x{s.tokenCount}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
