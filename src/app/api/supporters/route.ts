import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import type { Address } from "viem";
import { base } from "viem/chains";
import zoraNftAbi from "@/utils/abis/zoraNftAbi";

export const dynamic = "force-dynamic";
export const revalidate = 300;

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

interface AggregatedHolder {
  address: string;
  tokenCount: number;
  tokenIds: bigint[];
}

interface SerializedAggregatedHolder {
  address: string;
  tokenCount: number;
  tokenIds: string[];
}

interface SupportersResponse {
  supporters: SerializedAggregatedHolder[];
  totalSupply: string;
  hasMore: boolean;
  nextTokenId: string;
  cached: boolean;
}

const cache = new Map<string, { data: SupportersResponse; timestamp: number; ttl: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function getCacheKey(contractAddress: string, startTokenId: string, endTokenId: string): string {
  return `${contractAddress}-${startTokenId}-${endTokenId}`;
}

function getFromCache(key: string): SupportersResponse | null {
  const cached = cache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > cached.ttl) {
    cache.delete(key);
    return null;
  }
  return { ...cached.data, cached: true };
}

function setCache(key: string, data: SupportersResponse): void {
  cache.set(key, { data: { ...data, cached: false }, timestamp: Date.now(), ttl: CACHE_TTL });
}

async function readOwnerOf(address: Address, tokenId: bigint) {
  try {
    const result = await publicClient.readContract({
      address,
      abi: zoraNftAbi,
      functionName: "ownerOf",
      args: [tokenId],
    });
    return { success: true as const, data: result as string };
  } catch (err) {
    return { success: false as const, error: (err as Error).message };
  }
}

async function readTotalSupply(address: Address) {
  try {
    const result = await publicClient.readContract({
      address,
      abi: zoraNftAbi,
      functionName: "totalSupply",
    });
    return { success: true as const, data: result as bigint };
  } catch (err) {
    return { success: false as const, error: (err as Error).message };
  }
}

async function fetchTokenOwnersBatch(
  contractAddress: Address,
  startTokenId: bigint,
  endTokenId: bigint,
) {
  const results: { address: string; tokenId: bigint }[] = [];
  for (let tokenId = startTokenId; tokenId <= endTokenId; tokenId++) {
    const owner = await readOwnerOf(contractAddress, tokenId);
    if (owner.success && owner.data) {
      results.push({ address: owner.data, tokenId });
    }
  }
  return results;
}

function aggregateAndRank(minters: { address: string; tokenId: bigint }[]): AggregatedHolder[] {
  const map = new Map<string, { count: number; tokens: bigint[] }>();
  for (const { address, tokenId } of minters) {
    const entry = map.get(address) ?? { count: 0, tokens: [] };
    entry.count += 1;
    entry.tokens.push(tokenId);
    map.set(address, entry);
  }
  return Array.from(map.entries())
    .map(([address, v]) => ({ address, tokenCount: v.count, tokenIds: v.tokens }))
    .sort((a, b) => b.tokenCount - a.tokenCount);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const contractAddress = searchParams.get("contractAddress");
  const startTokenId = searchParams.get("startTokenId");
  const endTokenId = searchParams.get("endTokenId");
  const limitParam = searchParams.get("limit");

  if (!contractAddress) {
    return NextResponse.json({ error: "Missing contractAddress parameter" }, { status: 400 });
  }

  let formatted: Address;
  try {
    formatted = contractAddress.toLowerCase().startsWith("0x")
      ? (contractAddress as Address)
      : (`0x${contractAddress}` as Address);
  } catch {
    return NextResponse.json({ error: "Invalid contract address format" }, { status: 400 });
  }

  const start = startTokenId ? BigInt(startTokenId) : 1n;
  const end = endTokenId ? BigInt(endTokenId) : start + 19n;
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;

  const cacheKey = getCacheKey(contractAddress, start.toString(), end.toString());
  const cached = getFromCache(cacheKey);
  if (cached) {
    const limited =
      limit && cached.supporters.length > limit
        ? { ...cached, supporters: cached.supporters.slice(0, limit) }
        : cached;
    return NextResponse.json(limited);
  }

  try {
    const totalSupplyResult = await readTotalSupply(formatted);
    const totalSupply =
      totalSupplyResult.success && totalSupplyResult.data ? totalSupplyResult.data : 0n;
    const actualEnd = totalSupply > 0n && end > totalSupply ? totalSupply : end;

    const owners = await fetchTokenOwnersBatch(formatted, start, actualEnd);
    const aggregated = aggregateAndRank(owners);

    const serialized: SerializedAggregatedHolder[] = aggregated.map((h) => ({
      address: h.address,
      tokenCount: h.tokenCount,
      tokenIds: h.tokenIds.map((id) => id.toString()),
    }));

    const hasMore = totalSupply > actualEnd;
    const nextTokenId = hasMore ? actualEnd + 1n : totalSupply + 1n;

    const response: SupportersResponse = {
      supporters: limit ? serialized.slice(0, limit) : serialized,
      totalSupply: totalSupply.toString(),
      hasMore,
      nextTokenId: nextTokenId.toString(),
      cached: false,
    };

    setCache(cacheKey, {
      supporters: serialized,
      totalSupply: totalSupply.toString(),
      hasMore,
      nextTokenId: nextTokenId.toString(),
      cached: false,
    });

    const headers = new Headers();
    headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    return NextResponse.json(response, { headers });
  } catch (error) {
    console.error("Error fetching supporters:", error);
    return NextResponse.json({ error: "Failed to fetch supporters" }, { status: 500 });
  }
}
