import { NextResponse } from "next/server";

// Cache external CoinGecko fetches for 4 hours
const COINGECKO_REVALIDATE_SECONDS = 60 * 60 * 4;

type PricesRequest = {
  addresses?: string[];
};

function normalizeAddresses(addrs: string[]): string[] {
  return addrs
    .map((a) => (typeof a === "string" ? a : ""))
    .map((a) => a.toLowerCase())
    .filter(Boolean);
}

async function handlePrices(addresses: string[]) {
  if (addresses.length === 0) {
    return NextResponse.json({ error: "addresses required" }, { status: 400 });
  }

  const apiKey = process.env.COINGECKO_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "missing_coingecko_key" }, { status: 400 });
  }

  const params = new URLSearchParams({
    contract_addresses: addresses.join(","),
    vs_currencies: "usd",
  });

  const url = `https://api.coingecko.com/api/v3/simple/token_price/base?${params.toString()}`;
  const res = await fetch(url, {
    headers: { "user-agent": "gnars-website/treasury", "x-cg-demo-api-key": apiKey },
    next: { revalidate: COINGECKO_REVALIDATE_SECONDS },
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: "coingecko_error", status: res.status, body: text },
      { status: 200 },
    );
  }

  const data = (await res.json()) as Record<string, { usd?: number }>;
  const normalized: Record<string, { usd: number }> = {};
  for (const [addr, price] of Object.entries(data)) {
    const key = addr.toLowerCase();
    const usd = Number(price?.usd ?? 0) || 0;
    normalized[key] = { usd };
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
