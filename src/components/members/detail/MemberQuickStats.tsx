"use client";

import { Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { AddressDisplay } from "@/components/ui/address-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDelegationStatus } from "@/hooks/use-delegation-status";
import { useEoaDelegate } from "@/hooks/use-eoa-delegate";

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

function shortAddress(addr: string | undefined) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
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

  const { address: connectedEoa } = useAccount();
  const isOwnProfile =
    connectedEoa !== undefined && connectedEoa.toLowerCase() === address.toLowerCase();
  const delegationStatus = useDelegationStatus();
  const showSmartAccountCard =
    isOwnProfile && delegationStatus.isSmartAccount && Boolean(delegationStatus.smartAccountAddress);

  const eoaDelegate = useEoaDelegate({
    onSuccess: () => {
      toast.success("Voting power delegated to your smart account");
    },
  });
  const isDelegating = eoaDelegate.isPending || eoaDelegate.isConfirming;

  const handleCopy = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  const handleDelegateToSmart = async () => {
    if (!delegationStatus.smartAccountAddress) return;
    await eoaDelegate.delegate(delegationStatus.smartAccountAddress);
  };

  return (
    <>
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

      {showSmartAccountCard ? (
        <Card className="mt-6 border-amber-500/30">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-amber-500" />
              <CardTitle className="text-base">Your smart account</CardTitle>
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-normal">
                gasless
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              An onchain account that signs Gnars transactions on your behalf. Gas is sponsored by
              the DAO.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <button
              type="button"
              className="w-full flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent transition-colors text-left"
              onClick={() =>
                handleCopy(delegationStatus.smartAccountAddress!, "Smart account address")
              }
            >
              <span className="font-mono text-sm">
                {shortAddress(delegationStatus.smartAccountAddress)}
              </span>
              <span className="text-xs text-muted-foreground">copy</span>
            </button>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-border p-3">
                <div className="text-xs text-muted-foreground">Gnars at wallet</div>
                <div className="text-xl font-semibold mt-1">
                  {delegationStatus.eoaTokenBalance !== undefined
                    ? delegationStatus.eoaTokenBalance.toString()
                    : "—"}
                </div>
              </div>
              <div className="rounded-lg border border-border p-3">
                <div className="text-xs text-muted-foreground">Gnars at smart account</div>
                <div className="text-xl font-semibold mt-1">
                  {delegationStatus.smartAccountTokenBalance !== undefined
                    ? delegationStatus.smartAccountTokenBalance.toString()
                    : "—"}
                </div>
              </div>
            </div>

            {delegationStatus.isDelegatedToSmartAccount ? (
              <div className="flex items-start gap-2 rounded-lg border border-green-500/30 bg-green-500/[0.04] p-3 text-sm">
                <Check className="size-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium">Voting power delegated</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your votes flow through your smart account.
                  </p>
                </div>
              </div>
            ) : delegationStatus.needsSmartAccountDelegation ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.04] p-3 space-y-3">
                <div className="text-sm">
                  <div className="font-medium">Action recommended</div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
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
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Voting via smart account is not enabled yet.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
