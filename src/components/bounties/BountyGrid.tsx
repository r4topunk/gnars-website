import { BountyCard } from './BountyCard';
import type { PoidhBounty } from '@/types/poidh';

interface BountyGridProps {
  bounties: PoidhBounty[];
  isLoading: boolean;
  error: Error | null;
}

export function BountyGrid({ bounties, isLoading, error }: BountyGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border border-border rounded-lg p-4 animate-pulse bg-muted/20">
            <div className="h-6 bg-muted rounded mb-2" />
            <div className="h-16 bg-muted rounded mb-3" />
            <div className="h-8 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-2">Failed to load bounties</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  if (bounties.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No bounties found
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {bounties.map((bounty) => (
        <BountyCard key={bounty.id} bounty={bounty} />
      ))}
    </div>
  );
}
