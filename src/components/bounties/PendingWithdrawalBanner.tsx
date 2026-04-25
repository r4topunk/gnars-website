'use client';

import { useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { Wallet, Loader2, CheckCircle2, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { POIDH_ABI } from '@/lib/poidh/abi';
import { POIDH_CONTRACTS, CHAIN_NAMES, getTxUrl, SUPPORTED_CHAINS } from '@/lib/poidh/config';
import { usePoidhWithdraw } from '@/hooks/usePoidhContract';
import { useUserAddress } from '@/hooks/use-user-address';

interface ChainBannerProps {
  chainId: number;
  userAddress: `0x${string}`;
}

function ChainWithdrawalBanner({ chainId, userAddress }: ChainBannerProps) {
  const contractAddress = POIDH_CONTRACTS[chainId];
  const chainName = CHAIN_NAMES[chainId as keyof typeof CHAIN_NAMES];
  const { withdraw, isPending, isSuccess, hash, error } = usePoidhWithdraw(chainId);

  const { data: pending, refetch } = useReadContract({
    address: contractAddress,
    abi: POIDH_ABI,
    functionName: 'pendingWithdrawals',
    args: [userAddress],
    chainId,
    query: { enabled: !!contractAddress, refetchInterval: 30_000 },
  });

  if (isSuccess) void refetch();

  if (!pending || pending === 0n) return null;

  const ethAmount = parseFloat(formatEther(pending)).toFixed(6);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-md border border-amber-500/30 bg-amber-500/10 text-sm">
      <Wallet className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
      <div className="flex-1 min-w-0">
        <span className="font-medium text-amber-300">
          {ethAmount} ETH claimable on {chainName}
        </span>
        <p className="text-xs text-muted-foreground mt-0.5">
          From bounty winnings or a cancelled open bounty.
        </p>
      </div>

      {isSuccess ? (
        <div className="flex items-center gap-1.5 text-emerald-400 text-xs shrink-0">
          <CheckCircle2 className="w-4 h-4" />
          <span>Withdrawn!</span>
          {hash && (
            <a
              href={getTxUrl(chainId, hash)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-0.5 hover:underline ml-1"
            >
              Tx <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 whitespace-nowrap"
            disabled={isPending}
            onClick={() => withdraw()}
          >
            {isPending ? (
              <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Withdrawing…</>
            ) : (
              'Withdraw'
            )}
          </Button>
          {error && (
            <div className="flex items-start gap-1 text-destructive text-xs max-w-[12rem]">
              <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
              <span className="break-words">{error.message.split('\n')[0]}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PendingWithdrawalBanner() {
  const { address, isConnected } = useUserAddress();

  if (!isConnected || !address) return null;

  return (
    <div className="space-y-2 mb-4">
      {Object.values(SUPPORTED_CHAINS).map((chainId) => (
        <ChainWithdrawalBanner
          key={chainId}
          chainId={chainId}
          userAddress={address as `0x${string}`}
        />
      ))}
    </div>
  );
}
