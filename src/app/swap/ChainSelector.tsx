"use client";

import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Chains the swap experience could support. Only Base is wired up today;
// extending this list updates both the trigger label and the dropdown.
const CHAINS = [{ id: 8453, name: "Base", supported: true }] as const;

const ACTIVE_CHAIN = CHAINS.find((c) => c.supported)!;

export function ChainSelector() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex items-center gap-1.5 rounded-md bg-blue-100 px-2 py-1 text-xs font-semibold tracking-wide text-blue-800 transition-colors hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:bg-blue-900/30 dark:text-blue-200 dark:hover:bg-blue-900/50"
        aria-label="Select chain"
      >
        {ACTIVE_CHAIN.name}
        <ChevronDown className="h-3 w-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[8rem]">
        {CHAINS.map((chain) => (
          <DropdownMenuItem key={chain.id} disabled={!chain.supported} className="gap-2 text-sm">
            <Check
              className={
                chain.id === ACTIVE_CHAIN.id ? "h-3.5 w-3.5 opacity-100" : "h-3.5 w-3.5 opacity-0"
              }
            />
            {chain.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
