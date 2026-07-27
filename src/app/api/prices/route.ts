import { NextResponse } from "next/server";
import { getEthUsd, getTokenPricesUsd, type UsdPrice } from "@/services/prices";

/**
 * Thin wrapper over `services/prices` — see that module for provider choice,
 * TTL and failure semantics.
 *
 * A price of `null` means "unknown", never "$0". Callers must branch on it.
 *
 * WETH stays special-cased to the ETH feed (they are 1:1 by construction, and
 * Alchemy's ETH price is the fresher of the two), which is what the previous
 * implementation did too.
 */
export const dynamic = "force-dynamic";

const CDN_TTL_SECONDS = 300;
const WETH_ADDRESS_BASE = "0x4200000000000000000000000000000000000006";

function normalizeAddresses(addrs: string[]): string[] {
  return addrs.map((a) => (typeof a === "string" ? a.toLowerCase() : "")).filter(Boolean);
}

async function handlePrices(addresses: string[]) {
  if (addresses.length === 0) {
    return NextResponse.json({ error: "addresses required" }, { status: 400 });
  }

  const weth = WETH_ADDRESS_BASE.toLowerCase();
  const wantsWeth = addresses.includes(weth);
  const tokenAddresses = addresses.filter((a) => a !== weth);

  const [tokenPrices, ethUsd] = await Promise.all([
    getTokenPricesUsd(tokenAddresses, "base"),
    wantsWeth ? getEthUsd() : Promise.resolve(null),
  ]);

  const prices: Record<string, { usd: UsdPrice }> = {};
  for (const [address, usd] of Object.entries(tokenPrices)) {
    prices[address] = { usd };
  }
  if (wantsWeth) prices[weth] = { usd: ethUsd };

  // A fully-null map is an outage, not an answer — don't let the CDN hold it
  // for the whole window.
  const anyResolved = Object.values(prices).some((p) => p.usd !== null);

  return NextResponse.json(
    { prices },
    {
      headers: anyResolved
        ? {
            "Cache-Control": `public, s-maxage=${CDN_TTL_SECONDS}, stale-while-revalidate=${CDN_TTL_SECONDS * 2}`,
          }
        : { "Cache-Control": "no-store" },
    },
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const addresses = normalizeAddresses((searchParams.get("addresses") || "").split(","));
  return handlePrices(addresses);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { addresses?: string[] };
    const addresses = normalizeAddresses(Array.isArray(body?.addresses) ? body.addresses : []);
    return handlePrices(addresses);
  } catch {
    return NextResponse.json({ error: "invalid-request" }, { status: 400 });
  }
}
