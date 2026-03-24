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
      <div className="border border-gray-200 rounded-lg p-4 hover:border-black transition-colors cursor-pointer">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-lg line-clamp-2">{bounty.name}</h3>
          <span className="text-xs bg-gray-100 px-2 py-1 rounded">{chainName}</span>
        </div>
        
        <p className="text-sm text-gray-600 line-clamp-3 mb-3">
          {bounty.description}
        </p>
        
        <div className="flex justify-between items-center">
          <span className="font-bold text-xl">
            {parseFloat(amountEth).toFixed(4)} ETH
          </span>
          <span className="text-sm text-blue-600">View Details →</span>
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
