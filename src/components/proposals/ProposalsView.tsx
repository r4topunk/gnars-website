"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ProposalsGrid } from "@/components/proposals/ProposalsGrid";
import { Proposal } from "@/components/proposals/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useProposalSearch } from "@/hooks/use-proposal-search";
import { ProposalStatus } from "@/lib/schemas/proposals";
import type { MultiChainProposal, ProposalSource } from "@/services/multi-chain-proposals";

interface ProposalsViewProps {
  proposals: (Proposal | MultiChainProposal)[];
}

// Raw JSON types from static files
interface RawEthProposal {
  id: string;
  createdTimestamp: string;
  startBlock: string;
  endBlock: string;
  executionETA: string | null;
  title: string;
  description?: string;
  status: string;
  proposer: { id: string };
  forVotes: string;
  abstainVotes: string;
  againstVotes: string;
  quorumVotes: string;
  totalSupply: string;
}

interface RawSnapshotProposal {
  id: string;
  title: string;
  body: string;
  author: string;
  created: number;
  start: number;
  end: number;
  snapshot: number;
  state: string;
  scores: number[];
}

export function ProposalsView({ proposals: allProposals }: ProposalsViewProps) {
  const ALL_STATUSES = useMemo(() => Object.values(ProposalStatus) as ProposalStatus[], []);
  const ALL_SOURCES: ProposalSource[] = ["base", "ethereum", "snapshot"];
  
  const [activeStatuses, setActiveStatuses] = useState<Set<ProposalStatus>>(
    () =>
      new Set(
        (Object.values(ProposalStatus) as ProposalStatus[]).filter(
          (s) => s !== ProposalStatus.CANCELLED,
        ),
      ),
  );
  
  // Default: only Base proposals (server-loaded)
  // Ethereum and Snapshot are loaded client-side when filters activated
  const [activeSources, setActiveSources] = useState<Set<ProposalSource>>(
    () => new Set(["base"] as ProposalSource[])
  );
  
  // Client-side proposals (loaded on-demand)
  const [ethereumProposals, setEthereumProposals] = useState<MultiChainProposal[]>([]);
  const [snapshotProposals, setSnapshotProposals] = useState<MultiChainProposal[]>([]);
  const [isLoadingEthereum, setIsLoadingEthereum] = useState(false);
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(false);
  
  // Load Ethereum proposals on-demand
  const loadEthereumProposals = async () => {
    if (ethereumProposals.length > 0) return; // Already loaded
    setIsLoadingEthereum(true);
    try {
      const response = await fetch('/data/ethereum-proposals.json');
      const data: RawEthProposal[] = await response.json();
      // Transform to MultiChainProposal format (similar to server-side logic)
      const proposals: MultiChainProposal[] = data.map((p) => ({
        proposalId: p.id,
        proposalNumber: Number.parseInt(p.id, 10),
        title: p.title || `Proposal #${p.id}`,
        description: p.description || "",
        proposer: p.proposer.id,
        status: p.status as ProposalStatus,
        createdAt: Number(p.createdTimestamp) * 1000,
        endBlock: Number(p.endBlock),
        snapshotBlock: Number(p.startBlock),
        forVotes: Number(p.forVotes),
        againstVotes: Number(p.againstVotes),
        abstainVotes: Number(p.abstainVotes),
        quorumVotes: Number(p.quorumVotes),
        calldatas: [],
        targets: [],
        values: [],
        signatures: [],
        transactionHash: "",
        votes: [],
        voteStart: new Date(Number(p.startBlock) * 12 * 1000).toISOString(),
        voteEnd: new Date(Number(p.endBlock) * 12 * 1000).toISOString(),
        timeCreated: Number(p.createdTimestamp),
        descriptionHash: "",
        source: "ethereum" as const,
        chainId: 1,
      }));
      setEthereumProposals(proposals);
    } catch (error) {
      console.error('Failed to load Ethereum proposals:', error);
    } finally {
      setIsLoadingEthereum(false);
    }
  };

  // Load Snapshot proposals on-demand
  const loadSnapshotProposals = async () => {
    if (snapshotProposals.length > 0) return; // Already loaded
    setIsLoadingSnapshot(true);
    try {
      const response = await fetch('/data/snapshot-proposals.json');
      const data: RawSnapshotProposal[] = await response.json();
      // Transform to MultiChainProposal format
      const proposals: MultiChainProposal[] = data.map((p, index) => ({
        proposalId: p.id,
        proposalNumber: data.length - index,
        title: p.title || `Snapshot Proposal #${data.length - index}`,
        description: p.body || "",
        proposer: p.author,
        status: p.state === "active" ? ProposalStatus.ACTIVE : ProposalStatus.EXECUTED,
        createdAt: p.created * 1000,
        endBlock: 0,
        snapshotBlock: p.snapshot,
        forVotes: p.scores[0] || 0,
        againstVotes: p.scores[1] || 0,
        abstainVotes: p.scores[2] || 0,
        quorumVotes: 0,
        calldatas: [],
        targets: [],
        values: [],
        signatures: [],
        transactionHash: "",
        votes: [],
        voteStart: new Date(p.start * 1000).toISOString(),
        voteEnd: new Date(p.end * 1000).toISOString(),
        timeCreated: p.created,
        descriptionHash: "",
        source: "snapshot" as const,
        chainId: 0,
      }));
      setSnapshotProposals(proposals);
    } catch (error) {
      console.error('Failed to load Snapshot proposals:', error);
    } finally {
      setIsLoadingSnapshot(false);
    }
  };

  // Load proposals when filters are activated
  useEffect(() => {
    if (activeSources.has("ethereum")) {
      loadEthereumProposals();
    }
    if (activeSources.has("snapshot")) {
      loadSnapshotProposals();
    }
  }, [activeSources]);

  // Merge all proposals (server + client)
  const mergedProposals = useMemo(() => {
    return [...allProposals, ...ethereumProposals, ...snapshotProposals];
  }, [allProposals, ethereumProposals, snapshotProposals]);

  const availableStatuses = useMemo(() => {
    return new Set(mergedProposals.map((p) => p.status));
  }, [mergedProposals]);
  
  const availableSources = useMemo(() => {
    const sources = new Set<ProposalSource>();
    // Always show all sources (Base is always available, others load on-demand)
    sources.add("base");
    sources.add("ethereum");
    sources.add("snapshot");
    return sources;
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const {
    init: initSearchWorker,
    ids: searchFilteredIds,
    search: searchProposals,
  } = useProposalSearch(mergedProposals);

  useEffect(() => {
    searchProposals(deferredSearchQuery);
  }, [deferredSearchQuery, searchProposals]);

  const filteredProposals = useMemo(() => {
    let proposalsToFilter = mergedProposals;

    if (searchFilteredIds) {
      const idSet = new Set(searchFilteredIds);
      proposalsToFilter = mergedProposals.filter((p) => idSet.has(p.proposalId));
    }

    return proposalsToFilter.filter((p) => {
      const source = (p as MultiChainProposal).source || "base";
      return activeStatuses.has(p.status) && activeSources.has(source);
    });
  }, [mergedProposals, activeStatuses, activeSources, searchFilteredIds]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Proposals</h1>
          <p className="text-muted-foreground">
            Proposals are how the community funds skateboarding projects, media, and public work.
            This is where skateboarding grants and skateboarding funding decisions are proposed,
            discussed, and voted on.
          </p>
          <p className="text-muted-foreground mt-2">
            New here? Read{" "}
            <Link href="/about" className="text-foreground underline underline-offset-4">
              what Gnars is
            </Link>{" "}
            or see how{" "}
            <Link href="/auctions" className="text-foreground underline underline-offset-4">
              auctions support skate culture
            </Link>
            .
          </p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          <Input
            type="text"
            placeholder="Search proposals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={initSearchWorker}
            className="w-full sm:max-w-xs"
          />
          <ChainFilter
            allSources={ALL_SOURCES}
            availableSources={availableSources}
            activeSources={activeSources}
            onToggleSource={(s) => {
              setActiveSources((prev) => {
                const next = new Set(prev);
                if (next.has(s)) next.delete(s);
                else next.add(s);
                return next;
              });
            }}
            onSelectAll={() => setActiveSources(new Set(ALL_SOURCES))}
            onClearAll={() => setActiveSources(new Set())}
            onSelectDefault={() => setActiveSources(new Set(["base"] as ProposalSource[]))}
          />
          <StatusFilter
            allStatuses={ALL_STATUSES}
            availableStatuses={availableStatuses}
            activeStatuses={activeStatuses}
            onToggleStatus={(s) => {
              setActiveStatuses((prev) => {
                const next = new Set(prev);
                if (next.has(s)) next.delete(s);
                else next.add(s);
                return next;
              });
            }}
            onSelectAll={() => setActiveStatuses(new Set(ALL_STATUSES))}
            onClearAll={() => setActiveStatuses(new Set())}
            onSelectDefault={() =>
              setActiveStatuses(new Set(ALL_STATUSES.filter((s) => s !== ProposalStatus.CANCELLED)))
            }
          />
        </div>
      </div>
      {(isLoadingEthereum || isLoadingSnapshot) && (
        <div className="text-center text-sm text-muted-foreground py-4">
          Loading {isLoadingEthereum ? "Ethereum" : ""} {isLoadingSnapshot ? "Snapshot" : ""} proposals...
        </div>
      )}
      <ProposalsGrid proposals={filteredProposals} />
    </div>
  );
}

function ChainFilter({
  allSources,
  availableSources,
  activeSources,
  onToggleSource,
  onSelectAll,
  onClearAll,
  onSelectDefault,
}: {
  allSources: ProposalSource[];
  availableSources: Set<ProposalSource>;
  activeSources: Set<ProposalSource>;
  onToggleSource: (source: ProposalSource) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onSelectDefault: () => void;
}) {
  const sourceLabels: Record<ProposalSource, string> = {
    base: "Base",
    ethereum: "Ethereum",
    snapshot: "Snapshot",
  };
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Filter chain</Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-56 p-2">
        <div className="px-2 pb-2 text-sm font-medium">Chain</div>
        <div className="max-h-[60vh] overflow-auto pr-1">
          <div className="flex flex-col gap-1">
            {allSources
              .filter((s) => availableSources.has(s))
              .map((source) => {
                const id = `source-${source}`;
                return (
                  <label
                    key={source}
                    htmlFor={id}
                    className="flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent"
                  >
                    <Checkbox
                      id={id}
                      checked={activeSources.has(source)}
                      onCheckedChange={() => onToggleSource(source)}
                    />
                    <Label htmlFor={id} className="text-sm font-normal leading-none">
                      {sourceLabels[source]}
                    </Label>
                  </label>
                );
              })}
          </div>
        </div>
        <div className="mt-2 flex px-2 w-full justify-center gap-2">
          <Button variant="ghost" size="sm" onClick={onSelectDefault}>
            Default
          </Button>
          <Button variant="ghost" size="sm" onClick={onSelectAll}>
            All
          </Button>
          <Button variant="ghost" size="sm" onClick={onClearAll}>
            None
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function StatusFilter({
  allStatuses,
  availableStatuses,
  activeStatuses,
  onToggleStatus,
  onSelectAll,
  onClearAll,
  onSelectDefault,
}: {
  allStatuses: ProposalStatus[];
  availableStatuses: Set<ProposalStatus>;
  activeStatuses: Set<ProposalStatus>;
  onToggleStatus: (status: ProposalStatus) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onSelectDefault: () => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Filter status</Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-64 p-2">
        <div className="px-2 pb-2 text-sm font-medium">Status</div>
        <div className="max-h-[60vh] overflow-auto pr-1">
          <div className="flex flex-col gap-1">
            {allStatuses
              .filter((s) => availableStatuses.has(s))
              .map((status) => {
                const id = `status-${status}`;
                return (
                  <label
                    key={status}
                    htmlFor={id}
                    className="flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent"
                  >
                    <Checkbox
                      id={id}
                      checked={activeStatuses.has(status)}
                      onCheckedChange={() => onToggleStatus(status)}
                    />
                    <Label htmlFor={id} className="text-sm font-normal leading-none">
                      {status}
                    </Label>
                  </label>
                );
              })}
          </div>
        </div>
        <div className="mt-2 flex px-2 w-full justify-center gap-2">
          <Button variant="ghost" size="sm" onClick={onSelectDefault}>
            Default
          </Button>
          <Button variant="ghost" size="sm" onClick={onSelectAll}>
            All
          </Button>
          <Button variant="ghost" size="sm" onClick={onClearAll}>
            None
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
