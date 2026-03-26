import Link from 'next/link';
import { formatEther } from 'viem';
import { Clock, Users, Circle } from 'lucide-react';
import type { PoidhBounty } from '@/types/poidh';
import { CHAIN_NAMES } from '@/lib/poidh/config';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface BountyCardProps {
  bounty: PoidhBounty;
}

export function BountyCard({ bounty }: BountyCardProps) {
  const chainName = CHAIN_NAMES[bounty.chainId as keyof typeof CHAIN_NAMES] || 'Unknown';
  const amountEth = formatEther(BigInt(bounty.amount));
  const daysAgo = Math.floor((Date.now() - bounty.createdAt * 1000) / (1000 * 60 * 60 * 24));

  const getStatusInfo = () => {
    if (bounty.isCanceled) return { label: 'Canceled', variant: 'destructive' as const };
    if (bounty.isVoting) return { label: 'Voting', variant: 'default' as const };
    if (bounty.inProgress) return { label: 'In Progress', variant: 'secondary' as const };
    return { label: 'Open', variant: 'default' as const };
  };

  const status = getStatusInfo();

  return (
    <Card className="h-full hover:border-primary transition-all hover:shadow-lg group overflow-hidden">
      <CardContent className="p-6 space-y-4">
        {/* Header: Chain + Status */}
        <div className="flex items-center gap-2 pb-3 border-b border-dashed border-border">
          <Circle className="w-3 h-3 fill-current text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">{chainName}</span>
          <Badge variant={status.variant} className="ml-auto">
            {status.label}
          </Badge>
        </div>

        {/* Title */}
        <div>
          <h3 className="font-bold text-xl leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {bounty.title || bounty.name}
          </h3>
        </div>

        {/* Description */}
        <div className="pb-2">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {bounty.description}
          </p>
          {bounty.isOpenBounty && (
            <div className="flex items-center gap-1 mt-2">
              <span className="text-xs text-muted-foreground">📹 Submission Requirements: Record a video of your attempt.</span>
            </div>
          )}
        </div>

        {/* Reward Section */}
        <div className="pb-3 border-b border-dashed border-border">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Reward</span>
            <span className="text-2xl font-bold text-primary">Ω {parseFloat(amountEth).toFixed(4)}</span>
            <span className="text-sm text-muted-foreground">ETH</span>
          </div>
        </div>

        {/* Metadata Row */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span>⏰</span>
            <span>Time Left</span>
            <Circle className="w-1 h-1 fill-current mx-1" />
            <span>{daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}</span>
          </div>
          {bounty.isMultiplayer && (
            <>
              <Circle className="w-1 h-1 fill-current" />
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>Multiplayer</span>
              </div>
            </>
          )}
          {bounty.hasClaims && (
            <>
              <Circle className="w-1 h-1 fill-current" />
              <span>Current</span>
            </>
          )}
        </div>

        {/* CTA Buttons */}
        <div className="flex gap-2 pt-2">
          <Link href={`/community/bounties/${bounty.chainId}/${bounty.id}`} className="flex-1">
            <Button 
              variant="default" 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            >
              Make Attempt
            </Button>
          </Link>
          <Link href={`/community/bounties/${bounty.chainId}/${bounty.id}`} className="flex-1">
            <Button 
              variant="outline" 
              className="w-full hover:bg-accent"
            >
              View Details →
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
