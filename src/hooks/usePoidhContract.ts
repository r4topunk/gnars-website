"use client";

import { useCallback, useState } from "react";
import { getContract, prepareContractCall, sendTransaction, waitForReceipt } from "thirdweb";
import { arbitrum, base, type Chain } from "thirdweb/chains";
import { useUserAddress } from "@/hooks/use-user-address";
import { useWriteAccount, type WriteAccount } from "@/hooks/use-write-account";
import { POIDH_ABI } from "@/lib/poidh/abi";
import { POIDH_CONTRACTS } from "@/lib/poidh/config";
import { getThirdwebClient } from "@/lib/thirdweb";
import { ensureOnChain } from "@/lib/thirdweb-tx";
import { parseEther } from "viem";

function resolveThirdwebChain(chainId: number): Chain | undefined {
  if (chainId === base.id) return base;
  if (chainId === arbitrum.id) return arbitrum;
  return undefined;
}

function usePoidhContext(chainId: number) {
  const { isConnected } = useUserAddress();
  const writer = useWriteAccount();
  const contractAddress = POIDH_CONTRACTS[chainId];
  const twChain = resolveThirdwebChain(chainId);

  return { isConnected, writer, contractAddress, twChain };
}

interface PoidhWriteState {
  hash: `0x${string}` | undefined;
  isPending: boolean;
  isSuccess: boolean;
  error: Error | null;
  setHash: (value: `0x${string}` | undefined) => void;
  setIsPending: (value: boolean) => void;
  setIsSuccess: (value: boolean) => void;
  setError: (value: Error | null) => void;
}

function usePoidhWriteState(): PoidhWriteState {
  const [hash, setHash] = useState<`0x${string}` | undefined>(undefined);
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  return {
    hash,
    isPending,
    isSuccess,
    error,
    setHash,
    setIsPending,
    setIsSuccess,
    setError,
  };
}

function buildPoidhReturn(state: PoidhWriteState) {
  return {
    hash: state.hash,
    isPending: state.isPending,
    isSuccess: state.isSuccess,
    error: state.error,
    reset: () => {
      state.setHash(undefined);
      state.setIsPending(false);
      state.setIsSuccess(false);
      state.setError(null);
    },
  };
}

async function assertPoidhReady(ctx: ReturnType<typeof usePoidhContext>, chainId: number) {
  if (!ctx.isConnected) throw new Error("Connect your wallet first");
  if (!ctx.contractAddress) throw new Error(`Unsupported chain: ${chainId}`);
  if (!ctx.writer) throw new Error("Connect your wallet first");
  if (!ctx.twChain) throw new Error(`Unsupported chain: ${chainId}`);
  const client = getThirdwebClient();
  if (!client) throw new Error("Thirdweb client not configured");
  await ensureOnChain(ctx.writer.wallet, ctx.twChain);
  return {
    client,
    contractAddress: ctx.contractAddress,
    twChain: ctx.twChain,
    writer: ctx.writer,
  };
}

async function sendAndConfirm(
  state: PoidhWriteState,
  client: ReturnType<typeof getThirdwebClient>,
  twChain: Chain,
  writer: WriteAccount,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
) {
  if (!client) throw new Error("Thirdweb client not configured");
  state.setError(null);
  state.setIsSuccess(false);
  state.setHash(undefined);
  state.setIsPending(true);
  try {
    const result = await sendTransaction({
      account: writer.account,
      transaction: tx,
    });
    const txHash = result.transactionHash as `0x${string}`;
    state.setHash(txHash);
    await waitForReceipt({
      client,
      chain: twChain,
      transactionHash: txHash,
    });
    state.setIsSuccess(true);
    return txHash;
  } catch (err) {
    state.setError(err instanceof Error ? err : new Error(String(err)));
    throw err;
  } finally {
    state.setIsPending(false);
  }
}

// ─── Submit a Claim ──────────────────────────────────────────────────────────

export function usePoidhCreateClaim(bountyChainId: number) {
  const ctx = usePoidhContext(bountyChainId);
  const state = usePoidhWriteState();

  const submit = useCallback(
    async (
      onChainBountyId: number,
      name: string,
      description: string,
      imageUri: string = "",
    ) => {
      const { client, contractAddress, twChain, writer } = await assertPoidhReady(ctx, bountyChainId);
      const contract = getContract({ client, chain: twChain, address: contractAddress, abi: POIDH_ABI });
      const tx = prepareContractCall({
        contract,
        method: "createClaim",
        params: [BigInt(onChainBountyId), name, description, imageUri],
      });
      await sendAndConfirm(state, client, twChain, writer, tx);
    },
    [ctx, bountyChainId, state],
  );

  return { submit, ...buildPoidhReturn(state) };
}

// ─── Create Open Bounty ───────────────────────────────────────────────────────

export function usePoidhCreateOpenBounty(bountyChainId: number) {
  const ctx = usePoidhContext(bountyChainId);
  const state = usePoidhWriteState();

  const create = useCallback(
    async (name: string, description: string, rewardEth: string) => {
      const { client, contractAddress, twChain, writer } = await assertPoidhReady(ctx, bountyChainId);
      const contract = getContract({ client, chain: twChain, address: contractAddress, abi: POIDH_ABI });
      const tx = prepareContractCall({
        contract,
        method: "createOpenBounty",
        params: [name, description],
        value: parseEther(rewardEth),
      });
      await sendAndConfirm(state, client, twChain, writer, tx);
    },
    [ctx, bountyChainId, state],
  );

  return { create, ...buildPoidhReturn(state) };
}

// ─── Create Solo Bounty ───────────────────────────────────────────────────────

export function usePoidhCreateSoloBounty(bountyChainId: number) {
  const ctx = usePoidhContext(bountyChainId);
  const state = usePoidhWriteState();

  const create = useCallback(
    async (name: string, description: string, rewardEth: string) => {
      const { client, contractAddress, twChain, writer } = await assertPoidhReady(ctx, bountyChainId);
      const contract = getContract({ client, chain: twChain, address: contractAddress, abi: POIDH_ABI });
      const tx = prepareContractCall({
        contract,
        method: "createSoloBounty",
        params: [name, description],
        value: parseEther(rewardEth),
      });
      await sendAndConfirm(state, client, twChain, writer, tx);
    },
    [ctx, bountyChainId, state],
  );

  return { create, ...buildPoidhReturn(state) };
}

// ─── Join Open Bounty (add funds to multiplayer) ──────────────────────────────

export function usePoidhJoinBounty(bountyChainId: number) {
  const ctx = usePoidhContext(bountyChainId);
  const state = usePoidhWriteState();

  const join = useCallback(
    async (onChainBountyId: number, contributionEth: string) => {
      const { client, contractAddress, twChain, writer } = await assertPoidhReady(ctx, bountyChainId);
      const contract = getContract({ client, chain: twChain, address: contractAddress, abi: POIDH_ABI });
      const tx = prepareContractCall({
        contract,
        method: "joinOpenBounty",
        params: [BigInt(onChainBountyId)],
        value: parseEther(contributionEth),
      });
      await sendAndConfirm(state, client, twChain, writer, tx);
    },
    [ctx, bountyChainId, state],
  );

  return { join, ...buildPoidhReturn(state) };
}

// ─── Cancel Bounty (creator only) ────────────────────────────────────────────

export function usePoidhCancelBounty(bountyChainId: number) {
  const ctx = usePoidhContext(bountyChainId);
  const state = usePoidhWriteState();

  const cancel = useCallback(
    async (onChainBountyId: number, isOpen: boolean) => {
      const { client, contractAddress, twChain, writer } = await assertPoidhReady(ctx, bountyChainId);
      const contract = getContract({ client, chain: twChain, address: contractAddress, abi: POIDH_ABI });
      const tx = isOpen
        ? prepareContractCall({
            contract,
            method: "cancelOpenBounty",
            params: [BigInt(onChainBountyId)],
          })
        : prepareContractCall({
            contract,
            method: "cancelSoloBounty",
            params: [BigInt(onChainBountyId)],
          });
      await sendAndConfirm(state, client, twChain, writer, tx);
    },
    [ctx, bountyChainId, state],
  );

  return { cancel, ...buildPoidhReturn(state) };
}

// ─── Withdraw from Open Bounty (participant) ──────────────────────────────────

export function usePoidhWithdrawFromBounty(bountyChainId: number) {
  const ctx = usePoidhContext(bountyChainId);
  const state = usePoidhWriteState();

  const withdraw = useCallback(
    async (onChainBountyId: number) => {
      const { client, contractAddress, twChain, writer } = await assertPoidhReady(ctx, bountyChainId);
      const contract = getContract({ client, chain: twChain, address: contractAddress, abi: POIDH_ABI });
      const tx = prepareContractCall({
        contract,
        method: "withdrawFromOpenBounty",
        params: [BigInt(onChainBountyId)],
      });
      await sendAndConfirm(state, client, twChain, writer, tx);
    },
    [ctx, bountyChainId, state],
  );

  return { withdraw, ...buildPoidhReturn(state) };
}

// ─── Submit Claim for Vote ────────────────────────────────────────────────────

export function usePoidhSubmitClaimForVote(bountyChainId: number) {
  const ctx = usePoidhContext(bountyChainId);
  const state = usePoidhWriteState();

  const submit = useCallback(
    async (onChainBountyId: number, claimId: number) => {
      const { client, contractAddress, twChain, writer } = await assertPoidhReady(ctx, bountyChainId);
      const contract = getContract({ client, chain: twChain, address: contractAddress, abi: POIDH_ABI });
      const tx = prepareContractCall({
        contract,
        method: "submitClaimForVote",
        params: [BigInt(onChainBountyId), BigInt(claimId)],
      });
      await sendAndConfirm(state, client, twChain, writer, tx);
    },
    [ctx, bountyChainId, state],
  );

  return { submit, ...buildPoidhReturn(state) };
}

// ─── Vote on Claim ────────────────────────────────────────────────────────────

export function usePoidhVoteClaim(bountyChainId: number) {
  const ctx = usePoidhContext(bountyChainId);
  const state = usePoidhWriteState();

  const vote = useCallback(
    async (onChainBountyId: number, claimId: number, accept: boolean) => {
      const { client, contractAddress, twChain, writer } = await assertPoidhReady(ctx, bountyChainId);
      const contract = getContract({ client, chain: twChain, address: contractAddress, abi: POIDH_ABI });
      const tx = prepareContractCall({
        contract,
        method: "voteClaim",
        params: [BigInt(onChainBountyId), BigInt(claimId), accept],
      });
      await sendAndConfirm(state, client, twChain, writer, tx);
    },
    [ctx, bountyChainId, state],
  );

  return { vote, ...buildPoidhReturn(state) };
}

// ─── Resolve Vote ─────────────────────────────────────────────────────────────

export function usePoidhResolveVote(bountyChainId: number) {
  const ctx = usePoidhContext(bountyChainId);
  const state = usePoidhWriteState();

  const resolve = useCallback(
    async (onChainBountyId: number, claimId: number) => {
      const { client, contractAddress, twChain, writer } = await assertPoidhReady(ctx, bountyChainId);
      const contract = getContract({ client, chain: twChain, address: contractAddress, abi: POIDH_ABI });
      const tx = prepareContractCall({
        contract,
        method: "resolveVote",
        params: [BigInt(onChainBountyId), BigInt(claimId)],
      });
      await sendAndConfirm(state, client, twChain, writer, tx);
    },
    [ctx, bountyChainId, state],
  );

  return { resolve, ...buildPoidhReturn(state) };
}

// ─── Accept Claim (creator only) ──────────────────────────────────────────────

export function usePoidhAcceptClaim(bountyChainId: number) {
  const ctx = usePoidhContext(bountyChainId);
  const state = usePoidhWriteState();

  const accept = useCallback(
    async (onChainBountyId: number, claimId: number) => {
      const { client, contractAddress, twChain, writer } = await assertPoidhReady(ctx, bountyChainId);
      const contract = getContract({ client, chain: twChain, address: contractAddress, abi: POIDH_ABI });
      const tx = prepareContractCall({
        contract,
        method: "acceptClaim",
        params: [BigInt(onChainBountyId), BigInt(claimId)],
      });
      await sendAndConfirm(state, client, twChain, writer, tx);
    },
    [ctx, bountyChainId, state],
  );

  return { accept, ...buildPoidhReturn(state) };
}
