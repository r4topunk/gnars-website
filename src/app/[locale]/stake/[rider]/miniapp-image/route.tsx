import { ImageResponse } from "next/og";
import { MINIAPP_SIZE } from "@/lib/og-utils";
import stakeMessages from "../../../../../../messages/en/stake.json";

// Per-rider Farcaster mini app / OG image: the skater's cutout body dropped into
// a fighting-game "character select" scene — a warm gold spotlight, floor glow
// and ground shadow — matching the /stake arcade palette (#f7c948 on warm black).

export const runtime = "edge";
export const alt = "Back this rider — Gnars sponsorship vault";
export const size = MINIAPP_SIZE; // 1200 x 800 (3:2, Farcaster embed spec)
export const contentType = "image/png";

const CHARACTERS = stakeMessages.characters as Record<
  string,
  { name: string; tagline: string }
>;

const GOLD = "#f7c948";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ locale: string; rider: string }> },
) {
  const { rider } = await params;
  const char = CHARACTERS[rider];
  const name = char?.name ?? "Gnars";
  const tagline = char?.tagline ?? "Back a rider. Only the yield is shared.";

  const origin = new URL(request.url).origin;
  const cutoutUrl = `${origin}/stake/cutout/${rider}.png`;

  // Scale the name down as it gets longer so it never wraps out of the column.
  const nameSize = name.length <= 5 ? 132 : name.length <= 7 ? 108 : 88;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          backgroundColor: "#0b0906",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Background: warm diagonal + a gold spotlight behind the rider */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            backgroundImage:
              "radial-gradient(900px 760px at 74% 52%, rgba(247,201,72,0.30), rgba(247,201,72,0.07) 42%, rgba(11,9,6,0) 70%), linear-gradient(120deg, #0b0906 0%, #140d06 46%, #0a0a12 100%)",
          }}
        />

        {/* Floor light band */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 200,
            display: "flex",
            backgroundImage:
              "linear-gradient(to top, rgba(247,201,72,0.16), rgba(247,201,72,0) 100%)",
          }}
        />

        {/* Left column: title, tagline, CTA */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            width: 640,
            padding: "72px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: GOLD,
              marginBottom: 18,
            }}
          >
            Gnars · Sponsorship Vault
          </div>

          <div
            style={{
              display: "flex",
              fontSize: nameSize,
              fontWeight: 800,
              lineHeight: 1,
              color: "#ffffff",
            }}
          >
            {name}
          </div>

          {/* accent bar */}
          <div
            style={{
              display: "flex",
              width: 104,
              height: 10,
              backgroundColor: GOLD,
              borderRadius: 6,
              marginTop: 24,
              marginBottom: 24,
            }}
          />

          <div
            style={{
              display: "flex",
              fontSize: 34,
              lineHeight: 1.25,
              color: "#e7e0cf",
              maxWidth: 500,
            }}
          >
            {tagline}
          </div>

          <div style={{ display: "flex", alignItems: "center", marginTop: 44 }}>
            <div
              style={{
                display: "flex",
                backgroundColor: GOLD,
                color: "#12100a",
                fontSize: 30,
                fontWeight: 800,
                letterSpacing: 1,
                padding: "16px 30px",
                borderRadius: 14,
              }}
            >
              STAKE OR DIE
            </div>
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 24,
              fontSize: 24,
              color: "#8a8578",
            }}
          >
            gnars.com/stake/{rider}
          </div>
        </div>

        {/* Right column: the skater cutout in the spotlight */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flex: 1,
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          {/* spotlight halo */}
          <div
            style={{
              position: "absolute",
              top: 70,
              display: "flex",
              width: 560,
              height: 560,
              borderRadius: 9999,
              backgroundImage:
                "radial-gradient(closest-side, rgba(247,201,72,0.34), rgba(247,201,72,0) 100%)",
            }}
          />
          {/* ground shadow */}
          <div
            style={{
              position: "absolute",
              bottom: 44,
              display: "flex",
              width: 440,
              height: 70,
              borderRadius: 9999,
              backgroundImage:
                "radial-gradient(closest-side, rgba(0,0,0,0.55), rgba(0,0,0,0) 100%)",
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cutoutUrl}
            alt={name}
            height={772}
            style={{ height: 772, objectFit: "contain" }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
