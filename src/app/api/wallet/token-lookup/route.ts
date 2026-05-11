import { NextResponse, type NextRequest } from "next/server";
import { getCoin, setApiKey } from "@zoralabs/coins-sdk";
import { getAddress, isAddress } from "viem";

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

export interface LookedUpToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl: string | null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  const chainId = searchParams.get("chainId") ?? "8453";

  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  const alchemyKey = process.env.ALCHEMY_API_KEY;
  if (!alchemyKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const rpcBase = ALCHEMY_RPC_BASES[chainId];
  if (!rpcBase) {
    return NextResponse.json({ error: "Unsupported chain" }, { status: 400 });
  }

  const checksumAddr = getAddress(address);
  const rpcUrl = `${rpcBase}/${alchemyKey}`;

  // Fetch Alchemy metadata and Zora coin data in parallel.
  // Zora is only attempted on Base where creator coins live.
  const [metaRes, zoraToken] = await Promise.all([
    fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: 1,
        jsonrpc: "2.0",
        method: "alchemy_getTokenMetadata",
        params: [checksumAddr],
      }),
      next: { revalidate: 3600 },
    }),
    chainId === "8453"
      ? (async () => {
          try {
            const key = process.env.NEXT_PUBLIC_ZORA_API_KEY;
            if (key) setApiKey(key);
            const res = await getCoin({ address: checksumAddr, chain: 8453 });
            return res?.data?.zora20Token ?? null;
          } catch {
            return null;
          }
        })()
      : Promise.resolve(null),
  ]);

  if (!metaRes.ok) {
    return NextResponse.json({ error: "Metadata request failed" }, { status: 502 });
  }

  const meta: {
    name: string | null;
    symbol: string | null;
    decimals: number | null;
    logo: string | null;
  } = (await metaRes.json())?.result ?? {};

  if (!meta.symbol || !meta.name || meta.decimals == null) {
    return NextResponse.json({ error: "Not a valid ERC-20 token" }, { status: 404 });
  }

  // Logo priority: Zora media → Alchemy logo → TrustWallet CDN.
  let logoUrl: string | null = null;

  if (zoraToken?.mediaContent?.previewImage) {
    const preview = zoraToken.mediaContent.previewImage;
    const raw =
      typeof preview === "object"
        ? ((preview as Record<string, string>)?.medium ??
          (preview as Record<string, string>)?.small)
        : (preview as string | undefined);
    if (raw) {
      logoUrl = raw.startsWith("ipfs://") ? raw.replace("ipfs://", "https://dweb.link/ipfs/") : raw;
    }
  }

  if (!logoUrl) logoUrl = meta.logo ?? null;

  if (!logoUrl) {
    const twChain = TRUSTWALLET_CHAIN_NAMES[chainId];
    if (twChain) {
      logoUrl = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${twChain}/assets/${checksumAddr}/logo.png`;
    }
  }

  return NextResponse.json({
    address: checksumAddr,
    symbol: meta.symbol,
    name: meta.name,
    decimals: meta.decimals,
    logoUrl,
  } satisfies LookedUpToken);
}
