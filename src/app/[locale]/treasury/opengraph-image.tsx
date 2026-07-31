import { ImageResponse } from "next/og";
import { DAO_ADDRESSES } from "@/lib/config";
import { formatEthDisplay, formatUsdDisplay, OG_COLORS, OG_FONTS, OG_SIZE } from "@/lib/og-utils";
import { loadTreasurySnapshot } from "@/services/treasury";

export const alt = "Gnars DAO Treasury";
export const size = OG_SIZE;
export const contentType = "image/png";
// Route is dynamic (reads request headers to build its API base URL), so it
// can't be ISR-cached. Instead the rendered PNG is cached at the Vercel CDN via
// the Cache-Control header on each ImageResponse below — repeat crawler hits are
// served from the edge with zero function CPU. Keeps us under Hobby CPU/transfer.
const OG_CACHE_CONTROL = "public, max-age=0, s-maxage=1800, stale-while-revalidate=3600";

async function fetchTreasurySnapshot(): Promise<{
  ethBalance: string;
  usdTotal: number | null;
} | null> {
  // Delegates to the same service the treasury page uses. This function used to
  // re-implement the whole balance+price computation and reach it over HTTP via
  // the app's own /api/alchemy, /api/prices and /api/eth-price — two copies of
  // financial logic that could disagree, plus four self-requests per render.
  try {
    const snapshot = await loadTreasurySnapshot(DAO_ADDRESSES.treasury);
    return {
      ethBalance: formatEthDisplay(snapshot.ethBalance),
      usdTotal: snapshot.usdTotal,
    };
  } catch (error) {
    console.error("[treasury OG] error fetching snapshot:", error);
    return null;
  }
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
  // An unpriced treasury renders as a dash, never as "$0".
  const usdTotal = treasuryData.usdTotal == null ? "—" : formatUsdDisplay(treasuryData.usdTotal);
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
    { ...size, headers: { "Cache-Control": OG_CACHE_CONTROL } },
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
    { ...size, headers: { "Cache-Control": OG_CACHE_CONTROL } },
  );
}
