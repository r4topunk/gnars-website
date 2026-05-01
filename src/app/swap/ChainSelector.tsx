"use client";

import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SWAP_CHAINS } from "./chains";
import { useSwapChain } from "./SwapChainContext";

export function ChainSelector() {
  const { chain, setChainId } = useSwapChain();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex items-center gap-1.5 rounded-md bg-blue-100 px-2 py-1 text-xs font-semibold tracking-wide text-blue-800 transition-colors hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:bg-blue-900/30 dark:text-blue-200 dark:hover:bg-blue-900/50"
        aria-label="Select chain"
      >
        {chain.shortName}
        <ChevronDown className="h-3 w-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[10rem]">
        {SWAP_CHAINS.map((c) => (
          <DropdownMenuItem key={c.id} onSelect={() => setChainId(c.id)} className="gap-2 text-sm">
            <Check
              className={c.id === chain.id ? "h-3.5 w-3.5 opacity-100" : "h-3.5 w-3.5 opacity-0"}
            />
            {c.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
