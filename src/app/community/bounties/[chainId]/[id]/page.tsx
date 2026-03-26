'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { formatEther } from 'viem';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Trophy, Clock, User, CheckCircle2, XCircle } from 'lucide-react';
import type { PoidhBounty } from '@/types/poidh';
import { CHAIN_NAMES, getExplorerUrl } from '@/lib/poidh/config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function BountyDetailPage() {
  const params = useParams();
  const chainId = parseInt(params.chainId as string, 10);
  const id = parseInt(params.id as string, 10);

  const { data, isLoading, error } = useQuery<{ bounties: PoidhBounty[] }>({
    queryKey: ['poidh-bounty', chainId, id],
    queryFn: async () => {
      const res = await fetch('/api/poidh/bounties?status=all&filterGnarly=false');
      if (!res.ok) throw new Error('Failed to fetch bounty');
      return res.json();
    },
  });

  const bounty = data?.bounties.find(
    (b) => b.chainId === chainId && b.id === id
  );

  if (isLoading) {
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

  if (error || !bounty) {
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

  const chainName = CHAIN_NAMES[chainId as keyof typeof CHAIN_NAMES] || 'Unknown';
  const amountEth = formatEther(BigInt(bounty.amount));
  const explorerUrl = getExplorerUrl(chainId, bounty.issuer);
  const createdDate = new Date(bounty.createdAt * 1000);
  const deadlineDate = bounty.deadline ? new Date(bounty.deadline * 1000) : null;

  const getStatusBadge = () => {
    if (bounty.isCanceled) return <Badge variant="destructive">Canceled</Badge>;
    if (bounty.isVoting) return <Badge variant="default">Voting</Badge>;
    if (bounty.inProgress) return <Badge variant="secondary">In Progress</Badge>;
    return <Badge variant="default" className="bg-green-500">Open</Badge>;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Back Button */}
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
          {getStatusBadge()}
          {bounty.isOpenBounty && <Badge variant="secondary">🌐 Open Bounty</Badge>}
          {bounty.isMultiplayer && <Badge variant="secondary">👥 Multiplayer</Badge>}
        </div>
        
        <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
          {bounty.title || bounty.name}
        </h1>

        <div className="flex items-baseline gap-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-8 h-8 text-primary" />
            <span className="text-4xl md:text-5xl font-bold text-foreground">
              {parseFloat(amountEth).toFixed(4)}
            </span>
            <span className="text-2xl text-muted-foreground">ETH</span>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🎯 Objective
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {bounty.description}
              </p>
            </CardContent>
          </Card>

          {/* Claim Action */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle>Submit Your Proof</CardTitle>
              <CardDescription>
                Connect your wallet to submit a claim for this bounty
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="lg" className="w-full">
                <a
                  href={`https://poidh.xyz/bounties/${chainId}/${bounty.onChainId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Claim on POIDH.xyz
                  <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              </Button>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Full wallet integration coming soon to Gnars.com
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details Card */}
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
                  className="text-primary hover:underline break-all text-xs"
                >
                  {bounty.issuer.slice(0, 6)}...{bounty.issuer.slice(-4)}
                </a>
              </div>

              <div>
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">Created</span>
                </div>
                <p className="text-xs">{createdDate.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</p>
              </div>

              {deadlineDate && (
                <div>
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">Deadline</span>
                  </div>
                  <p className="text-xs">{deadlineDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</p>
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-medium">Status</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {bounty.hasClaims && <Badge variant="secondary" className="text-xs">Has Claims</Badge>}
                  {bounty.hasParticipants && <Badge variant="secondary" className="text-xs">Has Participants</Badge>}
                  {!bounty.hasClaims && !bounty.hasParticipants && (
                    <Badge variant="outline" className="text-xs">No claims yet</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-base">About POIDH</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                POIDH (Pics Or It Didn&apos;t Happen) is a decentralized bounty platform 
                where anyone can create challenges and reward proof with ETH.
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
