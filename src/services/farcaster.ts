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

export type FarcasterProfile = {
  fid: number;
  username: string;
  displayName: string | null;
  pfpUrl: string | null;
  followerCount: number;
  followingCount: number;
  bio: string | null;
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
