'use client';

import { BountyCard } from './BountyCard';
import type { PoidhBounty } from '@/types/poidh';

interface BountyGridProps {
  bounties: PoidhBounty[];
  isLoading?: boolean;
  error?: Error | null;
}

export function BountyGrid({ bounties, isLoading, error }: BountyGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-2"></div>
            <div className="h-20 bg-gray-200 rounded mb-3"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-2">Failed to load bounties</p>
        <p className="text-sm text-gray-500">{error.message}</p>
      </div>
    );
  }

  if (bounties.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No gnarly bounties found yet.</p>
        <p className="text-sm text-gray-400 mt-2">
          Check back soon for new challenges!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {bounties.map((bounty) => (
        <BountyCard key={`${bounty.chainId}-${bounty.id}`} bounty={bounty} />
      ))}
    </div>
  );
}
