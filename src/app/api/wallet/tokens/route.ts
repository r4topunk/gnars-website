import { NextResponse, type NextRequest } from "next/server";
import { formatUnits, getAddress, isAddress } from "viem";
import type { WalletToken } from "@/app/[locale]/swap/chains";

const ALCHEMY_RPC_BASES: Record<string, string> = {
  "8453": "https://base-mainnet.g.alchemy.com/v2",
  "1": "https://eth-mainnet.g.alchemy.com/v2",
  "10": "https://opt-mainnet.g.alchemy.com/v2",
  "42161": "https://arb-mainnet.g.alchemy.com/v2",
};

const TRUSTWALLET_CHAIN_NAMES: Record<string, string> = {
  "8453": "base",
  "1": "ethereum",
  "10": "optimism",
  "42161": "arbitrum",
};

// CoinGecko platform IDs for token price lookups.
const COINGECKO_PLATFORMS: Record<string, string> = {
  "8453": "base",
  "1": "ethereum",
  "10": "optimistic-ethereum",
  "42161": "arbitrum-one",
};

type AlchemyMetaResult = {
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  logo: string | null;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  const chainId = searchParams.get("chainId") ?? "8453";

  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  const rpcBase = ALCHEMY_RPC_BASES[chainId];
  if (!rpcBase) {
    return NextResponse.json({ error: "Unsupported chain" }, { status: 400 });
  }

  const alchemyKey = process.env.ALCHEMY_API_KEY;
  if (!alchemyKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const rpcUrl = `${rpcBase}/${alchemyKey}`;

  // 1. Fetch all ERC-20 balances. Live data — no cache.
  const balancesRes = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method: "alchemy_getTokenBalances",
      params: [address, "erc20"],
    }),
    cache: "no-store",
  });

  if (!balancesRes.ok) {
    return NextResponse.json({ error: "Alchemy request failed" }, { status: 502 });
  }

  const balancesData = await balancesRes.json();
  const rawBalances: { contractAddress: string; tokenBalance: string }[] =
    balancesData?.result?.tokenBalances ?? [];

  const nonZero = rawBalances.filter((t) => {
    try {
      return BigInt(t.tokenBalance) > 0n;
    } catch {
      return false;
    }
  });

  if (nonZero.length === 0) return NextResponse.json([]);

  // 2. Fetch metadata and CoinGecko prices in parallel.
  const metaBatch = nonZero.map((t, i) => ({
    id: i + 1,
    jsonrpc: "2.0",
    method: "alchemy_getTokenMetadata",
    params: [t.contractAddress],
  }));

  const cgKey = process.env.COINGECKO_API_KEY;
  const cgPlatform = COINGECKO_PLATFORMS[chainId];
  const cgAddresses = nonZero.map((t) => t.contractAddress).join(",");
  const cgUrl = cgPlatform
    ? `https://api.coingecko.com/api/v3/simple/token_price/${cgPlatform}?contract_addresses=${cgAddresses}&vs_currencies=usd`
    : null;

  const [metaRes, cgRes] = await Promise.all([
    fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metaBatch),
      next: { revalidate: 3600 }, // token ABIs are stable
    }),
    cgUrl && cgKey
      ? fetch(cgUrl, {
          headers: { "x-cg-demo-api-key": cgKey },
          next: { revalidate: 300 }, // prices: 5-min cache
        })
      : Promise.resolve(null),
  ]);

  if (!metaRes.ok) {
    return NextResponse.json({ error: "Metadata request failed" }, { status: 502 });
  }

  const metaResults: { id: number; result: AlchemyMetaResult }[] = await metaRes.json();
  const metaById = new Map(metaResults.map((m) => [m.id, m.result]));

  // CoinGecko returns lowercase addresses as keys.
  const cgPrices: Record<string, { usd?: number }> = cgRes?.ok ? await cgRes.json() : {};

  const twChainName = TRUSTWALLET_CHAIN_NAMES[chainId];

  const tokens: WalletToken[] = nonZero
    .map((t, i): WalletToken | null => {
      const meta = metaById.get(i + 1);
      if (!meta?.symbol || !meta?.name || meta.decimals == null) return null;

      const checksumAddr = getAddress(t.contractAddress);
      const rawValue = BigInt(t.tokenBalance);
      const displayBalance = formatUnits(rawValue, meta.decimals);

      const price = cgPrices[t.contractAddress.toLowerCase()]?.usd ?? null;
      const usdValue = price !== null ? parseFloat(displayBalance) * price : null;

      const twLogo = twChainName
        ? `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${twChainName}/assets/${checksumAddr}/logo.png`
        : null;

      return {
        address: checksumAddr,
        symbol: meta.symbol,
        name: meta.name,
        decimals: meta.decimals,
        balance: rawValue.toString(),
        displayBalance,
        logoUrl: meta.logo ?? twLogo,
        usdValue,
      };
    })
    .filter((t): t is WalletToken => {
      if (!t) return false;
      // Drop dust/spam: tokens with a known USD value below $0.50.
      // Tokens with no CoinGecko price (usdValue === null) are kept —
      // they may be legitimate tokens not yet listed.
      if (t.usdValue !== null && t.usdValue < 0.5) return false;
      return true;
    })
    // Sort by USD value desc; fall back to normalised balance for unlisted tokens.
    .sort((a, b) => {
      if (a.usdValue !== null && b.usdValue !== null) return b.usdValue - a.usdValue;
      if (a.usdValue !== null) return -1;
      if (b.usdValue !== null) return 1;
      return parseFloat(b.displayBalance) - parseFloat(a.displayBalance);
    });

  return NextResponse.json(tokens);
}
