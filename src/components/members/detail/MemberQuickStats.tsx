"use client";

import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { AddressDisplay } from "@/components/ui/address-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDelegationStatus } from "@/hooks/use-delegation-status";
import { useEoaDelegate } from "@/hooks/use-eoa-delegate";
import { useUserAddress } from "@/hooks/use-user-address";

interface OverviewLike {
  tokenCount: number;
  tokensHeld: number[];
  delegate: string;
  smartAccount?: {
    address: string;
    tokenCount: number;
    tokensHeld: number[];
    delegate: string;
  };
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
  // Also treat "delegated to own smart account" as a form of self-delegation
  // for display purposes — it's still the same user.
  const isDelegatedToOwnSmartAccount =
    overview.smartAccount?.address !== undefined &&
    overview.delegate.toLowerCase() === overview.smartAccount.address.toLowerCase();
  const delegatedToAnother = !isSelfDelegating && !isDelegatedToOwnSmartAccount;

  const { address: activeAddress, adminAddress } = useUserAddress();
  const connectedEoa = adminAddress ?? activeAddress;
  const isOwnProfile =
    connectedEoa !== undefined && connectedEoa.toLowerCase() === address.toLowerCase();
  const delegationStatus = useDelegationStatus();

  const eoaDelegate = useEoaDelegate({
    onSuccess: () => {
      toast.success("Voting power delegated to your smart account");
    },
  });
  const isDelegating = eoaDelegate.isPending || eoaDelegate.isConfirming;

  const handleCopy = (value: string, label: string) => {
    void navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  const handleDelegateToSmart = async () => {
    if (!delegationStatus.smartAccountAddress) return;
    await eoaDelegate.delegate(delegationStatus.smartAccountAddress);
  };

  const saCountFromOverview = overview.smartAccount?.tokenCount ?? 0;
  const eoaCount = overview.tokenCount - saCountFromOverview;
  const totalGnars = overview.tokenCount;
  const showBreakdown = saCountFromOverview > 0;

  // Show the smart-account sub-card in two scenarios:
  //  1. The viewed profile actually has tokens at its SA (subgraph-sourced,
  //     works for any visitor including anonymous).
  //  2. The viewer is the profile owner with an active AA session — shows
  //     the sub-card even with 0 tokens so they can manage delegation.
  const showSmartAccountCardFromOverview = Boolean(
    overview.smartAccount && overview.smartAccount.tokenCount > 0,
  );
  const showSmartAccountCardFromSession =
    isOwnProfile && Boolean(adminAddress) && Boolean(delegationStatus.smartAccountAddress);
  const showSmartAccountCard = showSmartAccountCardFromOverview || showSmartAccountCardFromSession;

  const smartAccountAddress =
    overview.smartAccount?.address ?? delegationStatus.smartAccountAddress;
  const smartAccountTokenCount = overview.smartAccount?.tokenCount ?? 0;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Gnars Held</CardDescription>
            <CardTitle className="text-3xl font-semibold tabular-nums">{totalGnars}</CardTitle>
          </CardHeader>
          {showBreakdown ? (
            <CardFooter className="text-sm text-muted-foreground">
              {eoaCount} at wallet · {saCountFromOverview} at smart account
            </CardFooter>
          ) : null}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Delegation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Delegates to</span>
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
                ) : isDelegatedToOwnSmartAccount ? (
                  "Smart account"
                ) : (
                  "Self"
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Delegated by</span>
              <span className="font-medium tabular-nums">{delegatorsCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Proposals</span>
              <span className="font-medium tabular-nums">{proposalsCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Votes</span>
              <span className="font-medium tabular-nums">{votesCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {showSmartAccountCard && smartAccountAddress ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">Smart account</CardTitle>
            <CardDescription>
              An onchain account that signs Gnars transactions on behalf of the wallet. Gas is
              sponsored by the DAO.
            </CardDescription>
            <CardAction>
              <Badge variant="secondary">gasless</Badge>
            </CardAction>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Address row — read-only pill with inline copy action */}
            <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2">
              <span className="min-w-0 flex-1 select-all break-all font-mono text-xs text-muted-foreground">
                {smartAccountAddress}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0"
                onClick={() => handleCopy(smartAccountAddress, "Smart account address")}
              >
                <Copy className="size-3.5" />
                <span className="sr-only">Copy smart account address</span>
              </Button>
            </div>

            {/* Stats — nested section cards using the dashboard-01 pattern */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-muted/30 shadow-none">
                <CardHeader className="gap-1">
                  <CardDescription className="text-xs">Gnars at wallet</CardDescription>
                  <CardTitle className="text-2xl font-semibold tabular-nums">{eoaCount}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-muted/30 shadow-none">
                <CardHeader className="gap-1">
                  <CardDescription className="text-xs">Gnars at smart account</CardDescription>
                  <CardTitle className="text-2xl font-semibold tabular-nums">
                    {smartAccountTokenCount}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>
          </CardContent>

          {/* Action state — footer keeps the CTA visually separated from the
              info block and gives the card a clean top-to-bottom reading order:
              what it is → what it holds → what you can do about it. */}
          {isOwnProfile ? (
            delegationStatus.isDelegatedToSmartAccount ? (
              <CardFooter className="flex items-center gap-2 border-t pt-4 text-sm">
                <Check className="size-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Voting power delegated to your smart account
                </span>
              </CardFooter>
            ) : delegationStatus.needsSmartAccountDelegation ? (
              <CardFooter className="flex-col items-stretch gap-3 border-t pt-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Action recommended</p>
                  <p className="text-xs text-muted-foreground">
                    Delegate the voting power of your{" "}
                    {delegationStatus.eoaTokenBalance?.toString() ?? "0"}{" "}
                    {delegationStatus.eoaTokenBalance === 1n ? "Gnar" : "Gnars"} to your smart
                    account so you can vote through the new flow.
                  </p>
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={handleDelegateToSmart}
                  disabled={isDelegating || !delegationStatus.smartAccountAddress}
                >
                  {isDelegating ? "Delegating…" : "Delegate voting power"}
                </Button>
              </CardFooter>
            ) : (
              <CardFooter className="border-t pt-4 text-xs text-muted-foreground">
                Voting via smart account is not enabled yet.
              </CardFooter>
            )
          ) : null}
        </Card>
      ) : null}
    </>
  );
}
