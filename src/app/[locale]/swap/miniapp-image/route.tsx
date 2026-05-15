import { ImageResponse } from "next/og";
import { MINIAPP_SIZE, OG_COLORS, OG_FONTS } from "@/lib/og-utils";

export const alt = "Swap on Gnars";
export const size = MINIAPP_SIZE;
export const contentType = "image/png";
export const runtime = "edge";

export async function GET() {
  const logoUrl =
    "https://wsrv.nl/?url=https%3A%2F%2Fgnars.com%2Fgnars.webp&w=180&h=180&fit=cover&output=png";

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
          padding: "80px",
          position: "relative",
        }}
      >
        {/* Eyebrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: OG_COLORS.muted,
            marginBottom: "40px",
          }}
        >
          <span>Swap</span>
          <span style={{ color: OG_COLORS.cardBorder }}>·</span>
          <span
            style={{
              backgroundColor: "#132044",
              color: "#5b9cf6",
              padding: "6px 14px",
              borderRadius: "6px",
              fontSize: 18,
              letterSpacing: "0.04em",
            }}
          >
            BASE
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            marginBottom: "auto",
          }}
        >
          <div
            style={{
              fontSize: 124,
              fontWeight: 100,
              color: OG_COLORS.foreground,
              letterSpacing: "-5px",
              lineHeight: 1,
            }}
          >
            ETH → GNARS
          </div>
          <div
            style={{
              fontSize: 32,
              color: OG_COLORS.muted,
              maxWidth: "920px",
              lineHeight: 1.3,
              marginTop: "12px",
            }}
          >
            Best price across 150+ DEXes. 0.5% supports the Gnars Collective Treasury.
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: "24px",
            borderTop: `1px solid ${OG_COLORS.cardBorder}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt="Gnars"
              width={56}
              height={56}
              style={{ width: 56, height: 56, objectFit: "cover" }}
            />
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: OG_COLORS.foreground,
              }}
            >
              gnars.com / swap
            </div>
          </div>
          <div
            style={{
              fontSize: 20,
              color: OG_COLORS.muted,
              letterSpacing: "0.04em",
            }}
          >
            Powered by 0x
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
