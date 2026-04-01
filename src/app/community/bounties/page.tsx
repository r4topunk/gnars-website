'use client';

import { useState, useMemo } from 'react';
import { BountyGrid } from '@/components/bounties/BountyGrid';
import { usePoidhBounties } from '@/hooks/usePoidhBounties';
import { CreateBountyModal } from '@/components/bounties/CreateBountyModal';
import { PlusCircle, Trophy, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatEther } from 'viem';
import { useEthPrice, formatEthToUsd } from '@/hooks/use-eth-price';

export default function BountiesPage() {
  const [status, setStatus] = useState<'open' | 'closed' | 'voting' | 'all'>('open');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGnarly, setFilterGnarly] = useState(false); // Default: show all
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const { data, isLoading, error } = usePoidhBounties({ status, filterGnarly });
  const { ethPrice } = useEthPrice();

  // Client-side category filtering
  const filteredBounties = data?.bounties.filter((bounty) => {
    const text = `${bounty.title} ${bounty.description}`.toLowerCase();

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      if (!text.includes(query)) return false;
    }

    if (categoryFilter === 'all') return true;
    
    const categories: Record<string, string[]> = {
      skate: ['skate', 'skateboard', 'kickflip', 'grind', 'ollie', 'flip', 'trick'],
      surf: ['surf', 'wave', 'barrel', 'tube', 'ocean', 'beach'],
      parkour: ['parkour', 'freerun', 'vault', 'flip', 'jump'],
      weed: ['weed', 'cannabis', 'joint', 'blunt', '420', 'smoke', 'kush'],
    };
    
    return categories[categoryFilter]?.some((keyword) => text.includes(keyword));
  }) || [];

  // Calculate total bounty value
  const totalValue = useMemo(() => {
    const totalWei = filteredBounties.reduce((sum, bounty) => {
      return sum + BigInt(bounty.amount);
    }, 0n);
    const totalEth = parseFloat(formatEther(totalWei));
    const totalUsd = formatEthToUsd(totalEth, ethPrice);
    return { eth: totalEth.toFixed(4), usd: totalUsd };
  }, [filteredBounties, ethPrice]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">Challenges</h1>
              <p className="text-muted-foreground">
                Gnarly challenges from the action sports community
              </p>
            </div>
          </div>
          <CreateBountyModal>
            <Button className="shrink-0 hidden sm:flex">
              <PlusCircle className="w-4 h-4 mr-2" />
              Create Bounty
            </Button>
          </CreateBountyModal>
        </div>
        {/* Mobile create button */}
        <div className="sm:hidden mb-2">
          <CreateBountyModal>
            <Button className="w-full">
              <PlusCircle className="w-4 h-4 mr-2" />
              Create Bounty
            </Button>
          </CreateBountyModal>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search bounties..."
          className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center mb-8 border-b border-border">
        <div className="flex gap-4">
          {(['open', 'voting', 'closed', 'all'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatus(tab)}
              className={`pb-2 px-4 font-medium transition-colors ${
                status === tab
                  ? 'border-b-2 border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex gap-2 mb-6">
        {(['skate', 'surf', 'parkour', 'weed', 'all'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              categoryFilter === cat
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Total Value Banner */}
      {data && !isLoading && (
        <div className="mb-6 flex flex-col items-center justify-center gap-1 py-5 bg-muted/50 rounded-lg border border-border">
          <div className="flex items-center gap-2 text-muted-foreground text-sm uppercase tracking-widest font-medium">
            <Trophy className="w-4 h-4" />
            Total {status !== 'all' ? status : ''} bounty pool
          </div>
          <div className="flex items-baseline gap-3 animate-pulse">
            <span className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">
              {totalValue.eth}
            </span>
            <span className="text-xl font-semibold text-muted-foreground">ETH</span>
          </div>
          {ethPrice > 0 && (
            <span className="text-lg font-semibold text-emerald-500 dark:text-emerald-400">
              {totalValue.usd}
            </span>
          )}
        </div>
      )}

      {/* Grid */}
      <BountyGrid
        bounties={filteredBounties}
        isLoading={isLoading}
        error={error}
      />

      {/* Footer Info */}
      <div className="mt-12 grid md:grid-cols-2 gap-6">
        <div className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20">
          <h2 className="font-bold mb-2 text-foreground flex items-center gap-2">
            <span className="text-xl">📸</span>
            What is POIDH?
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            POIDH (Pics Or It Didn&apos;t Happen) is a decentralized bounty platform where 
            anyone can create challenges and reward proof of completion with ETH on Base and Arbitrum.
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <a 
              href="https://poidh.xyz" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              Visit POIDH.xyz →
            </a>
            <a 
              href="https://docs.poidh.xyz" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              Documentation →
            </a>
          </div>
        </div>

        <div className="p-6 bg-muted/50 rounded-lg border border-border">
          <h2 className="font-bold mb-2 text-foreground flex items-center gap-2">
            <span className="text-xl">🛹</span>
            Action Sports Filter
          </h2>
          <p className="text-sm text-muted-foreground">
            Use the category filters to find bounties related to skateboarding, surfing,
            parkour, and other action sports.
          </p>
        </div>
      </div>
    </div>
  );
}
