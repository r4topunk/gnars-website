import Link from 'next/link';
import { formatEther } from 'viem';
import type { PoidhBounty } from '@/types/poidh';
import { CHAIN_NAMES } from '@/lib/poidh/config';

interface BountyCardProps {
  bounty: PoidhBounty;
}

export function BountyCard({ bounty }: BountyCardProps) {
  const chainName = CHAIN_NAMES[bounty.chainId as keyof typeof CHAIN_NAMES] || 'Unknown';
  const amountEth = formatEther(BigInt(bounty.amount));

  return (
    <Link href={`/community/bounties/${bounty.chainId}/${bounty.id}`}>
      <div className="border border-border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer bg-card">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-lg line-clamp-2 text-foreground">{bounty.title}</h3>
          <span className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">{chainName}</span>
        </div>
        
        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
          {bounty.description}
        </p>
        
        <div className="flex justify-between items-center">
          <span className="font-bold text-xl text-foreground">
            {parseFloat(amountEth).toFixed(4)} ETH
          </span>
          <span className="text-sm text-primary">View Details →</span>
        </div>
        
        {bounty.isOpenBounty && (
          <div className="mt-2 text-xs text-green-600">
            🌐 Open Bounty
          </div>
        )}
      </div>
    </Link>
  );
}
