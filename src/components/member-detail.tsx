"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GnarCard } from "@/components/gnar-card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddressDisplay } from "@/components/ui/address-display";
import { fetchDelegators, fetchDelegatorsWithCounts, fetchMemberOverview, fetchMemberVotes } from "@/services/members";
import { ProposalCard, type Proposal as UiProposal, ProposalStatus } from "@/components/recent-proposals";
import { getProposals, type Proposal as SdkProposal } from "@buildeross/sdk";
import { CHAIN, GNARS_ADDRESSES } from "@/lib/config";
 

interface MemberDetailProps {
  address: string;
}

export function MemberDetail({ address }: MemberDetailProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [ensName, setEnsName] = useState<string | null>(null);
  const [ensAvatar, setEnsAvatar] = useState<string | null>(null);
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof fetchMemberOverview>> | null>(null);
  const [delegators, setDelegators] = useState<string[]>([]);
  const [proposals, setProposals] = useState<UiProposal[]>([]);
  type VoteItem = Awaited<ReturnType<typeof fetchMemberVotes>>["votes"][number] & {
    proposalTitle?: string | null;
  };
  const [votes, setVotes] = useState<VoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const allowedTabs = useMemo(() => new Set(["proposals", "votes", "tokens", "delegates"]), []);
  const initialTab = useMemo(() => {
    const raw = searchParams.get("tab");
    const normalized = raw ? raw.toLowerCase() : null;
    return normalized && allowedTabs.has(normalized) ? normalized : "proposals";
  }, [searchParams, allowedTabs]);
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  useEffect(() => {
    const raw = searchParams.get("tab");
    const normalized = raw ? raw.toLowerCase() : null;
    const next = normalized && allowedTabs.has(normalized) ? normalized : "proposals";
    if (next !== activeTab) setActiveTab(next);
  }, [searchParams, allowedTabs, activeTab]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    const params = new URLSearchParams(searchParams.toString());
    if (val === "proposals") {
      params.delete("tab");
    } else {
      params.set("tab", val);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const display = useMemo(() => {
    if (ensName) return ensName;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, [ensName, address]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const [ov, dels, vts, delsWithCounts] = await Promise.all([
          fetchMemberOverview(address),
          fetchDelegators(address),
          fetchMemberVotes(address, 100),
          fetchDelegatorsWithCounts(address),
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Avatar className="h-16 w-16">
          {ensAvatar ? <AvatarImage src={ensAvatar} alt={display} /> : null}
          <AvatarFallback>{address.slice(2, 4).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{display}</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <AddressDisplay
              address={address}
              variant="default"
              showAvatar={false}
              showCopy={true}
              showExplorer={true}
              showENS={false}
              truncateLength={6}
            />
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
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="proposals">Proposals</TabsTrigger>
          <TabsTrigger value="votes">Votes</TabsTrigger>
          <TabsTrigger value="tokens">Tokens</TabsTrigger>
          <TabsTrigger value="delegates">Delegates</TabsTrigger>
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

        <TabsContent value="delegates" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Delegators</CardTitle>
            </CardHeader>
            <CardContent>
              {delegators.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No one delegated to this member.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Address/ENS</TableHead>
                      <TableHead className="text-right">Gnars Delegated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {delegators.map((addr) => (
                      <TableRow key={addr}>
                        <TableCell>
                          <AddressDisplay
                            address={addr}
                            variant="compact"
                            showAvatar
                            showENS
                            showCopy={false}
                            showExplorer={false}
                            avatarSize="sm"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {/* In a future refinement, we can map counts from delsWithCounts by address */}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                      <TableHead className="text-center">Vote</TableHead>
                      <TableHead className="text-right">Weight</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {votes.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell>
                          <div className="flex flex-col gap-1 whitespace-normal break-words">
                            <a href={`/proposals/${v.proposalNumber}`} className="font-medium hover:underline">
                              {v.proposalTitle && v.proposalTitle.trim().length > 0
                                ? `${v.proposalNumber} - ${v.proposalTitle}`
                                : `${v.proposalNumber}`}
                            </a>
                            {v.reason ? (
                              <span className="text-xs text-muted-foreground whitespace-pre-wrap break-words">{v.reason}</span>
                            ) : null}
                            <span className="text-xs text-muted-foreground">
                              {new Date(v.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="default"
                            className={
                              v.support === "FOR"
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : v.support === "AGAINST"
                                  ? "bg-red-600 hover:bg-red-700 text-white"
                                  : "bg-zinc-600 hover:bg-zinc-700 text-white"
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
        </TabsContent>
      </Tabs>
    </div>
  );
}


