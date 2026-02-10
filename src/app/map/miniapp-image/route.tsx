import { ImageResponse } from "next/og";
import { MINIAPP_SIZE } from "@/lib/og-utils";

export const runtime = "edge";
export const alt = "Gnars World Map - Global Skate Spots";
export const size = MINIAPP_SIZE;
export const contentType = "image/png";

// Location coordinates for the map markers
const locations = [
  { position: [-22.903044816157887, -43.17337963607664], label: "Praca XV" },
  { position: [33.81427083205093, -118.21369178292444], label: "Silverado" },
  { position: [-22.891659522582522, -43.192417292690315], label: "Aquario" },
  { position: [41.965330396404994, -87.6638363963253], label: "Chicago" },
  { position: [-30.017866183250845, -51.17985537072372], label: "Iapi" },
  { position: [9.082, 8.6753], label: "Kenya" },
  { position: [-23.4990518351234, -46.624191393782525], label: "Sopa de Letras" },
  { position: [-20.24901180535837, -42.029355475124554], label: "Manhuaçu" },
  { position: [42.737274371776024, 140.9109422458354], label: "Rusutsu Resort" },
  { position: [6.243173184580065, -75.5966651104881], label: "Medellin" },
  { position: [51.52064675412003, -0.20505440289551358], label: "London" },
  { position: [-34.584183310926065, -58.39040299272954], label: "Argentina" },
  { position: [45.4836, 9.1924], label: "Italy" },
  { position: [33.71824554962641, -117.84727040288683], label: "OC Ramp" },
  { position: [-23.594602, -48.052915], label: "Itapetininga" },
];

// Convert lat/lng to x/y coordinates on the image
function latLngToXY(lat: number, lng: number, width: number, height: number) {
  // Simple equirectangular projection
  const x = ((lng + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return { x, y };
}

// Simple dot marker (avoid brand-specific icons in OG images).
function MarkerDot({ x, y, isGreen = false }: { x: number; y: number; isGreen?: boolean }) {
  const color = isGreen ? "#22c55e" : "#ef4444";
  return (
    <div
      style={{
        position: "absolute",
        left: x - 7,
        top: y - 7,
        width: 14,
        height: 14,
        display: "flex",
        borderRadius: 999,
        backgroundColor: color,
        border: "2px solid rgba(255,255,255,0.9)",
      }}
    />
  );
}

export async function GET() {
  const mapInsetX = 40;
  const mapInsetY = 60;
  const mapWidth = size.width - mapInsetX * 2;
  const mapHeight = size.height - mapInsetY * 2;

  // Calculate marker positions
  const markers = locations.map((loc, index) => {
    const { x, y } = latLngToXY(loc.position[0], loc.position[1], mapWidth, mapHeight);
    // Make some markers green (like the Brazil cluster in the screenshot)
    const isGreen = loc.label === "Aquario" || loc.label === "Sopa de Letras";
    return { x: x + mapInsetX, y: y + mapInsetY, label: loc.label, isGreen, index };
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: "#1a1a1a",
        }}
      >
        {/* Dark world map background using CARTO dark tiles style approximation */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "#1a1a1a",
            display: "flex",
          }}
        >
          {/* Simplified world map SVG outline */}
          <svg
            width={mapWidth}
            height={mapHeight}
            viewBox={`0 0 ${mapWidth} ${mapHeight}`}
            style={{
              position: "absolute",
              left: mapInsetX,
              top: mapInsetY,
            }}
          >
            {/* Ocean background */}
            <rect width="100%" height="100%" fill="#1a1a1a" />

            {/* Simplified continent shapes - approximated for dark theme */}
            {/* North America */}
            <path
              d="M 50 100 Q 100 80 200 90 Q 250 100 280 150 Q 290 200 250 250 Q 200 300 150 280 Q 100 250 80 200 Q 60 150 50 100"
              fill="#2a2a2a"
              stroke="#3a3a3a"
              strokeWidth="1"
            />
            {/* South America */}
            <path
              d="M 200 320 Q 250 300 280 350 Q 300 420 280 500 Q 250 550 220 530 Q 180 480 190 400 Q 195 350 200 320"
              fill="#2a2a2a"
              stroke="#3a3a3a"
              strokeWidth="1"
            />
            {/* Europe */}
            <path
              d="M 500 80 Q 550 70 600 90 Q 650 120 640 160 Q 600 180 550 170 Q 510 150 500 110 Z"
              fill="#2a2a2a"
              stroke="#3a3a3a"
              strokeWidth="1"
            />
            {/* Africa */}
            <path
              d="M 520 200 Q 580 180 640 220 Q 680 280 660 380 Q 620 450 560 440 Q 500 400 490 320 Q 485 250 520 200"
              fill="#2a2a2a"
              stroke="#3a3a3a"
              strokeWidth="1"
            />
            {/* Asia */}
            <path
              d="M 650 80 Q 750 60 900 80 Q 1000 100 1050 150 Q 1100 200 1080 280 Q 1000 320 900 300 Q 800 280 700 200 Q 660 140 650 80"
              fill="#2a2a2a"
              stroke="#3a3a3a"
              strokeWidth="1"
            />
            {/* Australia */}
            <path
              d="M 950 380 Q 1020 360 1080 400 Q 1100 450 1060 500 Q 1000 520 950 480 Q 920 430 950 380"
              fill="#2a2a2a"
              stroke="#3a3a3a"
              strokeWidth="1"
            />

            {/* Grid lines for map feel */}
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <line
                key={`h-${i}`}
                x1="0"
                y1={i * (mapHeight / 5)}
                x2={mapWidth}
                y2={i * (mapHeight / 5)}
                stroke="#333"
                strokeWidth="0.5"
                opacity="0.3"
              />
            ))}
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <line
                key={`v-${i}`}
                x1={i * (mapWidth / 10)}
                y1="0"
                x2={i * (mapWidth / 10)}
                y2={mapHeight}
                stroke="#333"
                strokeWidth="0.5"
                opacity="0.3"
              />
            ))}
          </svg>
        </div>

        {/* Render markers */}
        {markers.map((marker) => (
          <MarkerDot key={marker.index} x={marker.x} y={marker.y} isGreen={marker.isGreen} />
        ))}

        {/* Title overlay */}
        <div
          style={{
            position: "absolute",
            bottom: 48,
            left: 60,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: "#fff",
              display: "flex",
            }}
          >
            Gnars World Map
          </div>
          <div
            style={{
              fontSize: 20,
              color: "#888",
              display: "flex",
            }}
          >
            {locations.length} Skate Spots Funded by Gnars DAO
          </div>
        </div>

        {/* Gnars logo/branding */}
        <div
          style={{
            position: "absolute",
            top: 48,
            right: 60,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              backgroundColor: "#22c55e",
              display: "flex",
            }}
          />
          <div
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: "#fff",
              display: "flex",
            }}
          >
            gnars.com/map
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
