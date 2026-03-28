'use client';

import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatEther } from 'viem';
import Link from 'next/link';
import { useState } from 'react';
import { useAccount } from 'wagmi';
import {
  ArrowLeft,
  ExternalLink,
  Trophy,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Users,
} from 'lucide-react';
import type { PoidhBounty } from '@/types/poidh';
import { CHAIN_NAMES, getExplorerUrl, getTxUrl } from '@/lib/poidh/config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ClaimBountyModal } from '@/components/bounties/ClaimBountyModal';
import { usePoidhCancelBounty, usePoidhJoinBounty } from '@/hooks/usePoidhContract';
import { useEthPrice, formatEthToUsd } from '@/hooks/use-eth-price';

const STATUS_STYLES = {
  Canceled: 'bg-red-500/10 text-red-400 border-red-500/20',
  Voting: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Open: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
} as const;

function getStatus(bounty: PoidhBounty): keyof typeof STATUS_STYLES {
  if (bounty.isCanceled) return 'Canceled';
  if (bounty.isVoting) return 'Voting';
  return 'Open';
}

export default function BountyDetailPage() {
  const params = useParams();
  const chainId = parseInt(params.chainId as string, 10);
  const id = parseInt(params.id as string, 10);
  const { address } = useAccount();
  const queryClient = useQueryClient();

  // Try to reuse cached list data first
  const cached = queryClient
    .getQueriesData<{ bounties: PoidhBounty[] }>({ queryKey: ['poidh-bounties'] })
    .flatMap(([, d]) => d?.bounties ?? [])
    .find((b) => b.chainId === chainId && b.id === id);

  const { data, isLoading, error } = useQuery<{ bounty: PoidhBounty }>({
    queryKey: ['poidh-bounty', chainId, id],
    queryFn: async () => {
      const res = await fetch(`/api/poidh/bounty/${chainId}/${id}`);
      if (!res.ok) throw new Error('Bounty not found');
      return res.json();
    },
    enabled: !cached,
    staleTime: 60_000,
  });

  const bounty = cached ?? data?.bounty;

  const { ethPrice } = useEthPrice();
  const [joinAmount, setJoinAmount] = useState('0.001');
  const [confirmCancel, setConfirmCancel] = useState(false);

  const cancelHook = usePoidhCancelBounty(chainId);
  const joinHook = usePoidhJoinBounty(chainId);

  if (isLoading && !bounty) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="h-12 w-3/4 mb-4" />
        <Skeleton className="h-24 w-full mb-8" />
        <div className="grid md:grid-cols-3 gap-6">
          <Skeleton className="h-48 col-span-2" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if ((error && !bounty) || (!isLoading && !bounty)) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <Card className="text-center p-12">
          <XCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
          <CardTitle className="mb-2">Bounty Not Found</CardTitle>
          <CardDescription className="mb-6">
            This bounty doesn&apos;t exist or has been removed.
          </CardDescription>
          <Button asChild variant="outline">
            <Link href="/community/bounties">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Bounties
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (!bounty) return null;

  const chainName = CHAIN_NAMES[chainId as keyof typeof CHAIN_NAMES] || 'Unknown';
  const amountEth = formatEther(BigInt(bounty.amount));
  const ethAmount = parseFloat(amountEth);
  const usdValue = formatEthToUsd(ethAmount, ethPrice);
  const explorerUrl = getExplorerUrl(chainId, bounty.issuer);
  const createdDate = new Date(bounty.createdAt * 1000);
  const deadlineDate = bounty.deadline ? new Date(bounty.deadline * 1000) : null;
  const status = getStatus(bounty);
  const isCreator = address?.toLowerCase() === bounty.issuer.toLowerCase();
  const isActive = !bounty.isCanceled && !bounty.isVoting;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Back */}
      <Button asChild variant="ghost" size="sm" className="mb-6">
        <Link href="/community/bounties">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Bounties
        </Link>
      </Button>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Badge variant="outline">{chainName}</Badge>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${STATUS_STYLES[status]}`}
          >
            {status}
          </span>
          {bounty.isOpenBounty && <Badge variant="secondary">🌐 Open Bounty</Badge>}
          {bounty.isMultiplayer && <Badge variant="secondary">👥 Multiplayer</Badge>}
        </div>

        <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
          {bounty.title || bounty.name}
        </h1>

        <div className="flex items-baseline gap-3">
          <Trophy className="w-7 h-7 text-primary shrink-0" />
          <span className="text-4xl md:text-5xl font-extrabold">{ethAmount.toFixed(4)}</span>
          <span className="text-xl text-muted-foreground">ETH</span>
          {ethPrice > 0 && (
            <span className="text-lg font-medium text-emerald-600 dark:text-emerald-400">
              {usdValue}
            </span>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="md:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">🎯 Objective</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {bounty.description}
              </p>
            </CardContent>
          </Card>

          {/* ─── Actions ─────────────────────────────────────────── */}
          {isActive && (
            <div className="space-y-3">
              {/* Submit claim */}
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Submit Your Proof</CardTitle>
                  <CardDescription>
                    Have proof of completion? Submit a claim directly on-chain.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ClaimBountyModal bounty={bounty}>
                    <Button size="lg" className="w-full">
                      Make a Claim
                    </Button>
                  </ClaimBountyModal>
                </CardContent>
              </Card>

              {/* Join open bounty (add funds) */}
              {bounty.isOpenBounty && (
                <Card className="border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="w-4 h-4" /> Add to the Prize Pool
                    </CardTitle>
                    <CardDescription>
                      Contribute ETH to increase the reward for this bounty.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {joinHook.isSuccess ? (
                      <div className="flex flex-col items-center gap-2 py-2 text-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                        <p className="text-sm font-medium">Contribution confirmed!</p>
                        {joinHook.hash && (
                          <a
                            href={getTxUrl(chainId, joinHook.hash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            View tx <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            step="0.0001"
                            min="0.0001"
                            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            value={joinAmount}
                            onChange={(e) => setJoinAmount(e.target.value)}
                            disabled={joinHook.isPending}
                          />
                          <span className="flex items-center text-sm text-muted-foreground px-2">ETH</span>
                        </div>
                        {joinHook.error && (
                          <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{joinHook.error.message.split('\n')[0]}</span>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          className="w-full"
                          disabled={joinHook.isPending || !joinAmount}
                          onClick={() => joinHook.join(bounty.onChainId, joinAmount)}
                        >
                          {joinHook.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              {joinHook.hash ? 'Confirming…' : 'Confirm in wallet…'}
                            </>
                          ) : (
                            `Contribute ${joinAmount} ETH`
                          )}
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Cancel (creator only) */}
              {isCreator && !bounty.isCanceled && (
                <Card className="border-destructive/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-destructive/80">Cancel Bounty</CardTitle>
                    <CardDescription>
                      Cancel and recover your funds. This cannot be undone.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {cancelHook.isSuccess ? (
                      <div className="flex flex-col items-center gap-2 py-2 text-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                        <p className="text-sm font-medium">Bounty canceled.</p>
                        {cancelHook.hash && (
                          <a
                            href={getTxUrl(chainId, cancelHook.hash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            View tx <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <>
                        {cancelHook.error && (
                          <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{cancelHook.error.message.split('\n')[0]}</span>
                          </div>
                        )}
                        {!confirmCancel ? (
                          <Button
                            variant="outline"
                            className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
                            onClick={() => setConfirmCancel(true)}
                          >
                            Cancel Bounty
                          </Button>
                        ) : (
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              className="flex-1"
                              onClick={() => setConfirmCancel(false)}
                              disabled={cancelHook.isPending}
                            >
                              Keep it
                            </Button>
                            <Button
                              variant="destructive"
                              className="flex-1"
                              disabled={cancelHook.isPending}
                              onClick={() =>
                                cancelHook.cancel(bounty.onChainId, !!bounty.isOpenBounty)
                              }
                            >
                              {cancelHook.isPending ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  {cancelHook.hash ? 'Confirming…' : 'Confirm in wallet…'}
                                </>
                              ) : (
                                'Yes, cancel'
                              )}
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {bounty.isCanceled && (
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="py-4 flex items-center gap-3 text-sm text-muted-foreground">
                <XCircle className="w-5 h-5 text-destructive shrink-0" />
                This bounty has been canceled.
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bounty Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <User className="w-4 h-4" />
                  <span className="font-medium">Issuer</span>
                </div>
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline break-all text-xs flex items-center gap-1"
                >
                  {bounty.issuer.slice(0, 6)}…{bounty.issuer.slice(-4)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div>
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">Created</span>
                </div>
                <p className="text-xs">
                  {createdDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              {deadlineDate && (
                <div>
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">Deadline</span>
                  </div>
                  <p className="text-xs">
                    {deadlineDate.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-medium">Activity</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {bounty.hasClaims && (
                    <Badge variant="secondary" className="text-xs">Has Claims</Badge>
                  )}
                  {bounty.hasParticipants && (
                    <Badge variant="secondary" className="text-xs">Has Participants</Badge>
                  )}
                  {!bounty.hasClaims && !bounty.hasParticipants && (
                    <Badge variant="outline" className="text-xs">No claims yet — be first!</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-base">About POIDH</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                POIDH (Pics Or It Didn&apos;t Happen) is a decentralized bounty platform where
                anyone can create challenges and reward proof with ETH.
              </p>
              <div className="pt-2 space-y-1">
                <a
                  href="https://poidh.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-xs flex items-center gap-1"
                >
                  Visit POIDH.xyz <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href="https://docs.poidh.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-xs flex items-center gap-1"
                >
                  Read Documentation <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
