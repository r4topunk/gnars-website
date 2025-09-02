"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchDelegators, fetchMemberOverview, fetchMemberVotes } from "@/services/members";
import { type Proposal as UiProposal, ProposalStatus } from "@/components/proposals/types";
import { getProposals, type Proposal as SdkProposal } from "@buildeross/sdk";
import { CHAIN, GNARS_ADDRESSES } from "@/lib/config";
import { MemberHeader } from "@/components/members/detail/MemberHeader";
import { MemberQuickStats } from "@/components/members/detail/MemberQuickStats";
import { MemberProposalsGrid } from "@/components/members/detail/MemberProposalsGrid";
import { MemberDelegatorsTable } from "@/components/members/detail/MemberDelegatorsTable";
import { MemberVotesTable } from "@/components/members/detail/MemberVotesTable";
import { MemberTokensGrid } from "@/components/members/detail/MemberTokensGrid";
 

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
    return address;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <MemberHeader address={address} display={display} ensAvatar={ensAvatar} />

      {/* Quick stats */}
      <MemberQuickStats
        address={address}
        overview={overview}
        delegatorsCount={delegators.length}
        proposalsCount={proposals.length}
        votesCount={votes.length}
      />

      {/* Tabs for detail lists */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="proposals">Proposals</TabsTrigger>
          <TabsTrigger value="votes">Votes</TabsTrigger>
          <TabsTrigger value="tokens">Tokens</TabsTrigger>
          <TabsTrigger value="delegates">Delegates</TabsTrigger>
        </TabsList>

        <TabsContent value="proposals" className="mt-6">
          <MemberProposalsGrid proposals={proposals} />
        </TabsContent>

        <TabsContent value="delegates" className="mt-6">
          <MemberDelegatorsTable delegators={delegators} />
        </TabsContent>

        <TabsContent value="votes" className="mt-6">
          <MemberVotesTable votes={votes} />
        </TabsContent>

        <TabsContent value="tokens" className="mt-6">
          <MemberTokensGrid tokens={overview.tokens as unknown as { id: string | number; imageUrl?: string | null; mintedAt?: number | null; endTime?: number | null; finalBidWei?: string | number | null; winner?: string | null }[]} />
        </TabsContent>
      </Tabs>
    </div>
  );
}


