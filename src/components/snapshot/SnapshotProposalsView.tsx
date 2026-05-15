"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { SnapshotProposal } from "@/types/snapshot";
import { SnapshotProposalCard } from "./SnapshotProposalCard";

interface SnapshotProposalsViewProps {
  proposals: SnapshotProposal[];
}

type ProposalState = "pending" | "active" | "closed";

export function SnapshotProposalsView({ proposals: allProposals }: SnapshotProposalsViewProps) {
  const t = useTranslations("feed.snapshot");
  const ALL_STATES: ProposalState[] = ["active", "closed", "pending"];

  const [activeStates, setActiveStates] = useState<Set<ProposalState>>(
    () => new Set(["active", "closed"] as ProposalState[]),
  );

  const availableStates = useMemo(() => {
    const states = new Set<ProposalState>();
    allProposals.forEach((p) => states.add(p.state));
    return states;
  }, [allProposals]);

  const filteredProposals = useMemo(() => {
    return allProposals.filter((p) => activeStates.has(p.state));
  }, [allProposals, activeStates]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {t("proposalsFound", { count: filteredProposals.length })}
        </p>
        <StateFilter
          allStates={ALL_STATES}
          availableStates={availableStates}
          activeStates={activeStates}
          onToggleState={(s) => {
            setActiveStates((prev) => {
              const next = new Set(prev);
              if (next.has(s)) next.delete(s);
              else next.add(s);
              return next;
            });
          }}
          onSelectAll={() => setActiveStates(new Set(ALL_STATES))}
          onClearAll={() => setActiveStates(new Set())}
          onSelectDefault={() => setActiveStates(new Set(["active", "closed"] as ProposalState[]))}
        />
      </div>
      <div className="grid gap-4 grid-cols-1">
        {filteredProposals.map((proposal) => (
          <SnapshotProposalCard key={proposal.id} proposal={proposal} />
        ))}
      </div>
      {filteredProposals.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">{t("empty")}</div>
      )}
    </div>
  );
}

function StateFilter({
  allStates,
  availableStates,
  activeStates,
  onToggleState,
  onSelectAll,
  onClearAll,
  onSelectDefault,
}: {
  allStates: ProposalState[];
  availableStates: Set<ProposalState>;
  activeStates: Set<ProposalState>;
  onToggleState: (state: ProposalState) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onSelectDefault: () => void;
}) {
  const t = useTranslations("feed.snapshot");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">{t("filterState")}</Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-56 p-2">
        <div className="px-2 pb-2 text-sm font-medium">{t("stateLabel")}</div>
        <div className="max-h-[60vh] overflow-auto pr-1">
          <div className="flex flex-col gap-1">
            {allStates
              .filter((s) => availableStates.has(s))
              .map((state) => {
                const id = `state-${state}`;
                return (
                  <label
                    key={state}
                    htmlFor={id}
                    className="flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent"
                  >
                    <Checkbox
                      id={id}
                      checked={activeStates.has(state)}
                      onCheckedChange={() => onToggleState(state)}
                    />
                    <Label htmlFor={id} className="text-sm font-normal leading-none">
                      {t(`states.${state}`)}
                    </Label>
                  </label>
                );
              })}
          </div>
        </div>
        <div className="mt-2 flex px-2 w-full justify-center gap-2">
          <Button variant="ghost" size="sm" onClick={onSelectDefault}>
            {t("default")}
          </Button>
          <Button variant="ghost" size="sm" onClick={onSelectAll}>
            {t("all")}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClearAll}>
            {t("none")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
