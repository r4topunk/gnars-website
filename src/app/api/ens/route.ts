import { NextResponse } from "next/server";
import { Address, isAddress } from "viem";

type ENSData = {
  name: string | null;
  avatar: string | null;
  displayName: string;
  address: Address;
};

type ENSResolveResult = {
  name: string | null;
  avatar: string | null;
};

type EnsRequestBody = {
  address?: string;
  addresses?: string[];
  name?: string;
};

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const ensCache = new Map<string, { data: ENSResolveResult; timestamp: number }>();
const nameToAddressCache = new Map<string, { address: Address | null; timestamp: number }>();

function now(): number {
  return Date.now();
}

function shortenAddress(address: Address): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function buildENSData(address: Address, base: ENSResolveResult): ENSData {
  return {
    name: base.name,
    avatar: base.avatar,
    displayName: base.name || shortenAddress(address),
    address,
  };
}

function normalizeAddress(addr: string): Address | null {
  const candidate = (addr || "").toLowerCase();
  return isAddress(candidate) ? (candidate as Address) : null;
}

async function fetchENSFromUpstream(address: Address): Promise<ENSResolveResult> {
  // Primary provider: ensideas
  try {
    const res = await fetch(`https://api.ensideas.com/ens/resolve/${address}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "gnars-website/ens",
      },
      next: { revalidate: 60 * 60 },
    });
    if (res.ok) {
      const data = (await res.json()) as { displayName?: string | null; name?: string | null; avatar?: string | null };
      return {
        name: data.displayName || data.name || null,
        avatar: data.avatar || null,
      };
    }
  } catch {
    // ignore
  }

  // Fallback provider
  try {
    const res = await fetch(`https://ens.resolver.eth.link/resolve/${address}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 * 60 },
    });
    if (res.ok) {
      const data = (await res.json()) as { name?: string | null; avatar?: string | null };
      return {
        name: data.name || null,
        avatar: data.avatar || null,
      };
    }
  } catch {
    // ignore
  }

  return { name: null, avatar: null };
}

async function resolveEnsForAddress(address: Address): Promise<ENSResolveResult> {
  const cached = ensCache.get(address);
  if (cached && now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const data = await fetchENSFromUpstream(address);
  ensCache.set(address, { data, timestamp: now() });
  return data;
}

async function resolveNameToAddress(name: string): Promise<Address | null> {
  const trimmed = (name || "").trim().toLowerCase();
  if (!trimmed || !trimmed.includes(".")) return null;

  const cached = nameToAddressCache.get(trimmed);
  if (cached && now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.address;
  }

  // Primary provider
  try {
    const res = await fetch(`https://api.ensideas.com/ens/resolve/${encodeURIComponent(trimmed)}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "gnars-website/ens",
      },
      next: { revalidate: 60 * 60 },
    });
    if (res.ok) {
      const data = (await res.json()) as { address?: string | null };
      const addr = typeof data?.address === "string" ? data.address.toLowerCase() : null;
      const normalized = addr && isAddress(addr) ? (addr as Address) : null;
      nameToAddressCache.set(trimmed, { address: normalized, timestamp: now() });
      return normalized;
    }
  } catch {
    // ignore
  }

  // Fallback provider
  try {
    const res = await fetch(`https://ens.resolver.eth.link/resolve/${encodeURIComponent(trimmed)}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 * 60 },
    });
    if (res.ok) {
      const data = (await res.json()) as { address?: string | null };
      const addr = typeof data?.address === "string" ? data.address.toLowerCase() : null;
      const normalized = addr && isAddress(addr) ? (addr as Address) : null;
      nameToAddressCache.set(trimmed, { address: normalized, timestamp: now() });
      return normalized;
    }
  } catch {
    // ignore
  }

  nameToAddressCache.set(trimmed, { address: null, timestamp: now() });
  return null;
}

async function handleSingle(addressParam: string) {
  const normalized = normalizeAddress(addressParam);
  if (!normalized) {
    return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  }

  const base = await resolveEnsForAddress(normalized);
  const ens = buildENSData(normalized, base);
  return NextResponse.json({ ens });
}

async function handleBatch(addressesParam: string[]) {
  const addresses: Address[] = addressesParam
    .map((a) => normalizeAddress(a))
    .filter((a): a is Address => Boolean(a));

  if (addresses.length === 0) {
    return NextResponse.json({ error: "addresses_required" }, { status: 400 });
  }

  const results = await Promise.all(
    addresses.map(async (addr) => {
      const base = await resolveEnsForAddress(addr);
      return [addr, buildENSData(addr, base)] as const;
    })
  );

  const ensMap: Record<string, ENSData> = {};
  for (const [addr, data] of results) {
    ensMap[addr] = data;
  }
  return NextResponse.json({ ensMap });
}

async function handleName(nameParam: string) {
  const address = await resolveNameToAddress(String(nameParam || ""));
  return NextResponse.json({ address });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  const address = searchParams.get("address");
  const addressesParam = searchParams.get("addresses");

  if (name) return handleName(name);
  if (address) return handleSingle(address);
  if (addressesParam) return handleBatch(addressesParam.split(","));

  return NextResponse.json({ error: "missing_params" }, { status: 400 });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as EnsRequestBody;
    if (body?.name) return handleName(body.name);
    if (body?.address) return handleSingle(body.address);
    if (Array.isArray(body?.addresses)) return handleBatch(body.addresses);
    return NextResponse.json({ error: "missing_params" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
}


