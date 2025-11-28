import { z } from "zod";

export const resolveEnsSchema = z.object({
  address: z.string().describe("Ethereum address to resolve ENS name for"),
});

export const resolveEnsBatchSchema = z.object({
  addresses: z.array(z.string()).describe("Array of Ethereum addresses to resolve ENS names for"),
});

export type ResolveEnsInput = z.infer<typeof resolveEnsSchema>;
export type ResolveEnsBatchInput = z.infer<typeof resolveEnsBatchSchema>;

export interface ENSData {
  name: string | null;
  avatar: string | null;
  displayName: string;
  address: string;
}

// In-memory cache with 1-hour TTL
const CACHE_TTL_MS = 60 * 60 * 1000;
const ensCache = new Map<string, { data: ENSData; timestamp: number }>();

function now(): number {
  return Date.now();
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function normalizeAddress(address: string): string | null {
  const candidate = (address || "").toLowerCase();
  return isValidAddress(candidate) ? candidate : null;
}

async function fetchENSFromUpstream(address: string): Promise<{ name: string | null; avatar: string | null }> {
  // Primary provider: ensideas
  try {
    const res = await fetch(`https://api.ensideas.com/ens/resolve/${address}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "gnars-mcp/ens",
      },
    });
    if (res.ok) {
      const data = (await res.json()) as {
        displayName?: string | null;
        name?: string | null;
        avatar?: string | null;
      };
      return {
        name: data.displayName || data.name || null,
        avatar: data.avatar || null,
      };
    }
  } catch {
    // ignore primary failure, try fallback
  }

  // Fallback provider
  try {
    const res = await fetch(`https://ens.resolver.eth.link/resolve/${address}`, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = (await res.json()) as { name?: string | null; avatar?: string | null };
      return {
        name: data.name || null,
        avatar: data.avatar || null,
      };
    }
  } catch {
    // ignore fallback failure
  }

  return { name: null, avatar: null };
}

async function resolveEnsForAddress(address: string): Promise<ENSData> {
  const normalized = normalizeAddress(address);
  if (!normalized) {
    return {
      name: null,
      avatar: null,
      displayName: address,
      address: address,
    };
  }

  // Check cache
  const cached = ensCache.get(normalized);
  if (cached && now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // Fetch from upstream
  const result = await fetchENSFromUpstream(normalized);

  const ensData: ENSData = {
    name: result.name,
    avatar: result.avatar,
    displayName: result.name || shortenAddress(normalized),
    address: normalized,
  };

  // Cache the result
  ensCache.set(normalized, { data: ensData, timestamp: now() });

  return ensData;
}

export async function resolveEns(input: ResolveEnsInput): Promise<ENSData> {
  return resolveEnsForAddress(input.address);
}

export async function resolveEnsBatch(input: ResolveEnsBatchInput): Promise<{
  results: Record<string, ENSData>;
  resolved: number;
  total: number;
}> {
  const results: Record<string, ENSData> = {};
  let resolved = 0;

  await Promise.all(
    input.addresses.map(async (address) => {
      const data = await resolveEnsForAddress(address);
      results[address.toLowerCase()] = data;
      if (data.name) {
        resolved++;
      }
    })
  );

  return {
    results,
    resolved,
    total: input.addresses.length,
  };
}
