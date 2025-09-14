"use client";

import { AddressDisplay } from "@/components/ui/address-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OverviewLike {
  tokenCount: number;
  tokensHeld: number[];
  delegate: string;
}

interface MemberQuickStatsProps {
  address: string;
  overview: OverviewLike;
  delegatorsCount: number;
  proposalsCount: number;
  votesCount: number;
}

export function MemberQuickStats({
  address,
  overview,
  delegatorsCount,
  proposalsCount,
  votesCount,
}: MemberQuickStatsProps) {
  const isSelfDelegating = overview.delegate.toLowerCase() === address.toLowerCase();
  const delegatedToAnother = !isSelfDelegating;

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gnars Held</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{overview.tokenCount}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delegation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Delegates to</span>
            <span className="font-medium">
              {delegatedToAnother ? (
                <AddressDisplay
                  address={overview.delegate}
                  variant="compact"
                  showAvatar={false}
                  showCopy={false}
                  showExplorer={false}
                  avatarSize="sm"
                />
              ) : (
                "Self"
              )}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Delegated by</span>
            <span className="font-medium">{delegatorsCount}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Proposals</span>
            <span className="font-medium">{proposalsCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Votes</span>
            <span className="font-medium">{votesCount}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
