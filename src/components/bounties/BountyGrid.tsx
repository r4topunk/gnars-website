import { BountyCard } from './BountyCard';
import type { PoidhBounty } from '@/types/poidh';

interface BountyGridProps {
  bounties: PoidhBounty[];
  isLoading: boolean;
  error: Error | null;
}

function SkeletonCard() {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-5 gap-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 bg-muted rounded-full" />
        <div className="h-5 w-20 bg-muted rounded-md" />
      </div>
      <div className="h-5 w-3/4 bg-muted rounded-md" />
      <div className="space-y-2">
        <div className="h-3 bg-muted rounded-full" />
        <div className="h-3 w-4/5 bg-muted rounded-full" />
      </div>
      <div className="h-14 bg-muted/60 rounded-lg" />
      <div className="h-3 w-1/3 bg-muted rounded-full" />
      <div className="flex gap-2 mt-auto">
        <div className="h-9 flex-1 bg-muted rounded-md" />
        <div className="h-9 flex-1 bg-muted rounded-md" />
      </div>
    </div>
  );
}

export function BountyGrid({ bounties, isLoading, error }: BountyGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-destructive font-medium mb-1">Failed to load bounties</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  if (bounties.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        No bounties found matching your filters.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {bounties.map((bounty) => (
        <BountyCard key={bounty.id} bounty={bounty} />
      ))}
    </div>
  );
}
