import { ImageResponse } from "next/og";
import { headers } from "next/headers";
import { isAddress } from "viem";

export const alt = "Gnars DAO Member";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

interface Props {
  params: Promise<{ address: string }>;
}

export default async function Image({ params }: Props) {
  const { address } = await params;
  const isValidAddress = isAddress(address);

  try {
    // Fetch member data from API route to avoid edge runtime issues
    const baseUrl =
      (await getOriginFromHeaders()) || process.env.NEXT_PUBLIC_SITE_URL || "https://gnars.com";
    const response = await fetch(`${baseUrl}/api/member-og-data/${address}`, {
      cache: "no-store",
    });

    let data = {
      displayName: isValidAddress ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Invalid Address",
      avatar: null,
      tokenCount: 0,
      delegatorCount: 0,
      voteCount: 0,
      creatorCoin: null,
    };

    if (response.ok) {
      data = await response.json();
    }

    const { displayName, avatar, tokenCount, delegatorCount, voteCount, creatorCoin } = data;
    const addressLabel = isValidAddress
      ? `${address.slice(0, 8)}...${address.slice(-6)}`
      : truncateLabel(address, 28);

    // Format helpers
    const formatMarketCap = (marketCap: string | undefined): string => {
      if (!marketCap) return "—";
      const num = parseFloat(marketCap);
      if (isNaN(num)) return "—";
      if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
      if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
      if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
      return `$${num.toFixed(2)}`;
    };

    const formatPercentChange = (delta: string | undefined): { text: string; color: string } => {
      if (!delta) return { text: "—", color: "#888" };
      const num = parseFloat(delta);
      if (isNaN(num)) return { text: "—", color: "#888" };
      const sign = num >= 0 ? "+" : "";
      const color = num >= 0 ? "#10b981" : "#ef4444";
      return { text: `${sign}${num.toFixed(2)}% 24h`, color };
    };

    const coin = creatorCoin as { marketCap?: string; marketCapDelta24h?: string } | null;
    const marketCapFormatted = formatMarketCap(coin?.marketCap);
    const deltaFormatted = formatPercentChange(coin?.marketCapDelta24h);

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#000",
            padding: "60px",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          {/* Header with avatar and name */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "48px",
            }}
          >
            {avatar && (
              <img
                src={avatar}
                alt={displayName}
                width={120}
                height={120}
                style={{
                  borderRadius: "60px",
                  marginRight: "32px",
                  border: "4px solid #333",
                }}
              />
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  fontSize: 56,
                  fontWeight: 700,
                  color: "#fff",
                  marginBottom: "8px",
                }}
              >
                {displayName}
              </div>
              <div style={{ display: "flex", fontSize: 28, color: "#888" }}>
                {addressLabel}
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div
            style={{
              display: "flex",
              gap: "24px",
              flex: 1,
            }}
          >
            {/* Gnars Held */}
            <div
              style={{
                flex: 1,
                backgroundColor: "#111",
                borderRadius: "16px",
                border: "2px solid #222",
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", fontSize: 24, color: "#888", marginBottom: "16px" }}>
                Gnars Held
              </div>
              <div style={{ display: "flex", fontSize: 72, fontWeight: 700, color: "#fff" }}>
                {tokenCount}
              </div>
            </div>

            {/* Delegation */}
            <div
              style={{
                flex: 1,
                backgroundColor: "#111",
                borderRadius: "16px",
                border: "2px solid #222",
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", fontSize: 24, color: "#888", marginBottom: "24px" }}>
                Delegation
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", fontSize: 22, color: "#aaa" }}>Delegates to</div>
                  <div style={{ display: "flex", fontSize: 22, color: "#fff", fontWeight: 600 }}>
                    Self
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", fontSize: 22, color: "#aaa" }}>Delegated by</div>
                  <div style={{ display: "flex", fontSize: 22, color: "#fff", fontWeight: 600 }}>
                    {delegatorCount}
                  </div>
                </div>
              </div>
            </div>

            {/* Activity */}
            <div
              style={{
                flex: 1,
                backgroundColor: "#111",
                borderRadius: "16px",
                border: "2px solid #222",
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", fontSize: 24, color: "#888", marginBottom: "24px" }}>
                Activity
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", fontSize: 22, color: "#aaa" }}>Votes</div>
                  <div style={{ display: "flex", fontSize: 22, color: "#fff", fontWeight: 600 }}>
                    {voteCount}
                  </div>
                </div>
              </div>
            </div>

            {/* Creator Coin */}
            {creatorCoin && (
              <div
                style={{
                  flex: 1,
                  backgroundColor: "#111",
                  borderRadius: "16px",
                  border: "2px solid #fbbf24",
                  padding: "32px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ display: "flex", fontSize: 24, color: "#888" }}>Creator Coin</div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: 14,
                      color: "#fbbf24",
                      backgroundColor: "#fbbf2420",
                      padding: "4px 12px",
                      borderRadius: "8px",
                      fontWeight: 600,
                    }}
                  >
                    ZORA
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", fontSize: 48, fontWeight: 700, color: "#fff" }}>
                    {marketCapFormatted}
                  </div>
                  <div style={{ display: "flex", fontSize: 18, color: deltaFormatted.color }}>
                    {deltaFormatted.text}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "48px",
            }}
          >
            <div style={{ fontSize: 24, color: "#666" }}>Gnars DAO</div>
            <div style={{ fontSize: 20, color: "#666" }}>gnars.com</div>
          </div>
        </div>
      ),
      {
        ...size,
      },
    );
  } catch (error) {
    console.error("Error generating OG image:", error);
    // Return a fallback image
    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#000",
            color: "#fff",
            fontSize: 48,
            fontFamily: "system-ui",
          }}
        >
          Gnars DAO Member
        </div>
      ),
      { ...size },
    );
  }
}

async function getOriginFromHeaders(): Promise<string | null> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return null;

  const proto =
    h.get("x-forwarded-proto") ??
    (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

function truncateLabel(value: string, max: number): string {
  if (value.length <= max) return value;
  const head = Math.max(1, Math.floor((max - 3) * 0.6));
  const tail = Math.max(1, max - 3 - head);
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}
