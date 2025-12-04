"use client";

import { useCallback, useEffect, useState } from "react";
import { Address, isAddress } from "viem";
import { resolveENS, resolveENSBatch, type ENSData } from "@/lib/ens";

export interface UseENSResult {
  data: ENSData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface UseENSBatchResult {
  data: Map<Address, ENSData>;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for resolving ENS data for a single address
 */
export function useENS(address?: string | Address): UseENSResult {
  const [data, setData] = useState<ENSData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchENS = useCallback(async () => {
    if (!address || !isAddress(address)) {
      setData(null);
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const ensData = await resolveENS(address);
      setData(ensData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve ENS");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchENS();
  }, [fetchENS]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchENS,
  };
}

/**
 * Hook for resolving ENS data for multiple addresses
 */
export function useENSBatch(addresses: (string | Address)[]): UseENSBatchResult {
  const [data, setData] = useState<Map<Address, ENSData>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchENSBatch = useCallback(async () => {
    if (!addresses.length) {
      setData(new Map());
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const ensDataMap = await resolveENSBatch(addresses);
      setData(ensDataMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve ENS batch");
      setData(new Map());
    } finally {
      setIsLoading(false);
    }
  }, [addresses]);

  useEffect(() => {
    fetchENSBatch();
  }, [fetchENSBatch]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchENSBatch,
  };
}

/**
 * Hook for getting ENS data for a single address with optimistic updates
 */
export function useENSOptimistic(address?: string | Address): UseENSResult {
  const [data, setData] = useState<ENSData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchENS = useCallback(async () => {
    if (!address || !isAddress(address)) {
      setData(null);
      setError(null);
      return;
    }

    // Set optimistic data immediately
    const optimisticData: ENSData = {
      name: null,
      avatar: null,
      displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
      address: address.toLowerCase() as Address,
    };

    setData(optimisticData);
    setIsLoading(true);
    setError(null);

    try {
      const ensData = await resolveENS(address);
      setData(ensData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve ENS");
      // Keep optimistic data on error
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchENS();
  }, [fetchENS]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchENS,
  };
}

/**
 * Simplified hook for getting ENS name, avatar, and display name
 */
export function useEnsNameAndAvatar(address?: string | Address) {
  const { data } = useENSOptimistic(address);
  
  return {
    ensName: data?.name || null,
    ensAvatar: data?.avatar || null,
    displayName: data?.displayName || null,
  };
}
