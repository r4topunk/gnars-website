import { ImageResponse } from "next/og";
import { OG_COLORS, OG_FONTS, OG_SIZE } from "@/lib/og-utils";

export const alt = "Gnar TV";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
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
        <div
          style={{
            fontSize: 80,
            fontWeight: 800,
            color: OG_COLORS.foreground,
            letterSpacing: "-0.02em",
          }}
        >
          Gnar TV
        </div>
        <div
          style={{
            marginTop: 20,
            fontSize: 34,
            color: OG_COLORS.mutedLight,
            textAlign: "center",
          }}
        >
          Creator Coins Feed
        </div>
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            right: "60px",
            fontSize: 24,
            color: OG_COLORS.muted,
          }}
        >
          gnars.com/tv
        </div>
      </div>
    ),
    { ...size }
  );
}

