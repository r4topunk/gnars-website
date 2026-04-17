'use client';

import { useState, useMemo } from 'react';
import { BountyGrid } from '@/components/bounties/BountyGrid';
import { usePoidhBounties } from '@/hooks/usePoidhBounties';
import { CreateBountyModal } from '@/components/bounties/CreateBountyModal';
import { PlusCircle, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatEther } from 'viem';
import { useEthPrice, formatEthToUsd } from '@/hooks/use-eth-price';
import type { PoidhBounty } from '@/types/poidh';

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'skate', label: 'Skate' },
  { key: 'surf', label: 'Surf' },
  { key: 'parkour', label: 'Parkour' },
  { key: 'weed', label: 'Weed' },
] as const;

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  skate: ['skate', 'skateboard', 'kickflip', 'grind', 'ollie', 'flip', 'trick'],
  surf: ['surf', 'wave', 'barrel', 'tube', 'ocean', 'beach'],
  parkour: ['parkour', 'freerun', 'vault', 'flip', 'jump'],
  weed: ['weed', 'cannabis', 'joint', 'blunt', '420', 'smoke', 'kush'],
};

interface BountiesViewProps {
  initialBounties: PoidhBounty[];
}

export function BountiesView({ initialBounties }: BountiesViewProps) {
  const [status, setStatus] = useState<'open' | 'closed' | 'voting' | 'all'>('open');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGnarly] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('skate');

  const { data, isLoading, error } = usePoidhBounties({
    status,
    filterGnarly,
    // Only use initialData for the default "open" status
    initialData: status === 'open' ? { bounties: initialBounties, total: initialBounties.length } : undefined,
  });

  const { ethPrice } = useEthPrice();

  const filteredBounties = useMemo(() => {
    return (
      data?.bounties.filter((bounty) => {
        const text = `${bounty.title} ${bounty.description}`.toLowerCase();

        if (searchQuery.trim()) {
          const query = searchQuery.trim().toLowerCase();
          if (!text.includes(query)) return false;
        }

        if (categoryFilter === 'all') return true;
        return CATEGORY_KEYWORDS[categoryFilter]?.some((keyword) => text.includes(keyword));
      }) || []
    );
  }, [data?.bounties, searchQuery, categoryFilter]);

  const totalValue = useMemo(() => {
    const totalWei = filteredBounties.reduce((sum, bounty) => {
      return sum + BigInt(bounty.amount ?? 0);
    }, 0n);
    const totalEth = parseFloat(formatEther(totalWei));
    const totalUsd = formatEthToUsd(totalEth, ethPrice);
    return { eth: totalEth.toFixed(4), usd: totalUsd, count: filteredBounties.length };
  }, [filteredBounties, ethPrice]);

  const statusLabel = status !== 'all' ? status : '';

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Challenges</h1>
            <p className="text-muted-foreground mt-1">
              Gnarly challenges from the action sports community.{' '}
              <a
                href="https://poidh.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-4 decoration-muted-foreground/40 hover:decoration-foreground transition-colors"
              >
                Powered by POIDH
              </a>
            </p>
          </div>
          <CreateBountyModal>
            <Button className="shrink-0">
              <PlusCircle className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Create Bounty</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </CreateBountyModal>
        </div>

        {/* Pool stats */}
        {data && !isLoading && (
          <div className="grid grid-cols-3 gap-4 rounded-lg border border-border bg-muted/30 px-5 py-4">
            <div>
              <div className="text-2xl font-bold tabular-nums tracking-tight">
                {totalValue.eth}
                <span className="text-base font-semibold text-muted-foreground ml-1.5">ETH</span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {statusLabel ? `${statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)} pool` : 'Total pool'}
              </div>
            </div>
            {ethPrice > 0 && (
              <div>
                <div className="text-2xl font-bold tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
                  {totalValue.usd}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">USD value</div>
              </div>
            )}
            <div>
              <div className="text-2xl font-bold tabular-nums tracking-tight">
                {totalValue.count}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {statusLabel ? `${statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)} bounties` : 'Bounties'}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bounties..."
              className="pl-9"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Tabs value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <TabsList>
                <TabsTrigger value="open">Open</TabsTrigger>
                <TabsTrigger value="voting">Voting</TabsTrigger>
                <TabsTrigger value="closed">Closed</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="h-5 w-px bg-border hidden sm:block" />
            <Tabs value={categoryFilter} onValueChange={(v) => setCategoryFilter(v)}>
              <TabsList>
                {CATEGORIES.map(({ key, label }) => (
                  <TabsTrigger key={key} value={key}>{label}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Grid */}
        <BountyGrid
          bounties={filteredBounties}
          isLoading={isLoading}
          error={error}
        />
      </div>
    </div>
  );
}
