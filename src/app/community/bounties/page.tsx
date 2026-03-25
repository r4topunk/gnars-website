'use client';

import { useState } from 'react';
import { BountyGrid } from '@/components/bounties/BountyGrid';
import { usePoidhBounties } from '@/hooks/usePoidhBounties';

export default function BountiesPage() {
  const [status, setStatus] = useState<'open' | 'closed' | 'all'>('open');
  const [filterGnarly, setFilterGnarly] = useState(false); // Default: show all
  const { data, isLoading, error } = usePoidhBounties({ status, filterGnarly });

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
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer pb-2">
            <input
              type="checkbox"
              checked={filterGnarly}
              onChange={(e) => setFilterGnarly(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span>Only action sports</span>
          </label>
        </div>

        {/* Info Bar */}
        {data && !isLoading && (
          <div className="mb-6 text-sm text-muted-foreground">
            Found {data.total} {status === 'all' ? '' : status} bounties
          </div>
        )}

        {/* Grid */}
        <BountyGrid
          bounties={data?.bounties || []}
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
