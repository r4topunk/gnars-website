"use client";

import { useMemo, useState, useEffect, useDeferredValue } from "react";
import { ProposalsGrid } from "@/components/proposals/ProposalsGrid";
import { Proposal } from "@/components/proposals/types";
import { ProposalStatus } from "@/lib/schemas/proposals";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useProposalSearch } from "@/hooks/use-proposal-search";

interface ProposalsViewProps {
  proposals: Proposal[];
}

export function ProposalsView({ proposals: allProposals }: ProposalsViewProps) {
  const ALL_STATUSES = useMemo(() => Object.values(ProposalStatus) as ProposalStatus[], []);
  const [activeStatuses, setActiveStatuses] = useState<Set<ProposalStatus>>(
    () => new Set((Object.values(ProposalStatus) as ProposalStatus[]).filter((s) => s !== ProposalStatus.CANCELLED))
  );
  const availableStatuses = useMemo(() => {
    return new Set(allProposals.map((p) => p.status));
  }, [allProposals]);

  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const {
    init: initSearchWorker,
    ids: searchFilteredIds,
    search: searchProposals,
  } = useProposalSearch(allProposals);

  useEffect(() => {
    searchProposals(deferredSearchQuery);
  }, [deferredSearchQuery, searchProposals]);

  const filteredProposals = useMemo(() => {
    let proposalsToFilter = allProposals;

    if (searchFilteredIds) {
      const idSet = new Set(searchFilteredIds);
      proposalsToFilter = allProposals.filter((p) => idSet.has(p.proposalId));
    }

    return proposalsToFilter.filter((p) => activeStatuses.has(p.status));
  }, [allProposals, activeStatuses, searchFilteredIds]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Proposals</h1>
          <p className="text-muted-foreground">View and participate in Gnars DAO governance proposals</p>
        </div>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Search proposals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={initSearchWorker}
            className="w-full sm:max-w-xs"
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
      <ProposalsGrid proposals={filteredProposals} />
    </div>
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
  const activeCount = activeStatuses.size;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          Filter status{activeCount > 0 ? ` (${activeCount})` : ""}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-64 p-2">
        <div className="px-2 pb-2 text-sm font-medium">Status</div>
        <div className="max-h-[60vh] overflow-auto pr-1">
          <div className="flex flex-col gap-1">
            {allStatuses.filter((s) => availableStatuses.has(s)).map((status) => {
              const id = `status-${status}`;
              return (
                <label key={status} htmlFor={id} className="flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent">
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


