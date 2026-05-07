import { cache } from "react";
import { matchesGnarsKeywords } from "@/lib/poidh/keywords";
import { SUPPORTED_CHAINS } from "@/lib/poidh/config";
import type { PoidhBounty, PoidhClaim } from "@/types/poidh";

const POIDH_TRPC = "https://poidh.xyz/api/trpc";
const LIST_CACHE_TTL = 60 * 15; // 15 minutes
const DETAIL_CACHE_TTL = 60; // 1 minute

const SUPPORTED_CHAIN_IDS: number[] = Object.values(SUPPORTED_CHAINS);

interface FetchBountiesOptions {
  status?: "open" | "closed" | "voting" | "all";
  limit?: number;
  filterGnarly?: boolean;
}

interface FetchBountiesResult {
  bounties: PoidhBounty[];
  total: number;
}

async function fetchFromPoidh(
  endpoint: string,
  input: Record<string, unknown>,
  revalidate: number,
): Promise<unknown> {
  const encodedInput = encodeURIComponent(JSON.stringify({ json: input }));
  const url = `${POIDH_TRPC}/${endpoint}?input=${encodedInput}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`POIDH API error: ${res.status} from ${endpoint}`);
  const data = await res.json();
  return data?.result?.data?.json;
}

async function fetchBountiesByStatus(
  status: string,
  limit: number,
): Promise<PoidhBounty[]> {
  const data = await fetchFromPoidh(
    "bounties.fetchAll",
    { status, sortType: "date", limit },
    LIST_CACHE_TTL,
  );
  return ((data as { items?: PoidhBounty[] })?.items ?? []) as PoidhBounty[];
}

function normalizeBounties(
  bounties: PoidhBounty[],
  rawStatus: string,
  filterGnarly: boolean,
): PoidhBounty[] {
  return bounties
    .filter((bounty) => {
      if (!SUPPORTED_CHAIN_IDS.includes(bounty.chainId)) return false;
      if (filterGnarly) {
        return matchesGnarsKeywords(`${bounty.title} ${bounty.description}`);
      }
      return true;
    })
    .map((b) => ({
      ...b,
      isOpenBounty: b.isOpenBounty ?? b.isMultiplayer,
      isCompleted:
        rawStatus === "all" ? (b.isCompleted ?? false) : rawStatus === "closed",
    }));
}

export const fetchPoidhBounties = cache(
  async (options: FetchBountiesOptions = {}): Promise<FetchBountiesResult> => {
    const { status = "open", limit = 100, filterGnarly = false } = options;
    const clampedLimit = Math.min(Math.max(limit, 1), 500);

    let bounties: PoidhBounty[];

    if (status === "all") {
      const statuses = ["open", "progress", "past"];
      const results = await Promise.all(
        statuses.map(async (s) => {
          const items = await fetchBountiesByStatus(s, Math.ceil(clampedLimit / 3));
          return items.map((item) => ({
            ...item,
            isCompleted: s === "past",
          }));
        }),
      );
      bounties = results.flat().slice(0, clampedLimit);
    } else {
      const statusMap: Record<string, string> = {
        open: "open",
        closed: "past",
        voting: "progress",
      };
      bounties = await fetchBountiesByStatus(
        statusMap[status] || "open",
        clampedLimit,
      );
    }

    const normalized = normalizeBounties(bounties, status, filterGnarly);
    return { bounties: normalized, total: normalized.length };
  },
);

function mapClaims(rawClaims: unknown[]): PoidhClaim[] {
  return rawClaims.map((c: unknown) => {
    const claim = c as {
      id: number;
      onChainId?: number;
      bountyId: number;
      title?: string;
      description?: string;
      issuer: string;
      isAccepted: boolean;
      url?: string | null;
    };
    return {
      id: claim.id,
      onChainId: claim.onChainId ?? claim.id,
      bountyId: claim.bountyId,
      name: claim.title || `Claim #${claim.id}`,
      description: claim.description || "",
      issuer: claim.issuer,
      createdAt: 0,
      accepted: claim.isAccepted,
      url: claim.url || null,
    };
  });
}

export const fetchPoidhBounty = cache(
  async (chainId: number, id: number): Promise<PoidhBounty | null> => {
    if (!SUPPORTED_CHAIN_IDS.includes(chainId)) return null;
    if (isNaN(id) || id < 1) return null;

    const bountyData = await fetchFromPoidh(
      "bounties.fetch",
      { id, chainId },
      DETAIL_CACHE_TTL,
    );

    if (!bountyData) return null;
    const bounty = bountyData as PoidhBounty;

    // Fetch claims in parallel — can fail independently
    let claims: PoidhClaim[] = [];
    try {
      const claimsData = await fetchFromPoidh(
        "claims.fetchBountyClaims",
        { bountyId: id, chainId, limit: 50 },
        DETAIL_CACHE_TTL,
      );
      const rawItems = (claimsData as { items?: unknown[] })?.items ?? [];
      claims = mapClaims(rawItems);
    } catch {
      // Claims fetch failed — bounty still usable
    }

    return {
      ...bounty,
      isOpenBounty: bounty.isOpenBounty ?? bounty.isMultiplayer,
      isCompleted: bounty.isCompleted ?? claims.some((c) => c.accepted),
      claims,
    };
  },
);
