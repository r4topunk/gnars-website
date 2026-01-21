import { ImageResponse } from "next/og";
import { DAO_DESCRIPTION } from "@/lib/config";
import { MINIAPP_SIZE, OG_COLORS, OG_FONTS } from "@/lib/og-utils";

export const alt = "Gnars DAO";
export const size = MINIAPP_SIZE;
export const contentType = "image/png";

export default function Image() {
  const logoUrl =
    "https://wsrv.nl/?url=https%3A%2F%2Fgnars.com%2Fgnars.webp&w=200&h=200&fit=cover&output=png";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: OG_COLORS.background,
          fontFamily: OG_FONTS.family,
          padding: "60px",
        }}
      >
        <img
          src={logoUrl}
          alt="Gnars logo"
          width={200}
          height={200}
          style={{
            width: 200,
            height: 200,
            marginBottom: "32px",
            objectFit: "cover",
            backgroundColor: OG_COLORS.card,
          }}
        />

        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: OG_COLORS.foreground,
            marginBottom: "16px",
          }}
        >
          Gnars DAO
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            color: OG_COLORS.muted,
            textAlign: "center",
          }}
        >
          {DAO_DESCRIPTION}
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            right: "60px",
            fontSize: 24,
            color: OG_COLORS.muted,
          }}
        >
          gnars.com
        </div>
      </div>
    ),
    { ...size }
  );
}
