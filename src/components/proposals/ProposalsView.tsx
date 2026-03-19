"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ProposalsGrid } from "@/components/proposals/ProposalsGrid";
import { Proposal } from "@/components/proposals/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { useProposalSearch } from "@/hooks/use-proposal-search";
import { getProposalStatus, ProposalStatus } from "@/lib/schemas/proposals";
import { cn } from "@/lib/utils";
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
  calldatas?: string[];
  targets?: string[];
  values?: string[];
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

const SOURCE_CONFIG: Record<ProposalSource, { label: string; activeClass: string; dotClass: string }> = {
  base: {
    label: "Base",
    activeClass: "bg-blue-500/15 text-blue-700 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40",
    dotClass: "bg-blue-500",
  },
  ethereum: {
    label: "Ethereum",
    activeClass: "bg-indigo-500/15 text-indigo-700 border-indigo-300 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/40",
    dotClass: "bg-indigo-500",
  },
  snapshot: {
    label: "Snapshot",
    activeClass: "bg-amber-500/15 text-amber-700 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40",
    dotClass: "bg-amber-500",
  },
};

const ALL_SOURCES: ProposalSource[] = ["base", "ethereum", "snapshot"];

export function ProposalsView({ proposals: allProposals }: ProposalsViewProps) {
  const ALL_STATUSES = useMemo(() => Object.values(ProposalStatus) as ProposalStatus[], []);

  const [activeStatuses, setActiveStatuses] = useState<Set<ProposalStatus>>(
    () =>
      new Set(
        (Object.values(ProposalStatus) as ProposalStatus[]).filter(
          (s) => s !== ProposalStatus.CANCELLED,
        ),
      ),
  );

  const [activeSources, setActiveSources] = useState<Set<ProposalSource>>(
    () => new Set(["base"] as ProposalSource[]),
  );

  // Client-side proposals (loaded on-demand)
  const [ethereumProposals, setEthereumProposals] = useState<MultiChainProposal[]>([]);
  const [snapshotProposals, setSnapshotProposals] = useState<MultiChainProposal[]>([]);
  const [isLoadingEthereum, setIsLoadingEthereum] = useState(false);
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(false);

  // Load Ethereum proposals on-demand
  const loadEthereumProposals = async () => {
    if (ethereumProposals.length > 0) return;
    setIsLoadingEthereum(true);
    try {
      const response = await fetch("/data/ethereum-proposals.json");
      const data: RawEthProposal[] = await response.json();
      const proposals: MultiChainProposal[] = data.map((p) => ({
        proposalId: p.id,
        proposalNumber: Number.parseInt(p.id, 10),
        title: p.title || `Proposal #${p.id}`,
        description: p.description || "",
        proposer: p.proposer.id,
        status: getProposalStatus(p.status),
        createdAt: Number(p.createdTimestamp) * 1000,
        endBlock: Number(p.endBlock),
        snapshotBlock: Number(p.startBlock),
        forVotes: Number(p.forVotes),
        againstVotes: Number(p.againstVotes),
        abstainVotes: Number(p.abstainVotes),
        quorumVotes: Number(p.quorumVotes),
        calldatas: p.calldatas ?? [],
        targets: p.targets ?? [],
        values: p.values ?? [],
        signatures: [],
        transactionHash: "",
        votes: [],
        voteStart: new Date(Number(p.createdTimestamp) * 1000).toISOString(),
        voteEnd: new Date((Number(p.createdTimestamp) + (Number(p.endBlock) - Number(p.startBlock)) * 12) * 1000).toISOString(),
        timeCreated: Number(p.createdTimestamp),
        descriptionHash: "",
        source: "ethereum" as const,
        chainId: 1,
      }));
      setEthereumProposals(proposals);
    } catch (error) {
      console.error("Failed to load Ethereum proposals:", error);
    } finally {
      setIsLoadingEthereum(false);
    }
  };

  // Load Snapshot proposals on-demand
  const loadSnapshotProposals = async () => {
    if (snapshotProposals.length > 0) return;
    setIsLoadingSnapshot(true);
    try {
      const response = await fetch("/data/snapshot-proposals.json");
      const data: RawSnapshotProposal[] = await response.json();
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
      console.error("Failed to load Snapshot proposals:", error);
    } finally {
      setIsLoadingSnapshot(false);
    }
  };

  // Load proposals when filters are activated
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Count proposals per source for badges
  const sourceCounts = useMemo(() => {
    const counts: Record<ProposalSource, number> = { base: 0, ethereum: 0, snapshot: 0 };
    for (const p of mergedProposals) {
      const source = (p as MultiChainProposal).source || "base";
      counts[source]++;
    }
    return counts;
  }, [mergedProposals]);

  const activeStatusCount = activeStatuses.size;
  const totalStatusCount = ALL_STATUSES.filter((s) => availableStatuses.has(s)).length;
  const isStatusFiltered = activeStatusCount < totalStatusCount;

  const toggleSource = (source: ProposalSource) => {
    setActiveSources((prev) => {
      const next = new Set(prev);
      if (next.has(source)) next.delete(source);
      else next.add(source);
      return next;
    });
  };

  const isLoading = isLoadingEthereum || isLoadingSnapshot;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Proposals</h1>
        <p className="text-muted-foreground mt-1">
          How the community funds skateboarding projects, media, and public
          work.{" "}
          <Link
            href="/about"
            className="text-foreground underline underline-offset-4 decoration-muted-foreground/40 hover:decoration-foreground transition-colors"
          >
            Learn more
          </Link>
        </p>
      </div>

      {/* Filters toolbar */}
      <div className="flex flex-col gap-3">
        {/* Row 1: Search + Status filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search proposals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={initSearchWorker}
              className="pl-9"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <StatusFilter
            allStatuses={ALL_STATUSES}
            availableStatuses={availableStatuses}
            activeStatuses={activeStatuses}
            isFiltered={isStatusFiltered}
            onToggleStatus={(s) => {
              setActiveStatuses((prev) => {
                const next = new Set(prev);
                if (next.has(s)) next.delete(s);
                else next.add(s);
                return next;
              });
            }}
            onSelectAll={() =>
              setActiveStatuses(
                new Set(ALL_STATUSES.filter((s) => availableStatuses.has(s))),
              )
            }
            onClearAll={() => setActiveStatuses(new Set())}
            onSelectDefault={() =>
              setActiveStatuses(
                new Set(ALL_STATUSES.filter((s) => s !== ProposalStatus.CANCELLED)),
              )
            }
          />
        </div>

        {/* Row 2: Chain toggle pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mr-0.5">
            Chain
          </span>
          {ALL_SOURCES.map((source) => {
            const config = SOURCE_CONFIG[source];
            const isActive = activeSources.has(source);
            const isSourceLoading =
              (source === "ethereum" && isLoadingEthereum) ||
              (source === "snapshot" && isLoadingSnapshot);
            const count = sourceCounts[source];

            return (
              <button
                key={source}
                type="button"
                onClick={() => toggleSource(source)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                  "hover:shadow-sm active:scale-[0.97]",
                  isActive
                    ? config.activeClass
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/20",
                )}
              >
                {isSourceLoading ? (
                  <Spinner className="size-2.5" />
                ) : (
                  <span
                    className={cn(
                      "size-2 rounded-full transition-colors",
                      isActive ? config.dotClass : "bg-muted-foreground/30",
                    )}
                  />
                )}
                {config.label}
                {count > 0 && isActive && (
                  <span className="opacity-60 tabular-nums">{count}</span>
                )}
              </button>
            );
          })}

          {filteredProposals.length !== mergedProposals.length && (
            <span className="text-xs text-muted-foreground ml-auto tabular-nums">
              {filteredProposals.length} of {mergedProposals.length}
            </span>
          )}
        </div>
      </div>

      <ProposalsGrid proposals={filteredProposals} isLoading={isLoading} />
    </div>
  );
}

function StatusFilter({
  allStatuses,
  availableStatuses,
  activeStatuses,
  isFiltered,
  onToggleStatus,
  onSelectAll,
  onClearAll,
  onSelectDefault,
}: {
  allStatuses: ProposalStatus[];
  availableStatuses: Set<ProposalStatus>;
  activeStatuses: Set<ProposalStatus>;
  isFiltered: boolean;
  onToggleStatus: (status: ProposalStatus) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onSelectDefault: () => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-1.5 shrink-0",
            isFiltered && "border-foreground/20",
          )}
        >
          <SlidersHorizontal className="size-3.5" />
          Status
          {isFiltered && (
            <Badge
              variant="secondary"
              className="size-5 p-0 justify-center rounded-full text-[10px] leading-none"
            >
              {activeStatuses.size}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-52 p-1.5">
        <div className="max-h-[60vh] overflow-auto">
          <div className="flex flex-col">
            {allStatuses
              .filter((s) => availableStatuses.has(s))
              .map((status) => {
                const id = `status-${status}`;
                return (
                  <label
                    key={status}
                    htmlFor={id}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent cursor-pointer"
                  >
                    <Checkbox
                      id={id}
                      checked={activeStatuses.has(status)}
                      onCheckedChange={() => onToggleStatus(status)}
                    />
                    <Label
                      htmlFor={id}
                      className="text-sm font-normal leading-none cursor-pointer"
                    >
                      {status}
                    </Label>
                  </label>
                );
              })}
          </div>
        </div>
        <div className="mt-1.5 flex border-t border-border pt-1.5 gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={onSelectDefault}
          >
            Default
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={onSelectAll}
          >
            All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={onClearAll}
          >
            None
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
