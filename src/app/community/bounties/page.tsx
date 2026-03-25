'use client';

import { useState } from 'react';
import { BountyGrid } from '@/components/bounties/BountyGrid';
import { usePoidhBounties } from '@/hooks/usePoidhBounties';

export default function BountiesPage() {
  const [status, setStatus] = useState<'open' | 'closed' | 'all'>('open');
  const [filterGnarly, setFilterGnarly] = useState(false); // Default: show all
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const { data, isLoading, error } = usePoidhBounties({ status, filterGnarly });

  // Client-side category filtering
  const filteredBounties = data?.bounties.filter((bounty) => {
    if (categoryFilter === 'all') return true;
    const text = `${bounty.title} ${bounty.description}`.toLowerCase();
    
    const categories: Record<string, string[]> = {
      skate: ['skate', 'skateboard', 'kickflip', 'grind', 'ollie', 'flip', 'trick'],
      surf: ['surf', 'wave', 'barrel', 'tube', 'ocean', 'beach'],
      parkour: ['parkour', 'freerun', 'vault', 'flip', 'jump'],
      weed: ['weed', 'cannabis', 'joint', 'blunt', '420', 'smoke', 'kush'],
    };
    
    return categories[categoryFilter]?.some((keyword) => text.includes(keyword));
  }) || [];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-foreground">POIDH Bounties</h1>
          <p className="text-muted-foreground">
            Gnarly challenges from the action sports community on Base & Arbitrum
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center justify-between mb-8 border-b border-border">
          <div className="flex gap-4">
            {(['open', 'closed', 'all'] as const).map((tab) => (
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
          
          {/* Action Sports Filter Toggle */}
          <label className="flex items-center gap-2 text-sm cursor-pointer pb-2">
            <input
              type="checkbox"
              checked={filterGnarly}
              onChange={(e) => setFilterGnarly(e.target.checked)}
              className="w-4 h-4 rounded border-2 border-foreground/30 checked:bg-primary checked:border-primary"
            />
            <span className="text-foreground/80 hover:text-foreground">
              🛹 Action sports only
            </span>
          </label>
        </div>

        {/* Category Filter Pills */}
        <div className="flex gap-2 mb-6">
          {(['all', 'skate', 'surf', 'parkour', 'weed'] as const).map((cat) => (
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

        {/* Info Bar */}
        {data && !isLoading && (
          <div className="mb-6 text-sm text-muted-foreground">
            Showing {filteredBounties.length} of {data.total} {status === 'all' ? '' : status} bounties
          </div>
        )}

        {/* Grid */}
        <BountyGrid
          bounties={filteredBounties}
          isLoading={isLoading}
          error={error}
        />

        {/* Footer Info */}
        <div className="mt-12 p-6 bg-muted rounded-lg border border-border">
          <h2 className="font-bold mb-2 text-foreground">What are POIDH Bounties?</h2>
          <p className="text-sm text-muted-foreground mb-4">
            POIDH (Pics Or It Didn&apos;t Happen) is a decentralized bounty platform where 
            anyone can create challenges and reward proof of completion with ETH.
          </p>
          <div className="flex gap-4 text-sm">
            <a 
              href="https://poidh.xyz" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Visit POIDH.xyz →
            </a>
            <a 
              href="https://docs.poidh.xyz" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Read Docs →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
