"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GnarCard } from "@/components/gnar-card";

interface TokenLike {
  id: string | number;
  imageUrl?: string | null;
  endTime?: number | null;
  mintedAt?: number | null;
  finalBidWei?: string | number | null;
  winner?: string | null;
}

interface MemberTokensGridProps {
  tokens: TokenLike[];
}

export function MemberTokensGrid({ tokens }: MemberTokensGridProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gnars Held</CardTitle>
      </CardHeader>
      <CardContent>
        {tokens.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No tokens held.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {tokens.map((t) => {
              const dateLabel = t.endTime
                ? new Date(t.endTime * 1000).toLocaleDateString()
                : t.mintedAt
                  ? new Date(t.mintedAt * 1000).toLocaleDateString()
                  : undefined;
              const finalEth: string | null = (() => {
                if (!t.finalBidWei) return null;
                try {
                  const eth = Number(t.finalBidWei) / 1e18;
                  return eth.toFixed(3).replace(/\.0+$/, "");
                } catch {
                  return null;
                }
              })();
              const winnerAddress: string | null = finalEth ? (t.winner || null) : null;
              return (
                <GnarCard
                  key={t.id}
                  tokenId={t.id}
                  imageUrl={t.imageUrl || undefined}
                  dateLabel={dateLabel}
                  finalBidEth={finalEth}
                  winnerAddress={winnerAddress}
                  showPlaceholders
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


