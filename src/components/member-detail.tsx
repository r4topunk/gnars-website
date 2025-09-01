"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { GnarImageTile } from "@/components/gnar-image-tile";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink } from "lucide-react";
import { fetchDelegators, fetchMemberOverview, fetchMemberVotes } from "@/services/members";
import { ProposalCard, type Proposal as UiProposal, ProposalStatus } from "@/components/recent-proposals";
import { getProposals, type Proposal as SdkProposal } from "@buildeross/sdk";
import { CHAIN, GNARS_ADDRESSES } from "@/lib/config";
import { toast } from "sonner";

interface MemberDetailProps {
  address: string;
}

export function MemberDetail({ address }: MemberDetailProps) {
  const [ensName, setEnsName] = useState<string | null>(null);
  const [ensAvatar, setEnsAvatar] = useState<string | null>(null);
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof fetchMemberOverview>> | null>(null);
  const [delegators, setDelegators] = useState<string[]>([]);
  const [proposals, setProposals] = useState<UiProposal[]>([]);
  const [votes, setVotes] = useState<Awaited<ReturnType<typeof fetchMemberVotes>>["votes"]>([]);
  const [loading, setLoading] = useState(true);

  const display = useMemo(() => {
    if (ensName) return ensName;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, [ensName, address]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const [ov, dels, vts] = await Promise.all([
          fetchMemberOverview(address),
          fetchDelegators(address),
          fetchMemberVotes(address, 100),
        ]);
        if (!mounted) return;
        setOverview(ov);
        setDelegators(dels);
        setVotes(vts.votes);

        // Load proposals using the same SDK mapping as proposals page, then filter by proposer
        const { proposals: sdkProposals } = await getProposals(CHAIN.id, GNARS_ADDRESSES.token, 200);
        const mapped: UiProposal[] = ((sdkProposals as SdkProposal[] | undefined) ?? [])
          .filter((p) => String(p.proposer).toLowerCase() === address.toLowerCase())
          .map((p) => ({
            proposalId: String(p.proposalId),
            proposalNumber: Number(p.proposalNumber),
            title: p.title ?? "",
            description: p.description ?? "",
            proposer: p.proposer,
            status: (() => {
              const s = p.state as unknown;
              if (typeof s === "number") {
                switch (s) {
                  case 0:
                    return ProposalStatus.PENDING;
                  case 1:
                    return ProposalStatus.ACTIVE;
                  case 2:
                    return ProposalStatus.CANCELLED;
                  case 3:
                    return ProposalStatus.DEFEATED;
                  case 4:
                    return ProposalStatus.SUCCEEDED;
                  case 5:
                    return ProposalStatus.QUEUED;
                  case 6:
                    return ProposalStatus.EXPIRED;
                  case 7:
                    return ProposalStatus.EXECUTED;
                  case 8:
                    return ProposalStatus.VETOED;
                  default:
                    return ProposalStatus.PENDING;
                }
              }
              const up = String(s).toUpperCase();
              switch (up) {
                case "PENDING":
                  return ProposalStatus.PENDING;
                case "ACTIVE":
                  return ProposalStatus.ACTIVE;
                case "SUCCEEDED":
                  return ProposalStatus.SUCCEEDED;
                case "QUEUED":
                  return ProposalStatus.QUEUED;
                case "EXECUTED":
                  return ProposalStatus.EXECUTED;
                case "DEFEATED":
                  return ProposalStatus.DEFEATED;
                case "CANCELED":
                  return ProposalStatus.CANCELLED;
                case "VETOED":
                  return ProposalStatus.VETOED;
                case "EXPIRED":
                  return ProposalStatus.EXPIRED;
                default:
                  return ProposalStatus.PENDING;
              }
            })(),
            forVotes: Number(p.forVotes ?? 0),
            againstVotes: Number(p.againstVotes ?? 0),
            abstainVotes: Number(p.abstainVotes ?? 0),
            quorumVotes: Number(p.quorumVotes ?? 0),
            voteStart: new Date(Number(p.voteStart ?? 0) * 1000).toISOString(),
            voteEnd: new Date(Number(p.voteEnd ?? 0) * 1000).toISOString(),
            expiresAt: p.expiresAt ? new Date(Number(p.expiresAt) * 1000).toISOString() : undefined,
            timeCreated: Number(p.timeCreated ?? 0),
            executed: Boolean(p.executedAt),
            canceled: Boolean(p.cancelTransactionHash),
            queued: String(p.state) === "QUEUED",
            vetoed: Boolean(p.vetoTransactionHash),
            transactionHash: p.transactionHash,
          }));
        setProposals(mapped);
      } catch (err) {
        console.error("Failed to load member details", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [address]);

  // ENS name + avatar (non-blocking, best-effort)
  useEffect(() => {
    let ignore = false;
    async function loadEns() {
      try {
        const res = await fetch(`https://api.ensideas.com/ens/resolve/${address}`);
        if (!res.ok) return;
        const data = (await res.json()) as { name?: string; displayName?: string; avatar?: string };
        if (ignore) return;
        const name = data.displayName || data.name || null;
        setEnsName(name);
        setEnsAvatar(data.avatar || null);
      } catch {
        // ignore
      }
    }
    loadEns();
    return () => {
      ignore = true;
    };
  }, [address]);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Failed to copy ${label}`);
    }
  };

  if (loading || !overview) {
    return (
      <div className="space-y-6">
        <div className="h-20 bg-muted rounded animate-pulse" />
        <div className="grid gap-6 md:grid-cols-3">
          <div className="h-28 bg-muted rounded animate-pulse" />
          <div className="h-28 bg-muted rounded animate-pulse" />
          <div className="h-28 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-96 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  const isSelfDelegating = overview.delegate.toLowerCase() === address.toLowerCase();
  const delegatedToAnother = !isSelfDelegating;
  const hasDelegators = delegators.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Avatar className="h-16 w-16">
          {ensAvatar ? <AvatarImage src={ensAvatar} alt={display} /> : null}
          <AvatarFallback>{display.slice(2, 4).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{display}</h1>
            {ensName ? (
              <Badge variant="secondary">ENS</Badge>
            ) : (
              <Badge variant="outline">Address</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <code className="font-mono">{address}</code>
            <Button variant="ghost" size="icon" aria-label="Copy address" onClick={() => copy(address, "Address")}>
              <Copy className="h-4 w-4" />
            </Button>
            <a
              href={`https://basescan.org/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center"
              aria-label="Open in explorer"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gnars Held</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overview.tokenCount}</div>
            {overview.tokensHeld.length > 0 ? (
              <div className="text-xs text-muted-foreground mt-1">#{overview.tokensHeld.join(", #")}</div>
            ) : (
              <div className="text-sm text-muted-foreground">No tokens</div>
            )}
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
                {delegatedToAnother
                  ? `${overview.delegate.slice(0, 6)}...${overview.delegate.slice(-4)}`
                  : "Self"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Delegated by</span>
              <span className="font-medium">{delegators.length}</span>
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
              <span className="font-medium">{proposals.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Votes</span>
              <span className="font-medium">{votes.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detail lists */}
      <Tabs defaultValue="proposals" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="proposals">Proposals</TabsTrigger>
          <TabsTrigger value="votes">Votes</TabsTrigger>
          <TabsTrigger value="tokens">Tokens</TabsTrigger>
        </TabsList>

        <TabsContent value="proposals" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Proposals Made</CardTitle>
            </CardHeader>
            <CardContent>
              {proposals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No proposals from this member.</div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {proposals.map((p) => (
                    <ProposalCard key={p.proposalId} proposal={p} showBanner />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="votes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Votes & Comments</CardTitle>
            </CardHeader>
            <CardContent>
              {votes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No votes from this member.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Proposal</TableHead>
                      <TableHead>Choice</TableHead>
                      <TableHead className="text-right">Weight</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {votes.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <a href={`/proposals/${v.proposalNumber}`} className="font-medium hover:underline">
                              Proposal {v.proposalNumber}
                            </a>
                            {v.reason ? (
                              <span className="text-xs text-muted-foreground line-clamp-2">{v.reason}</span>
                            ) : null}
                            <span className="text-xs text-muted-foreground">
                              {new Date(v.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              v.support === "FOR"
                                ? "default"
                                : v.support === "AGAINST"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {v.support}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{v.weight}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tokens" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Gnars Held</CardTitle>
            </CardHeader>
            <CardContent>
              {overview.tokens.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No tokens held.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {overview.tokens.map((t) => {
                    const dateLabel = t.endTime
                      ? new Date(t.endTime * 1000).toLocaleDateString()
                      : t.mintedAt
                        ? new Date(t.mintedAt * 1000).toLocaleDateString()
                        : "";
                    const finalEth = (() => {
                      if (!t.finalBidWei) return "-";
                      try {
                        const eth = Number(t.finalBidWei) / 1e18;
                        return eth.toFixed(3).replace(/\.0+$/, "");
                      } catch {
                        return "-";
                      }
                    })();
                    const winnerShort = t.winner
                      ? `${t.winner.slice(0, 6)}...${t.winner.slice(-4)}`
                      : "-";
                    return (
                      <Card key={t.id} className="overflow-hidden hover:shadow-md transition-shadow">
                        <CardContent className="space-y-4 px-4">
                          <GnarImageTile imageUrl={t.imageUrl || undefined} tokenId={t.id} />
                          <div className="space-y-2">
                            <div className="flex items-top justify-between">
                              <h3 className="font-semibold">Gnar #{t.id}</h3>
                              <div className="text-xs text-muted-foreground pt-1">{dateLabel}</div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">Final bid</div>
                              <div className="font-bold text-lg">
                                {finalEth === "-" ? "-" : `${finalEth} ETH`}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">Winner</div>
                              <div className="font-mono text-sm">{finalEth === "-" ? "-" : winnerShort}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


