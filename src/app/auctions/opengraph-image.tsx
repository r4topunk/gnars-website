import { ImageResponse } from "next/og";
import { formatEther } from "viem";
import { GNARS_ADDRESSES } from "@/lib/config";
import { subgraphQuery } from "@/lib/subgraph";
import { toOgImageUrl } from "@/lib/og-images";
import { OG_SIZE, OG_COLORS, OG_FONTS, formatEthDisplay } from "@/lib/og-utils";

export const alt = "Gnars DAO Auctions";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 60;
export const dynamic = "force-dynamic";

type AuctionData = {
  token: { tokenId: string; image: string };
  highestBid: { amount: string };
  endTime: string;
  settled: boolean;
};

type AuctionQuery = {
  auctions: AuctionData[];
};

const LATEST_AUCTION_GQL = /* GraphQL */ `
  query LatestAuction($dao: ID!) {
    auctions(where: { dao: $dao }, orderBy: endTime, orderDirection: desc, first: 1) {
      token {
        tokenId
        image
      }
      highestBid {
        amount
      }
      endTime
      settled
    }
  }
`;

async function fetchLatestAuction(): Promise<AuctionData | null> {
  try {
    const data = await subgraphQuery<AuctionQuery>(LATEST_AUCTION_GQL, {
      dao: GNARS_ADDRESSES.token.toLowerCase(),
    });

    return data.auctions?.[0] ?? null;
  } catch (error) {
    console.error("[auctions OG] error fetching latest auction:", error);
    return null;
  }
}

export default async function Image() {
  try {
    const auction = await fetchLatestAuction();

    if (!auction) {
      return renderFallback("No Auctions Found");
    }

    const tokenId = auction.token.tokenId;
    const bidAmount = auction.highestBid?.amount ?? "0";
    const bidEth = formatEthDisplay(formatEther(BigInt(bidAmount)));
    const imageWidth = 520;
    const imageHeight = 510;
    const imageUrl = toOgImageUrl(auction.token.image, {
      width: imageWidth,
      height: imageHeight,
      fit: "cover",
    });
    const isSettled = auction.settled;
    const status = isSettled ? "Ended" : "Active";
    const statusColor = isSettled ? OG_COLORS.muted : OG_COLORS.accent;

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            backgroundColor: OG_COLORS.background,
            fontFamily: OG_FONTS.family,
            padding: "60px",
          }}
        >
          {/* Left side: Token Image */}
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "48px",
            }}
          >
            {imageUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <img
                src={imageUrl}
                width={imageWidth}
                height={imageHeight}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "16px",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundColor: OG_COLORS.card,
                  borderRadius: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 48,
                  fontWeight: 700,
                  color: OG_COLORS.muted,
                }}
              >
                NO IMAGE
              </div>
            )}
          </div>

          {/* Right side: Auction Info */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: "32px",
            }}
          >
            {/* Title */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <div style={{ fontSize: 28, color: OG_COLORS.muted }}>AUCTIONS</div>
              <div style={{ fontSize: 36, color: OG_COLORS.mutedLight }}>
                Gnars DAO NFT Auctions
              </div>
            </div>

            {/* Status and Current Auction */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 22,
                  color: OG_COLORS.muted,
                }}
              >
                <div>Current Auction</div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: statusColor,
                    backgroundColor: `${statusColor}20`,
                    padding: "8px 16px",
                    borderRadius: "8px",
                  }}
                >
                  {status}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  fontSize: 20,
                  color: OG_COLORS.mutedLight,
                }}
              >
                <div>Gnar</div>
                <div style={{ fontSize: 48, fontWeight: 700, color: OG_COLORS.foreground }}>
                  {`#${tokenId}`}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  fontSize: 20,
                  color: OG_COLORS.mutedLight,
                }}
              >
                <div>Highest Bid</div>
                <div style={{ fontSize: 48, fontWeight: 700, color: OG_COLORS.accent }}>
                  {`${bidEth} ETH`}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                fontSize: 16,
                color: OG_COLORS.muted,
                marginTop: "auto",
              }}
            >
              gnars.com/auctions
            </div>
          </div>
        </div>
      ),
      { ...size }
    );
  } catch (error) {
    console.error("[auctions OG] error:", error);
    return renderFallback("Error generating image");
  }
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
    { ...size }
  );
}
