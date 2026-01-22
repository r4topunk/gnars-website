import "server-only";

import { unstable_cache } from "next/cache";
import { Configuration, NeynarAPIClient } from "@neynar/nodejs-sdk";
import type { User } from "@neynar/nodejs-sdk/build/api/models/user";

const apiKey = process.env.NEYNAR_API_KEY;

export const neynarClient = apiKey
  ? new NeynarAPIClient(
      new Configuration({
        apiKey,
        baseOptions: {
          headers: {
            "Content-Type": "application/json",
          },
        },
      }),
    )
  : null;

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

function mapUserToProfile(user: User): FarcasterProfile {
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

function selectBestUser(users: User[], address: string): User | null {
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

  if (!neynarClient || normalized.length === 0) return empty;

  try {
    const response = await neynarClient.fetchBulkUsersByEthOrSolAddress({
      addresses: normalized,
      addressTypes: ["custody_address", "verified_address"],
    });

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
