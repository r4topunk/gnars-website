"use client";

import { useCallback } from "react";
import { parseEther } from "viem";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
  useChainId,
} from "wagmi";
import { POIDH_ABI } from "@/lib/poidh/abi";
import { POIDH_CONTRACTS } from "@/lib/poidh/config";

function usePoidhBase(chainId: number) {
  const { isConnected } = useAccount();
  const currentChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const contract = POIDH_CONTRACTS[chainId];

  const ensureChain = useCallback(async () => {
    if (!isConnected) throw new Error("Connect your wallet first");
    if (!contract) throw new Error(`Unsupported chain: ${chainId}`);
    if (currentChainId !== chainId) {
      await switchChainAsync({ chainId });
    }
  }, [isConnected, contract, currentChainId, chainId, switchChainAsync]);

  return { contract, ensureChain, isConnected, currentChainId };
}

// ─── Submit a Claim ──────────────────────────────────────────────────────────

export function usePoidhCreateClaim(bountyChainId: number) {
  const { contract, ensureChain } = usePoidhBase(bountyChainId);
  const { writeContractAsync, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const submit = useCallback(
    async (onChainBountyId: number, name: string, description: string) => {
      await ensureChain();
      await writeContractAsync({
        address: contract!,
        abi: POIDH_ABI,
        functionName: "createClaim",
        args: [BigInt(onChainBountyId), name, description],
        chainId: bountyChainId,
      });
    },
    [ensureChain, writeContractAsync, contract, bountyChainId],
  );

  return { submit, hash, isPending: isPending || isConfirming, isSuccess, error, reset };
}

// ─── Create Open Bounty ───────────────────────────────────────────────────────

export function usePoidhCreateOpenBounty(bountyChainId: number) {
  const { contract, ensureChain } = usePoidhBase(bountyChainId);
  const { writeContractAsync, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const create = useCallback(
    async (name: string, description: string, rewardEth: string) => {
      await ensureChain();
      await writeContractAsync({
        address: contract!,
        abi: POIDH_ABI,
        functionName: "createOpenBounty",
        args: [name, description],
        value: parseEther(rewardEth),
        chainId: bountyChainId,
      });
    },
    [ensureChain, writeContractAsync, contract, bountyChainId],
  );

  return { create, hash, isPending: isPending || isConfirming, isSuccess, error, reset };
}

// ─── Create Solo Bounty ───────────────────────────────────────────────────────

export function usePoidhCreateSoloBounty(bountyChainId: number) {
  const { contract, ensureChain } = usePoidhBase(bountyChainId);
  const { writeContractAsync, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const create = useCallback(
    async (name: string, description: string, claimer: `0x${string}`, rewardEth: string) => {
      await ensureChain();
      await writeContractAsync({
        address: contract!,
        abi: POIDH_ABI,
        functionName: "createSoloBounty",
        args: [name, description, claimer],
        value: parseEther(rewardEth),
        chainId: bountyChainId,
      });
    },
    [ensureChain, writeContractAsync, contract, bountyChainId],
  );

  return { create, hash, isPending: isPending || isConfirming, isSuccess, error, reset };
}

// ─── Join Open Bounty (add funds to multiplayer) ──────────────────────────────

export function usePoidhJoinBounty(bountyChainId: number) {
  const { contract, ensureChain } = usePoidhBase(bountyChainId);
  const { writeContractAsync, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const join = useCallback(
    async (onChainBountyId: number, contributionEth: string) => {
      await ensureChain();
      await writeContractAsync({
        address: contract!,
        abi: POIDH_ABI,
        functionName: "joinOpenBounty",
        args: [BigInt(onChainBountyId)],
        value: parseEther(contributionEth),
        chainId: bountyChainId,
      });
    },
    [ensureChain, writeContractAsync, contract, bountyChainId],
  );

  return { join, hash, isPending: isPending || isConfirming, isSuccess, error, reset };
}

// ─── Cancel Bounty (creator only) ────────────────────────────────────────────

export function usePoidhCancelBounty(bountyChainId: number) {
  const { contract, ensureChain } = usePoidhBase(bountyChainId);
  const { writeContractAsync, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const cancel = useCallback(
    async (onChainBountyId: number, isOpen: boolean) => {
      await ensureChain();
      await writeContractAsync({
        address: contract!,
        abi: POIDH_ABI,
        functionName: isOpen ? "cancelOpenBounty" : "cancelSoloBounty",
        args: [BigInt(onChainBountyId)],
        chainId: bountyChainId,
      });
    },
    [ensureChain, writeContractAsync, contract, bountyChainId],
  );

  return { cancel, hash, isPending: isPending || isConfirming, isSuccess, error, reset };
}

// ─── Withdraw from Open Bounty (participant) ──────────────────────────────────

export function usePoidhWithdrawFromBounty(bountyChainId: number) {
  const { contract, ensureChain } = usePoidhBase(bountyChainId);
  const { writeContractAsync, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const withdraw = useCallback(
    async (onChainBountyId: number) => {
      await ensureChain();
      await writeContractAsync({
        address: contract!,
        abi: POIDH_ABI,
        functionName: "withdrawFromOpenBounty",
        args: [BigInt(onChainBountyId)],
        chainId: bountyChainId,
      });
    },
    [ensureChain, writeContractAsync, contract, bountyChainId],
  );

  return { withdraw, hash, isPending: isPending || isConfirming, isSuccess, error, reset };
}
