import { headers } from "next/headers";
import { ImageResponse } from "next/og";
import { formatEther } from "viem";
import { DAO_ADDRESSES, TREASURY_TOKEN_ADDRESSES, TREASURY_TOKEN_ALLOWLIST } from "@/lib/config";
import { formatEthDisplay, formatUsdDisplay, OG_COLORS, OG_FONTS, OG_SIZE } from "@/lib/og-utils";

export const alt = "Gnars DAO Treasury";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 300;
export const dynamic = "force-dynamic";

type TokenBalance = {
  contractAddress?: string;
  tokenBalance: string;
  decimals?: number;
};

type AlchemyTokenResponse = {
  result?: {
    tokenBalances?: TokenBalance[];
  };
};

type PriceResponse = {
  prices?: Record<string, { usd?: number }>;
};

type EthPriceResponse = {
  usd: number;
  error?: string;
};

async function fetchTreasurySnapshot(): Promise<{ ethBalance: string; usdTotal: number } | null> {
  try {
    const baseUrl = await getBaseUrl();

    const [ethRes, tokenRes, priceRes, ethPriceRes] = await Promise.all([
      fetchJson<{ result?: string }>(`${baseUrl}/api/alchemy`, {
        method: "POST",
        body: JSON.stringify({
          method: "eth_getBalance",
          params: [DAO_ADDRESSES.treasury, "latest"],
        }),
      }),
      fetchJson<AlchemyTokenResponse>(`${baseUrl}/api/alchemy`, {
        method: "POST",
        body: JSON.stringify({
          method: "alchemy_getTokenBalances",
          params: [DAO_ADDRESSES.treasury, TREASURY_TOKEN_ADDRESSES.filter(Boolean)],
        }),
      }),
      fetchJson<PriceResponse>(`${baseUrl}/api/prices`, {
        method: "POST",
        body: JSON.stringify({
          addresses: TREASURY_TOKEN_ADDRESSES.map((a) => String(a).toLowerCase()),
        }),
      }).catch(() => ({ prices: {} })),
      fetchJson<EthPriceResponse>(`${baseUrl}/api/eth-price`, {
        method: "GET",
      }).catch(() => ({ usd: 0 })),
    ]);

    const ethBalanceWei = BigInt(ethRes.result ?? "0x0");
    const ethBalance = Number(formatEther(ethBalanceWei));
    const ethPrice = ethPriceRes?.usd ?? 0;

    const tokenBalances = (tokenRes.result?.tokenBalances ?? []).filter((token) => {
      const balance = token.tokenBalance?.toLowerCase();
      return balance && balance !== "0" && balance !== "0x0";
    });

    const prices: Record<string, { usd: number }> = priceRes.prices ?? {};
    const wethAddress = String(TREASURY_TOKEN_ALLOWLIST.WETH).toLowerCase();

    const priceLookup = Object.fromEntries(
      Object.entries(prices).map(([address, value]) => [
        address.toLowerCase(),
        address.toLowerCase() === wethAddress ? ethPrice : Number(value?.usd ?? 0) || 0,
      ]),
    );
    priceLookup[wethAddress] = ethPrice;

    const decimals: Record<string, number> = {
      [String(TREASURY_TOKEN_ALLOWLIST.USDC).toLowerCase()]: 6,
      [String(TREASURY_TOKEN_ALLOWLIST.WETH).toLowerCase()]: 18,
      [String(TREASURY_TOKEN_ALLOWLIST.SENDIT).toLowerCase()]: 18,
    };

    const tokensUsd = tokenBalances.reduce((sum, token) => {
      const address = token.contractAddress ? String(token.contractAddress).toLowerCase() : null;
      if (!address) return sum;
      const tokenDecimals = decimals[address] ?? 18;
      const raw = token.tokenBalance ?? "0x0";
      const parsed = Number.parseInt(raw, 16);
      const balance = Number.isFinite(parsed) ? parsed / Math.pow(10, tokenDecimals) : 0;
      const price = priceLookup[address] ?? 0;
      return sum + balance * price;
    }, 0);

    const usdTotal = tokensUsd + ethBalance * ethPrice;

    return {
      ethBalance: formatEthDisplay(ethBalance),
      usdTotal,
    };
  } catch (error) {
    console.error("[treasury OG] error fetching snapshot:", error);
    return null;
  }
}

async function getBaseUrl() {
  const h = await headers();
  const protocol = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) {
    throw new Error("Unable to determine request host");
  }
  return `${protocol}://${host}`;
}

async function fetchJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isPt = locale === "pt-br";

  let treasuryData: Awaited<ReturnType<typeof fetchTreasurySnapshot>>;
  try {
    treasuryData = await fetchTreasurySnapshot();
  } catch (error) {
    console.error("[treasury OG] error:", error);
    return renderFallback(isPt ? "Erro ao gerar imagem" : "Error generating image");
  }

  if (!treasuryData) {
    return renderFallback(isPt ? "Dados do Tesouro Indisponíveis" : "Treasury Data Unavailable");
  }

  const ethBalance = treasuryData.ethBalance;
  const usdTotal = formatUsdDisplay(treasuryData.usdTotal);
  const labels = {
    title: isPt ? "TESOURO" : "TREASURY",
    subtitle: isPt ? "Visão Geral Financeira da Gnars DAO" : "Gnars DAO Financial Overview",
    ethBalance: isPt ? "Saldo de ETH" : "ETH Balance",
    ethereum: "Ethereum",
    totalValue: isPt ? "Valor Total" : "Total Value",
    usdTreasuryValue: isPt ? "Valor do Tesouro em USD" : "USD Treasury Value",
  };
  const footerPath = isPt ? "gnars.com/pt-br/treasury" : "gnars.com/treasury";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: OG_COLORS.background,
          fontFamily: OG_FONTS.family,
          padding: "60px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginBottom: "64px",
          }}
        >
          <div style={{ fontSize: 48, fontWeight: 700, color: OG_COLORS.foreground }}>
            {labels.title}
          </div>
          <div style={{ fontSize: 28, color: OG_COLORS.muted, marginTop: "8px" }}>
            {labels.subtitle}
          </div>
        </div>

        {/* Stats Grid */}
        <div
          style={{
            display: "flex",
            gap: "32px",
            flex: 1,
          }}
        >
          {/* ETH Balance */}
          <div
            style={{
              flex: 1,
              backgroundColor: OG_COLORS.card,
              borderRadius: "16px",
              border: `2px solid ${OG_COLORS.cardBorder}`,
              padding: "40px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div style={{ fontSize: 24, color: OG_COLORS.muted, marginBottom: "16px" }}>
              {labels.ethBalance}
            </div>
            <div style={{ fontSize: 64, fontWeight: 700, color: OG_COLORS.accent }}>
              {ethBalance}
            </div>
            <div style={{ fontSize: 18, color: OG_COLORS.mutedLight, marginTop: "16px" }}>
              {labels.ethereum}
            </div>
          </div>

          {/* Total Treasury Value */}
          <div
            style={{
              flex: 1,
              backgroundColor: OG_COLORS.card,
              borderRadius: "16px",
              border: `2px solid ${OG_COLORS.cardBorder}`,
              padding: "40px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div style={{ fontSize: 24, color: OG_COLORS.muted, marginBottom: "16px" }}>
              {labels.totalValue}
            </div>
            <div style={{ fontSize: 64, fontWeight: 700, color: OG_COLORS.blue }}>{usdTotal}</div>
            <div style={{ fontSize: 18, color: OG_COLORS.mutedLight, marginTop: "16px" }}>
              {labels.usdTreasuryValue}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "auto",
            paddingTop: "32px",
            fontSize: 20,
            color: OG_COLORS.muted,
          }}
        >
          <div>Gnars DAO</div>
          <div>{footerPath}</div>
        </div>
      </div>
    ),
    { ...size },
  );
}

function renderFallback(message: string) {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: OG_COLORS.background,
          fontFamily: OG_FONTS.family,
          flexDirection: "column",
        }}
      >
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: OG_COLORS.foreground,
            marginBottom: "12px",
            display: "flex",
          }}
        >
          Gnars DAO
        </div>
        <div style={{ fontSize: 40, color: OG_COLORS.mutedLight, textAlign: "center" }}>
          {message}
        </div>
      </div>
    ),
    { ...size },
  );
}
