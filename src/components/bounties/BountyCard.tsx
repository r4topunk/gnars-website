import Link from 'next/link';
import { formatEther } from 'viem';
import { Trophy, Clock, Users } from 'lucide-react';
import type { PoidhBounty } from '@/types/poidh';
import { CHAIN_NAMES } from '@/lib/poidh/config';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface BountyCardProps {
  bounty: PoidhBounty;
}

export function BountyCard({ bounty }: BountyCardProps) {
  const chainName = CHAIN_NAMES[bounty.chainId as keyof typeof CHAIN_NAMES] || 'Unknown';
  const amountEth = formatEther(BigInt(bounty.amount));
  const createdDate = new Date(bounty.createdAt * 1000);
  const daysAgo = Math.floor((Date.now() - bounty.createdAt * 1000) / (1000 * 60 * 60 * 24));

  const getStatusBadge = () => {
    if (bounty.isCanceled) return <Badge variant="destructive" className="text-xs">Canceled</Badge>;
    if (bounty.isVoting) return <Badge variant="default" className="text-xs">Voting</Badge>;
    if (bounty.inProgress) return <Badge variant="secondary" className="text-xs">In Progress</Badge>;
    return <Badge variant="default" className="bg-green-500 text-xs">Open</Badge>;
  };

  return (
    <Link href={`/community/bounties/${bounty.chainId}/${bounty.id}`}>
      <Card className="h-full hover:border-primary transition-all hover:shadow-lg group cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="text-xs">
                {chainName}
              </Badge>
              {getStatusBadge()}
            </div>
            {bounty.isOpenBounty && (
              <Badge variant="secondary" className="text-xs">
                🌐 Open
              </Badge>
            )}
          </div>
          <h3 className="font-bold text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {bounty.title || bounty.name}
          </h3>
        </CardHeader>

        <CardContent className="pb-3">
          <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
            {bounty.description}
          </p>

          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5 text-primary" />
            <span className="font-bold text-2xl text-foreground">
              {parseFloat(amountEth).toFixed(4)}
            </span>
            <span className="text-sm text-muted-foreground">ETH</span>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}</span>
            </div>
            {bounty.isMultiplayer && (
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>Multiplayer</span>
              </div>
            )}
            {bounty.hasClaims && (
              <Badge variant="secondary" className="text-xs">
                Has claims
              </Badge>
            )}
          </div>
        </CardContent>

        <CardFooter className="pt-0">
          <div className="text-sm text-primary group-hover:underline w-full text-right">
            View Details →
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
