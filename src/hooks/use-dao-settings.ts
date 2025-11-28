"use client";

import { useReadContracts } from "wagmi";
import { governorAbi, treasuryAbi } from "@buildeross/sdk";
import { CHAIN, GNARS_ADDRESSES } from "@/lib/config";

export interface DaoSettings {
  votingDelay: bigint; // blocks before voting starts
  votingPeriod: bigint; // blocks voting lasts
  timelockDelay: bigint; // seconds proposals must wait in queue before execution
  isLoading: boolean;
  isError: boolean;
}

export interface StartTimeCalculation {
  votingDelayBlocks: number;
  votingDelayDays: number;
  votingPeriodBlocks: number;
  votingPeriodDays: number;
  timelockDelaySeconds: number;
  timelockDelayDays: number;
  executionBufferDays: number;
  totalDays: number;
  startDate: Date;
}

/**
 * Hook to fetch DAO governor and treasury settings from the Builder protocol
 * Uses @buildeross/sdk for proper ABI definitions
 */
export function useDaoSettings(): DaoSettings {
  const { data, isLoading, isError } = useReadContracts({
    contracts: [
      {
        address: GNARS_ADDRESSES.governor as `0x${string}`,
        abi: governorAbi,
        functionName: "votingDelay",
        chainId: CHAIN.id,
      },
      {
        address: GNARS_ADDRESSES.governor as `0x${string}`,
        abi: governorAbi,
        functionName: "votingPeriod",
        chainId: CHAIN.id,
      },
      {
        address: GNARS_ADDRESSES.treasury as `0x${string}`,
        abi: treasuryAbi,
        functionName: "delay",
        chainId: CHAIN.id,
      },
    ],
  });

  const votingDelay = data?.[0]?.result ?? 0n;
  const votingPeriod = data?.[1]?.result ?? 0n;
  const timelockDelay = data?.[2]?.result ?? 0n;

  return {
    votingDelay,
    votingPeriod,
    timelockDelay,
    isLoading,
    isError,
  };
}

/**
 * Calculate when a droposal NFT will be available for minting with detailed breakdown
 * 
 * Timeline breakdown:
 * 1. Proposal created (now)
 * 2. Wait votingDelay blocks (voting hasn't started yet)
 * 3. Voting period lasts votingPeriod blocks (voting is active)
 * 4. Proposal passes and gets queued
 * 5. Wait timelockDelay seconds (timelock/freeze period before execution)
 * 6. Proposal can be executed
 * 7. Add 1 day buffer for execution and NFT deployment
 * 
 * @param votingDelay - Blocks before voting starts (inactive period)
 * @param votingPeriod - Blocks voting lasts (active period)
 * @param timelockDelay - Seconds the proposal must wait after queuing (freeze period)
 * @param blockTime - Average block time in seconds (Base actual = 2s)
 * @returns Detailed calculation breakdown
 */
export function calculateDroposalStartDate(
  votingDelay: bigint,
  votingPeriod: bigint,
  timelockDelay: bigint,
  blockTime: number = 1
): StartTimeCalculation {
  // Nouns Builder Governor uses block timestamps, not block numbers
  // The values are stored as "blocks" but represent seconds (1 block = 1 second in the protocol)
  // Real proposals prove: 172800 blocks = exactly 2 days, 432000 blocks = exactly 5 days
  
  // Step 1: Calculate time for voting delay (stored as blocks but represents seconds)
  const votingDelayBlocks = Number(votingDelay);
  const votingDelaySeconds = votingDelayBlocks * blockTime; // blockTime = 1 for timestamp-based
  const votingDelayDays = votingDelaySeconds / 86400;
  
  // Step 2: Calculate time for voting period (stored as blocks but represents seconds)
  const votingPeriodBlocks = Number(votingPeriod);
  const votingPeriodSeconds = votingPeriodBlocks * blockTime;
  const votingPeriodDays = votingPeriodSeconds / 86400;
  
  // Step 3: Timelock delay (in seconds) - the freeze period after queuing
  const timelockDelaySeconds = Number(timelockDelay);
  const timelockDelayDays = timelockDelaySeconds / 86400;
  
  // Step 4: Execution buffer (1 day)
  const executionBufferSeconds = 86400; // 1 day
  const executionBufferDays = 1;
  
  // Total time = voting delay + voting period + timelock delay + execution buffer
  const totalSeconds = votingDelaySeconds + votingPeriodSeconds + timelockDelaySeconds + executionBufferSeconds;
  const totalDays = totalSeconds / 86400;
  
  return {
    votingDelayBlocks,
    votingDelayDays,
    votingPeriodBlocks,
    votingPeriodDays,
    timelockDelaySeconds,
    timelockDelayDays,
    executionBufferDays,
    totalDays,
    startDate: new Date(Date.now() + totalSeconds * 1000)
  };
}
