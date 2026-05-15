import { ImageResponse } from "next/og";
import { OG_COLORS, OG_FONTS, OG_SIZE } from "@/lib/og-utils";

export const alt = "Gnars Live Feed";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const heading = locale === "pt-br" ? "Feed ao Vivo" : "Live Feed";
  const subheading =
    locale === "pt-br" ? "Atividade da DAO em Tempo Real" : "Real-Time DAO Activity";

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
          {heading}
        </div>
        <div
          style={{
            marginTop: 20,
            fontSize: 34,
            color: OG_COLORS.mutedLight,
            textAlign: "center",
          }}
        >
          {subheading}
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
          gnars.com/feed
        </div>
      </div>
    ),
    { ...size },
  );
}
