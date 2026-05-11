"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { formatEther } from "viem";
import { useReadContract } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { POIDH_ABI } from "@/lib/poidh/abi";
import { POIDH_CONTRACTS } from "@/lib/poidh/config";

function useDeadlineCountdown(deadlineSeconds: number): { label: string; expired: boolean } {
  const calc = () => {
    if (!deadlineSeconds) return { label: "", expired: false };
    const diff = deadlineSeconds * 1000 - Date.now();
    if (diff <= 0) return { label: "Expired", expired: true };
    const hours = Math.floor(diff / 3_600_000);
    const minutes = Math.floor((diff % 3_600_000) / 60_000);
    return { label: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`, expired: false };
  };

  const [state, setState] = useState(calc);

  useEffect(() => {
    if (!deadlineSeconds) return;
    const id = setInterval(() => setState(calc()), 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlineSeconds]);

  return state;
}

interface VoteDashboardProps {
  chainId: number;
  onChainBountyId: number;
}

export function VoteDashboard({ chainId, onChainBountyId }: VoteDashboardProps) {
  const contractAddress = POIDH_CONTRACTS[chainId];

  const { data: tracker } = useReadContract({
    address: contractAddress,
    abi: POIDH_ABI,
    functionName: "bountyVotingTracker",
    args: [BigInt(onChainBountyId)],
    chainId,
    query: {
      enabled: !!contractAddress && onChainBountyId > 0,
      refetchInterval: 15_000,
    },
  });

  const deadlineSec = tracker ? Number(tracker[2]) : 0;
  const { label: deadline, expired: isExpired } = useDeadlineCountdown(deadlineSec);

  if (!tracker || deadlineSec === 0) return null;

  const yesWei = tracker[0];
  const noWei = tracker[1];
  const yesEth = parseFloat(formatEther(yesWei));
  const noEth = parseFloat(formatEther(noWei));
  const total = yesEth + noEth;
  const yesPercent = total > 0 ? Math.round((yesEth / total) * 100) : 50;

  return (
    <Card className="border-yellow-500/20 bg-yellow-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-yellow-400">Live Vote</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Yes / No labels */}
        <div className="flex justify-between text-xs font-medium">
          <span className="text-emerald-400">{yesEth.toFixed(4)} ETH Yes</span>
          <span className="text-red-400">{noEth.toFixed(4)} ETH No</span>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${yesPercent}%` }}
          />
        </div>

        {/* Vote weight note */}
        <p className="text-xs text-muted-foreground">
          Weighted by ETH contribution — {total.toFixed(4)} ETH total
        </p>

        {/* Deadline */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t border-border/50">
          <Clock className="w-3 h-3 shrink-0" />
          <span>
            {isExpired ? "Vote period ended — resolve when ready" : `Vote closes in ${deadline}`}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
