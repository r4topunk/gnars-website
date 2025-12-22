import { NextResponse } from "next/server";

// Cache external CoinGecko fetches for 4 hours
const COINGECKO_REVALIDATE_SECONDS = 60 * 60 * 4;

// WETH address on Base - we'll use ETH price for this
const WETH_ADDRESS_BASE = "0x4200000000000000000000000000000000000006";

type PricesRequest = {
  addresses?: string[];
};

function normalizeAddresses(addrs: string[]): string[] {
  return addrs
    .map((a) => (typeof a === "string" ? a : ""))
    .map((a) => a.toLowerCase())
    .filter(Boolean);
}

async function fetchEthPrice(apiKey: string): Promise<number> {
  const url = "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd";
  const res = await fetch(url, {
    headers: { "user-agent": "gnars-website/treasury", "x-cg-demo-api-key": apiKey },
    cache: "no-store",
  });

  if (!res.ok) {
    return 0;
  }

  const data = (await res.json()) as { ethereum?: { usd?: number } };
  return Number(data?.ethereum?.usd ?? 0) || 0;
}

async function handlePrices(addresses: string[]) {
  if (addresses.length === 0) {
    return NextResponse.json({ error: "addresses required" }, { status: 400 });
  }

  const apiKey = process.env.COINGECKO_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "missing_coingecko_key" }, { status: 400 });
  }

  // Filter out WETH since we'll fetch ETH price separately
  const tokenAddresses = addresses.filter((a) => a.toLowerCase() !== WETH_ADDRESS_BASE.toLowerCase());
  const includesWeth = addresses.some((a) => a.toLowerCase() === WETH_ADDRESS_BASE.toLowerCase());

  // Fetch token prices and ETH price in parallel
  const [tokenData, ethPrice] = await Promise.all([
    tokenAddresses.length > 0
      ? (async () => {
          const params = new URLSearchParams({
            contract_addresses: tokenAddresses.join(","),
            vs_currencies: "usd",
          });
          const url = `https://api.coingecko.com/api/v3/simple/token_price/base?${params.toString()}`;
          const res = await fetch(url, {
            headers: { "user-agent": "gnars-website/treasury", "x-cg-demo-api-key": apiKey },
            next: { revalidate: COINGECKO_REVALIDATE_SECONDS },
          });
          if (!res.ok) return {} as Record<string, { usd?: number }>;
          return (await res.json()) as Record<string, { usd?: number }>;
        })()
      : Promise.resolve({} as Record<string, { usd?: number }>),
    includesWeth ? fetchEthPrice(apiKey) : Promise.resolve(0),
  ]);

  const normalized: Record<string, { usd: number }> = {};

  // Add token prices
  for (const [addr, price] of Object.entries(tokenData)) {
    const key = addr.toLowerCase();
    const usd = Number(price?.usd ?? 0) || 0;
    normalized[key] = { usd };
  }

  // Add WETH price using ETH price
  if (includesWeth && ethPrice > 0) {
    normalized[WETH_ADDRESS_BASE.toLowerCase()] = { usd: ethPrice };
  }

  return NextResponse.json({ prices: normalized });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const addressesParam = searchParams.get("addresses") || "";
  const addresses = normalizeAddresses(addressesParam.split(","));
  return handlePrices(addresses);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PricesRequest;
    const raw = Array.isArray(body?.addresses) ? body.addresses : [];
    const addresses = normalizeAddresses(raw);
    return handlePrices(addresses);
  } catch {
    return NextResponse.json({ error: "invalid-request" }, { status: 400 });
  }
}
