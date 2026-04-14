"use client";

import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { AddressDisplay } from "@/components/ui/address-display";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
    isOwnProfile &&
    delegationStatus.isSmartAccount &&
    Boolean(delegationStatus.smartAccountAddress);

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

  const eoaCount = overview.tokenCount;
  const saCount =
    delegationStatus.smartAccountTokenBalance !== undefined
      ? Number(delegationStatus.smartAccountTokenBalance)
      : 0;
  const totalGnars = showSmartAccountCard ? eoaCount + saCount : eoaCount;
  const showBreakdown = showSmartAccountCard && saCount > 0;

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
              {eoaCount} at wallet · {saCount} at smart account
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

      {showSmartAccountCard ? (
        <Card className="mt-6">
          <CardHeader>
            <CardDescription>An onchain account that signs Gnars transactions on your behalf. Gas is sponsored by the DAO.</CardDescription>
            <CardTitle className="text-base">Smart account</CardTitle>
            <CardAction>
              <Badge variant="secondary">gasless</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full justify-between font-mono text-xs"
              onClick={() =>
                handleCopy(delegationStatus.smartAccountAddress!, "Smart account address")
              }
            >
              <span>{shortAddress(delegationStatus.smartAccountAddress)}</span>
              <Copy />
            </Button>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Gnars at wallet</div>
                <div className="mt-1 text-xl font-semibold tabular-nums">
                  {delegationStatus.eoaTokenBalance !== undefined
                    ? delegationStatus.eoaTokenBalance.toString()
                    : "—"}
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Gnars at smart account</div>
                <div className="mt-1 text-xl font-semibold tabular-nums">
                  {delegationStatus.smartAccountTokenBalance !== undefined
                    ? delegationStatus.smartAccountTokenBalance.toString()
                    : "—"}
                </div>
              </div>
            </div>

            {delegationStatus.isDelegatedToSmartAccount ? (
              <Alert>
                <Check />
                <AlertTitle>Voting power delegated</AlertTitle>
                <AlertDescription>
                  Your votes flow through your smart account.
                </AlertDescription>
              </Alert>
            ) : delegationStatus.needsSmartAccountDelegation ? (
              <Alert>
                <AlertTitle>Action recommended</AlertTitle>
                <AlertDescription>
                  <p>
                    Delegate the voting power of your{" "}
                    {delegationStatus.eoaTokenBalance?.toString() ?? "0"}{" "}
                    {delegationStatus.eoaTokenBalance === 1n ? "Gnar" : "Gnars"} to your smart
                    account so you can vote through the new flow.
                  </p>
                  <Button
                    size="sm"
                    className="mt-2 w-full"
                    onClick={handleDelegateToSmart}
                    disabled={isDelegating || !delegationStatus.smartAccountAddress}
                  >
                    {isDelegating ? "Delegating…" : "Delegate voting power"}
                  </Button>
                </AlertDescription>
              </Alert>
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
