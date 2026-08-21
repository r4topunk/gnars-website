import { NextResponse, type NextRequest } from "next/server";
import { getAddress, isAddress } from "viem";

/**
 * Live ERC-20 discovery for the /swap token picker via Pioneer
 * (api.keepkey.info) — the same balance engine keepkey-vault / SwapPro use.
 *
 * This replaces the fragile Blockscout `addresses/{addr}/tokens?type=ERC-20`
 * call (500ing on the Base instance): Pioneer is keyless, free and
 * multi-source, so a Blockscout outage can no longer blank the picker.
 */

const PIONEER_API = "https://api.keepkey.info/api/v1";
/** Chain ids the swap UI supports (mirrors SWAP_CHAINS in swap/chains.ts). */
const SUPPORTED_CHAINS = new Set([8453, 1, 10, 42161]);

type PioneerBalance = {
  caip?: string;
  pubkey?: string;
  symbol?: string;
  name?: string;
  balance?: string;
  priceUsd?: string;
  valueUsd?: string;
  type?: string;
  isNative?: boolean;
  contract?: string;
  decimals?: number;
  isScam?: boolean;
};

/** Decimal string → base-units bigint (handles fractional balance strings). */
function decimalToBaseUnits(human: string | undefined, decimals: number): bigint {
  if (!human) return 0n;
  const [whole = "0", frac = ""] = human.split(".");
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(`${whole || "0"}${fracPadded}`);
}

/** Pioneer-hosted coin logo for a token CAIP (same URL scheme as SwapPro). */
function pioneerCoinLogo(caip?: string): string | null {
  if (!caip) return null;
  return `https://api.keepkey.info/coins/${btoa(caip).replace(/=+$/, "")}.png`;
}

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const address = sp.get("address");
  const chainId = Number(sp.get("chainId") ?? "8453");

  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }
  if (!SUPPORTED_CHAINS.has(chainId)) {
    return NextResponse.json({ error: "Unsupported chain" }, { status: 400 });
  }

  const caip = `eip155:${chainId}/slip44:60`;
  // Self-issued queryKey — Pioneer is keyless; a fresh key per request is fine.
  const queryKey = `gnars:${crypto.randomUUID()}`;

  let res: Response;
  try {
    res = await fetch(`${PIONEER_API}/portfolio?forceRefresh=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: queryKey },
      body: JSON.stringify({
        pubkeys: [{ caip, pubkey: getAddress(address) }],
        includeDefi: false,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    return NextResponse.json({ error: "Pioneer request failed" }, { status: 502 });
  }
  if (!res.ok) {
    return NextResponse.json({ error: `Pioneer ${res.status}` }, { status: 502 });
  }

  const data = (await res.json()) as { balances?: PioneerBalance[] };

  const tokens = (data.balances ?? [])
    // ERC-20 tokens only — the picker already carries the native asset from
    // the curated chain list.
    .filter((b) => b.type === "token" || (b.caip ?? "").includes("/erc20:"))
    // Scam/spam airdrop flags: exclude from the picker (mirrors SwapPro).
    .filter((b) => !b.isScam)
    .filter((b) => decimalToBaseUnits(b.balance, b.decimals ?? 18) > 0n)
    .map(
      (
        b,
      ): {
        address: string;
        symbol: string;
        name: string;
        decimals: number;
        balance: string;
        displayBalance: string;
        logoUrl: string | null;
        usdValue: number | null;
      } => {
        const contract = b.contract ?? (b.caip ?? "").split("/")[1]?.replace(/^erc20:/, "") ?? "";
        const price = b.priceUsd ? parseFloat(b.priceUsd) : 0;
        const value = b.valueUsd ? parseFloat(b.valueUsd) : 0;
        return {
          address: contract,
          symbol: b.symbol ?? "",
          name: b.name ?? b.symbol ?? "",
          decimals: b.decimals ?? 18,
          balance: b.balance ?? "0",
          displayBalance: b.balance ?? "0",
          logoUrl: pioneerCoinLogo(b.caip),
          usdValue: value > 0 ? value : null,
        };
      },
    )
    .filter((t) => t.address);

  return NextResponse.json(tokens, {
    headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" },
  });
}
