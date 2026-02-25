import { ImageResponse } from "next/og";
import { getProposalByIdOrNumber } from "@/services/proposals";
import {
  OG_SIZE,
  OG_COLORS,
  OG_FONTS,
  formatVotes,
  getStatusColor,
  shortenAddress,
  truncateText,
} from "@/lib/og-utils";

export const alt = "Gnars DAO Proposal";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 60;

interface Props {
  params: Promise<{ id: string }>;
}

export default async function Image({ params }: Props) {
  const { id } = await params;

  try {
    const proposal = await getProposalByIdOrNumber(id);

    if (!proposal) {
      return renderFallback("Proposal Not Found");
    }

    const status = proposal.status || "Unknown";
    const statusColor = getStatusColor(status);
    const totalVotes =
      Number(proposal.forVotes ?? 0) +
      Number(proposal.againstVotes ?? 0) +
      Number(proposal.abstainVotes ?? 0);
    const quorumVotes = Number(proposal.quorumVotes ?? 0);
    const quorumPercent =
      Number.isFinite(quorumVotes) && quorumVotes > 0
        ? Math.round((totalVotes / quorumVotes) * 100)
        : 0;
    const proposerLabel = shortenAddress(proposal.proposer ?? "");

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
          <div style={{ display: "flex", alignItems: "baseline", gap: "24px", marginBottom: "32px" }}>
            <div
              style={{
                fontSize: 48,
                fontWeight: 700,
                color: OG_COLORS.foreground,
                display: "flex",
              }}
            >
              {`Proposal #${proposal.proposalNumber}`}
            </div>
            <div
              style={{
                fontSize: 20,
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

          {/* Title */}
          <div
            style={{
              fontSize: 36,
              fontWeight: 600,
              color: OG_COLORS.foreground,
              marginBottom: "40px",
              maxWidth: "100%",
              lineHeight: 1.3,
            }}
          >
            {truncateText(proposal.title, 80)}
          </div>

          {/* Vote Grid */}
          <div
            style={{
              display: "flex",
              gap: "24px",
              flex: 1,
              marginBottom: "40px",
            }}
          >
            {/* FOR Votes */}
            <div
              style={{
                flex: 1,
                backgroundColor: OG_COLORS.card,
                borderRadius: "16px",
                border: `2px solid ${OG_COLORS.accent}`,
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div style={{ fontSize: 22, color: OG_COLORS.muted, marginBottom: "16px" }}>
                FOR
              </div>
              <div style={{ fontSize: 48, fontWeight: 700, color: OG_COLORS.accent }}>
                {formatVotes(proposal.forVotes)}
              </div>
            </div>

            {/* AGAINST Votes */}
            <div
              style={{
                flex: 1,
                backgroundColor: OG_COLORS.card,
                borderRadius: "16px",
                border: `2px solid ${OG_COLORS.destructive}`,
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div style={{ fontSize: 22, color: OG_COLORS.muted, marginBottom: "16px" }}>
                AGAINST
              </div>
              <div style={{ fontSize: 48, fontWeight: 700, color: OG_COLORS.destructive }}>
                {formatVotes(proposal.againstVotes)}
              </div>
            </div>

            {/* ABSTAIN Votes */}
            <div
              style={{
                flex: 1,
                backgroundColor: OG_COLORS.card,
                borderRadius: "16px",
                border: `2px solid ${OG_COLORS.blue}`,
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div style={{ fontSize: 22, color: OG_COLORS.muted, marginBottom: "16px" }}>
                ABSTAIN
              </div>
              <div style={{ fontSize: 48, fontWeight: 700, color: OG_COLORS.blue }}>
                {formatVotes(proposal.abstainVotes)}
              </div>
            </div>
          </div>

          {/* Proposer and Quorum */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "32px",
              fontSize: 18,
              color: OG_COLORS.muted,
            }}
          >
            <div style={{ display: "flex" }}>
              {`Proposer: ${proposerLabel}`}
            </div>
            <div style={{ display: "flex" }}>{`Quorum: ${quorumPercent}%`}</div>
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
            <div>gnars.com/proposals</div>
          </div>
        </div>
      ),
      { ...size }
    );
  } catch (error) {
    console.error("[proposals OG] error:", error);
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
          padding: "60px",
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
