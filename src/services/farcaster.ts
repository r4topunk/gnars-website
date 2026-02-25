import "server-only";

import { unstable_cache } from "next/cache";

const apiKey = process.env.NEYNAR_API_KEY;

type NeynarUser = {
  fid: number;
  username: string;
  display_name?: string;
  pfp_url?: string;
  custody_address: string;
  follower_count?: number;
  following_count?: number;
  profile?: { bio?: { text?: string } };
  verified_addresses?: { eth_addresses?: string[]; sol_addresses?: string[] };
};

const MAX_ADDRESSES_PER_REQUEST = 350;
const CACHE_REVALIDATE_SECONDS = 60 * 15;

export const hasNeynarApiKey = Boolean(apiKey);

export type FarcasterProfile = {
  fid: number;
  username: string;
  displayName: string | null;
  pfpUrl: string | null;
  followerCount: number;
  followingCount: number;
  bio: string | null;
};

export type FarcasterTokenBalance = {
  address: string;
  name: string;
  symbol: string;
  decimals: number | null;
  balance: string;
  balanceUsd: string | null;
  walletAddress: string | null;
  network: string;
};

export type FarcasterNftHolding = {
  contractAddress: string | null;
  tokenId: string | null;
  name: string | null;
  imageUrl: string | null;
  collectionName: string | null;
  collectionImageUrl: string | null;
  chain: string | null;
  acquiredAt: string | null;
};

type FarcasterProfilesByAddress = Record<string, FarcasterProfile | null>;

function normalizeAddress(address: string): string {
  return address.trim().toLowerCase();
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function mapUserToProfile(user: NeynarUser): FarcasterProfile {
  return {
    fid: user.fid,
    username: user.username,
    displayName: user.display_name ?? null,
    pfpUrl: user.pfp_url ?? null,
    followerCount: user.follower_count ?? 0,
    followingCount: user.following_count ?? 0,
    bio: user.profile?.bio?.text ?? null,
  };
}

function selectBestUser(users: NeynarUser[], address: string): NeynarUser | null {
  if (users.length === 0) return null;
  const normalized = normalizeAddress(address);
  const custodyMatch = users.find(
    (user) => normalizeAddress(user.custody_address) === normalized,
  );
  if (custodyMatch) return custodyMatch;

  const verifiedMatch = users.find((user) => {
    const eth = user.verified_addresses?.eth_addresses ?? [];
    const sol = user.verified_addresses?.sol_addresses ?? [];
    return (
      eth.some((addr) => normalizeAddress(addr) === normalized) ||
      sol.some((addr) => normalizeAddress(addr) === normalized)
    );
  });
  if (verifiedMatch) return verifiedMatch;

  return [...users].sort((a, b) => (b.follower_count ?? 0) - (a.follower_count ?? 0))[0] ?? null;
}

export function assertNeynarApiKey(context: string): boolean {
  if (!apiKey) {
    console.warn(`[${context}] NEYNAR_API_KEY is not set; skipping Neynar calls.`);
    return false;
  }

  return true;
}

async function fetchFarcasterProfilesChunk(
  addresses: string[],
): Promise<FarcasterProfilesByAddress> {
  const normalized = addresses.map(normalizeAddress);
  const empty = Object.fromEntries(normalized.map((address) => [address, null]));

  if (!apiKey || normalized.length === 0) return empty;

  try {
    const url = new URL("https://api.neynar.com/v2/farcaster/user/bulk-by-address");
    url.searchParams.set("addresses", normalized.join(","));
    url.searchParams.set("address_types", "custody_address,verified_address");

    const res = await fetch(url.toString(), {
      headers: { api_key: apiKey },
      next: { revalidate: CACHE_REVALIDATE_SECONDS },
    });

    if (!res.ok) {
      console.warn(`Neynar bulk-by-address failed: ${res.status} ${await res.text()}`);
      return empty;
    }

    const response = (await res.json()) as Record<string, NeynarUser[]>;
    const result: FarcasterProfilesByAddress = {};
    for (const address of normalized) {
      const users = response[address] ?? [];
      const selected = selectBestUser(users, address);
      result[address] = selected ? mapUserToProfile(selected) : null;
    }
    return result;
  } catch (error) {
    console.warn("Failed to fetch Farcaster profiles from Neynar", error);
    return empty;
  }
}

export async function fetchFarcasterProfilesByAddressUncached(
  addresses: string[],
): Promise<FarcasterProfilesByAddress> {
  if (addresses.length === 0) return {};
  const normalized = Array.from(new Set(addresses.map(normalizeAddress))).sort();
  const chunks = chunkArray(normalized, MAX_ADDRESSES_PER_REQUEST);
  const results: FarcasterProfilesByAddress = {};

  for (const chunk of chunks) {
    const chunkProfiles = await fetchFarcasterProfilesChunk(chunk);
    Object.assign(results, chunkProfiles);
  }

  return results;
}

async function fetchCachedFarcasterProfilesChunk(
  addresses: string[],
): Promise<FarcasterProfilesByAddress> {
  const key = `farcaster-profiles:${addresses.join(",")}`;
  const cached = unstable_cache(
    () => fetchFarcasterProfilesChunk(addresses),
    ["farcaster-profiles", key],
    { revalidate: CACHE_REVALIDATE_SECONDS, tags: ["farcaster-profiles"] },
  );
  return cached();
}

export async function fetchFarcasterProfilesByAddress(
  addresses: string[],
): Promise<FarcasterProfilesByAddress> {
  if (addresses.length === 0) return {};
  const normalized = Array.from(new Set(addresses.map(normalizeAddress))).sort();
  const chunks = chunkArray(normalized, MAX_ADDRESSES_PER_REQUEST);
  const results: FarcasterProfilesByAddress = {};

  for (const chunk of chunks) {
    const chunkProfiles = await fetchCachedFarcasterProfilesChunk(chunk);
    Object.assign(results, chunkProfiles);
  }

  return results;
}

async function fetchFarcasterUserNFTsUncached(fid: number): Promise<FarcasterNftHolding[]> {
  // NOTE: Neynar's v2 API does not currently provide an NFT holdings endpoint.
  // This functionality may be available in future API versions or higher plan tiers.
  // Returning empty array for now - can be implemented when Neynar adds this endpoint.
  console.log(`[farcaster.nfts] NFT endpoint not available in Neynar v2 API (fid ${fid})`);
  return [];
}

async function fetchCachedFarcasterUserNFTs(fid: number): Promise<FarcasterNftHolding[]> {
  const cached = unstable_cache(
    () => fetchFarcasterUserNFTsUncached(fid),
    ["farcaster-nfts", `fid:${fid}`],
    { revalidate: CACHE_REVALIDATE_SECONDS, tags: ["farcaster-nfts"] },
  );
  return cached();
}

export async function fetchFarcasterUserNFTs(fid: number): Promise<FarcasterNftHolding[]> {
  if (!apiKey) return [];
  return fetchCachedFarcasterUserNFTs(fid);
}

type NeynarBalanceToken = {
  contract_address?: string | null;
  address?: string | null;
  name?: string;
  symbol?: string;
  decimals?: number | null;
};

type NeynarTokenBalance = {
  token?: NeynarBalanceToken;
  balance?: { in_token?: string; in_usdc?: string | null };
};

type NeynarAddressBalance = {
  verified_address?: { address?: string };
  token_balances?: NeynarTokenBalance[];
};

type NeynarUserBalanceResponse = {
  user_balance?: { address_balances?: NeynarAddressBalance[] };
};

export async function fetchFarcasterUserCoinsUncached(
  fid: number,
): Promise<FarcasterTokenBalance[]> {
  if (!apiKey) return [];

  try {
    const url = new URL("https://api.neynar.com/v2/farcaster/user/balance");
    url.searchParams.set("fid", String(fid));
    url.searchParams.set("networks", "base");

    const res = await fetch(url.toString(), {
      headers: { api_key: apiKey },
    });

    if (!res.ok) {
      console.warn(`[farcaster.coins] Balance fetch failed: ${res.status}`);
      return [];
    }

    const response = (await res.json()) as NeynarUserBalanceResponse;
    const addressBalances = response.user_balance?.address_balances ?? [];
    const balances: FarcasterTokenBalance[] = [];

    for (const addressBalance of addressBalances) {
      const walletAddress = addressBalance.verified_address?.address
        ? normalizeAddress(addressBalance.verified_address.address)
        : null;

      for (const tokenBalance of addressBalance.token_balances || []) {
        const token = tokenBalance.token;
        const balance = tokenBalance.balance;
        const tokenAddress = token?.contract_address ?? token?.address;
        if (!tokenAddress || !balance) continue;

        balances.push({
          address: normalizeAddress(tokenAddress),
          name: token.name ?? "",
          symbol: token.symbol ?? "",
          decimals: token.decimals ?? null,
          balance: balance.in_token ?? "0",
          balanceUsd: balance.in_usdc ?? null,
          walletAddress,
          network: "base",
        });
      }
    }

    return balances;
  } catch (error) {
    console.warn(`[farcaster.coins] Failed to fetch token balances for fid ${fid}`, error);
    return [];
  }
}

async function fetchCachedFarcasterUserCoins(fid: number): Promise<FarcasterTokenBalance[]> {
  const cached = unstable_cache(
    () => fetchFarcasterUserCoinsUncached(fid),
    ["farcaster-coins", `fid:${fid}`],
    { revalidate: CACHE_REVALIDATE_SECONDS, tags: ["farcaster-coins"] },
  );
  return cached();
}

export async function fetchFarcasterUserCoins(fid: number): Promise<FarcasterTokenBalance[]> {
  if (!apiKey) return [];
  return fetchCachedFarcasterUserCoins(fid);
}
