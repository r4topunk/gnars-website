"use client";

import React, { createContext, useContext } from "react";
import type { ProposalEligibilityResult } from "@/hooks/useProposalEligibility";

const ProposalEligibilityContext = createContext<ProposalEligibilityResult | null>(null);

export function ProposalEligibilityProvider({
  value,
  children,
}: {
  value: ProposalEligibilityResult;
  children: React.ReactNode;
}) {
  return (
    <ProposalEligibilityContext.Provider value={value}>
      {children}
    </ProposalEligibilityContext.Provider>
  );
}

export function useProposalEligibilityContext(): ProposalEligibilityResult {
  const ctx = useContext(ProposalEligibilityContext);
  if (!ctx) {
    throw new Error("useProposalEligibilityContext must be used within ProposalEligibilityProvider");
  }
  return ctx;
}

