import { Address, isAddress } from "viem";

export interface ENSData {
  name: string | null;
  avatar: string | null;
  displayName: string;
  address: Address;
}

export interface ENSResolveResult {
  name: string | null;
  avatar: string | null;
}

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour for client-side cache
const localEnsCache = new Map<string, { data: ENSResolveResult; timestamp: number }>();
const localNameToAddressCache = new Map<string, { address: Address | null; timestamp: number }>();

// Request deduplication - prevents multiple simultaneous requests for the same address
const pendingRequests = new Map<string, Promise<ENSData>>();
const pendingNameRequests = new Map<string, Promise<Address | null>>();

function getApiBase(): string {
  if (typeof window !== "undefined") return "";
  const env = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || "";
  if (!env) return "http://localhost:3000";
  return env.startsWith("http") ? env : `https://${env}`;
}

function shorten(address: Address): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

async function fetchENSInternal(normalized: Address): Promise<ENSData> {
  const baseUrl = getApiBase();
  const res = await fetch(`${baseUrl}/api/ens?address=${normalized}`);
  if (!res.ok) {
    return {
      name: null,
      avatar: null,
      displayName: shorten(normalized),
      address: normalized,
    };
  }
  const body = (await res.json()) as { ens?: ENSData };
  const ens = body?.ens;
  const data: ENSResolveResult = {
    name: ens?.name ?? null,
    avatar: ens?.avatar ?? null,
  };
  localEnsCache.set(normalized, { data, timestamp: Date.now() });
  return {
    name: data.name,
    avatar: data.avatar,
    displayName: data.name || shorten(normalized),
    address: normalized,
  };
}

export async function resolveENS(address: string | Address): Promise<ENSData> {
  if (!address || !isAddress(address)) {
    throw new Error("Invalid Ethereum address");
  }

  const normalized = address.toLowerCase() as Address;

  // Check cache first
  const cached = localEnsCache.get(normalized);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return {
      name: cached.data.name,
      avatar: cached.data.avatar,
      displayName: cached.data.name || shorten(normalized),
      address: normalized,
    };
  }

  // Check if there's already a pending request for this address
  const pending = pendingRequests.get(normalized);
  if (pending) {
    return pending;
  }

  // Create new request and store it for deduplication
  const request = fetchENSInternal(normalized).finally(() => {
    pendingRequests.delete(normalized);
  });
  pendingRequests.set(normalized, request);
  return request;
}

async function fetchNameInternal(trimmed: string): Promise<Address | null> {
  const baseUrl = getApiBase();
  const res = await fetch(`${baseUrl}/api/ens?name=${encodeURIComponent(trimmed)}`);
  if (!res.ok) {
    localNameToAddressCache.set(trimmed, { address: null, timestamp: Date.now() });
    return null;
  }
  const body = (await res.json()) as { address?: string | null };
  const value = typeof body?.address === "string" ? (body.address.toLowerCase() as Address) : null;
  const normalized = value && isAddress(value) ? (value as Address) : null;
  localNameToAddressCache.set(trimmed, { address: normalized, timestamp: Date.now() });
  return normalized;
}

export async function resolveAddressFromENS(name: string): Promise<Address | null> {
  const trimmed = (name || "").trim().toLowerCase();
  if (!trimmed || !trimmed.includes(".")) return null;

  // Check cache first
  const cached = localNameToAddressCache.get(trimmed);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.address;
  }

  // Check if there's already a pending request for this name
  const pending = pendingNameRequests.get(trimmed);
  if (pending) {
    return pending;
  }

  // Create new request and store it for deduplication
  const request = fetchNameInternal(trimmed).finally(() => {
    pendingNameRequests.delete(trimmed);
  });
  pendingNameRequests.set(trimmed, request);
  return request;
}

export async function resolveENSBatch(
  addresses: (string | Address)[],
): Promise<Map<Address, ENSData>> {
  const valid = addresses
    .filter((a): a is Address => Boolean(a) && isAddress(a))
    .map((a) => (a as Address).toLowerCase() as Address);

  if (valid.length === 0) return new Map();

  const baseUrl = getApiBase();
  const res = await fetch(`${baseUrl}/api/ens`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ addresses: valid }),
  });

  const result = new Map<Address, ENSData>();
  if (!res.ok) {
    for (const addr of valid) {
      result.set(addr, {
        name: null,
        avatar: null,
        displayName: shorten(addr),
        address: addr,
      });
    }
    return result;
  }

  const body = (await res.json()) as { ensMap?: Record<string, ENSData> };
  const map = body?.ensMap || {};
  for (const [key, value] of Object.entries(map)) {
    const lower = key.toLowerCase() as Address;
    const data: ENSData = {
      name: value?.name ?? null,
      avatar: value?.avatar ?? null,
      displayName: value?.name || shorten(lower),
      address: lower,
    };
    result.set(lower, data);
  }
  return result;
}

export function clearENSCache(): void {
  localEnsCache.clear();
  localNameToAddressCache.clear();
  pendingRequests.clear();
  pendingNameRequests.clear();
}

export function getENSCacheStats(): { size: number; hitRate: number } {
  return {
    size: localEnsCache.size,
    hitRate: 0,
  };
}
