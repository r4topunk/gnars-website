'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { formatEther } from 'viem';
import Link from 'next/link';
import type { PoidhBounty } from '@/types/poidh';
import { CHAIN_NAMES, getExplorerUrl } from '@/lib/poidh/config';

export default function BountyDetailPage() {
  const params = useParams();
  const chainId = parseInt(params.chainId as string, 10);
  const id = params.id as string;

  // Fetch all bounties and find the one we need
  // TODO: Create individual bounty API endpoint
  const { data, isLoading, error } = useQuery<{ bounties: PoidhBounty[] }>({
    queryKey: ['poidh-bounty', chainId, id],
    queryFn: async () => {
      const res = await fetch('/api/poidh/bounties?status=all&filterGnarly=false');
      if (!res.ok) throw new Error('Failed to fetch bounty');
      return res.json();
    },
  });

  const bounty = data?.bounties.find(
    (b) => b.chainId === chainId && b.id === id
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-40 bg-gray-200 rounded mb-6"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !bounty) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Bounty Not Found</h1>
          <p className="text-gray-600 mb-6">
            This bounty doesn&apos;t exist or has been removed.
          </p>
          <Link href="/community/bounties" className="text-blue-600 hover:underline">
            ← Back to Bounties
          </Link>
        </div>
      </div>
    );
  }

  const chainName = CHAIN_NAMES[chainId as keyof typeof CHAIN_NAMES] || 'Unknown';
  const amountEth = formatEther(BigInt(bounty.amount));
  const explorerUrl = getExplorerUrl(chainId, 'address', bounty.issuer);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <Link 
          href="/community/bounties"
          className="text-blue-600 hover:underline mb-6 inline-block"
        >
          ← Back to Bounties
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm bg-gray-100 px-3 py-1 rounded">{chainName}</span>
            {bounty.isOpenBounty && (
              <span className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded">
                🌐 Open Bounty
              </span>
            )}
          </div>
          <h1 className="text-4xl font-bold mb-4">{bounty.name}</h1>
          <div className="flex items-baseline gap-3">
            <span className="text-5xl font-bold">{parseFloat(amountEth).toFixed(4)} ETH</span>
            <span className="text-gray-500">Reward</span>
          </div>
        </div>

        {/* Description */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h2 className="font-bold mb-3">Description</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{bounty.description}</p>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-bold mb-2">Issuer</h3>
            <a 
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm break-all"
            >
              {bounty.issuer}
            </a>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-bold mb-2">Created</h3>
            <p className="text-sm text-gray-600">
              {new Date(bounty.createdAt * 1000).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="font-bold mb-2">Submit a Claim</h2>
          <p className="text-sm text-gray-600 mb-4">
            To submit proof for this bounty, you&apos;ll need to connect your wallet and interact 
            with the POIDH contract directly. Full integration coming soon!
          </p>
          <a 
            href={`https://poidh.xyz/bounties/${chainId}/${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-black text-white px-6 py-3 rounded hover:bg-gray-800 transition-colors"
          >
            View on POIDH.xyz →
          </a>
        </div>
      </div>
    </div>
  );
}
