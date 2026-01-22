import { ImageResponse } from "next/og";
import { formatEther } from "viem";
import { GNARS_ADDRESSES } from "@/lib/config";
import { decodeDroposalParams, isDroposal } from "@/lib/droposal-utils";
import { subgraphQuery } from "@/lib/subgraph";
import { toOgImageUrl } from "@/lib/og-images";
import { MINIAPP_SIZE, OG_COLORS, OG_FONTS, formatEthDisplay, truncateText } from "@/lib/og-utils";
import { NogglesIcon } from "@/lib/og-brand";

export const alt = "Gnars DAO Droposal";
export const size = MINIAPP_SIZE;
export const contentType = "image/png";
export const revalidate = 300;
export const runtime = "edge";

interface Props {
  params: { id: string };
}

type ProposalData = {
  proposalId: string;
  proposalNumber: number;
  title?: string | null;
  description?: string | null;
  calldatas?: string | null;
  targets: string[];
  timeCreated: string;
  executedAt?: string | null;
  executionTransactionHash?: string | null;
  transactionHash?: string | null;
};

const PROPOSAL_GQL = /* GraphQL */ `
  query OneProposal($id: ID!) {
    proposal(id: $id) {
      proposalId
      proposalNumber
      title
      description
      calldatas
      targets
      timeCreated
      executedAt
      executionTransactionHash
      transactionHash
    }
  }
`;

const PROPOSALS_BY_NUMBER_GQL = /* GraphQL */ `
  query ProposalByNumber($dao: ID!, $proposalNumber: Int!) {
    proposals(where: { dao: $dao, proposalNumber: $proposalNumber }, first: 1) {
      proposalId
      proposalNumber
      title
      description
      calldatas
      targets
      timeCreated
      executedAt
      executionTransactionHash
      transactionHash
    }
  }
`;

async function fetchDroposal(id: string): Promise<{
  proposal: ProposalData | null;
  decoded: ReturnType<typeof decodeDroposalParams> | null;
}> {
  let proposal: ProposalData | null = null;

  if (id.startsWith("0x")) {
    const byId = await subgraphQuery<{ proposal: ProposalData | null }>(PROPOSAL_GQL, { id });
    proposal = byId.proposal;
  } else {
    const num = Number.parseInt(id, 10);
    if (!Number.isNaN(num)) {
      const byNumber = await subgraphQuery<{ proposals: ProposalData[] }>(PROPOSALS_BY_NUMBER_GQL, {
        dao: GNARS_ADDRESSES.token.toLowerCase(),
        proposalNumber: num,
      });
      proposal = byNumber.proposals?.[0] ?? null;
    }
  }

  if (!proposal) {
    return { proposal: null, decoded: null };
  }

  const calldatasRaw = proposal.calldatas;
  const calldatas = Array.isArray(calldatasRaw)
    ? (calldatasRaw as unknown as string[])
    : typeof calldatasRaw === "string"
      ? calldatasRaw.split(":")
      : [];

  let decoded: ReturnType<typeof decodeDroposalParams> | null = null;
  for (let i = 0; i < proposal.targets.length; i += 1) {
    if (isDroposal(proposal.targets[i], calldatas[i])) {
      decoded = calldatas[i] ? decodeDroposalParams(calldatas[i]!) : null;
      break;
    }
  }

  return { proposal, decoded };
}

export async function GET(_request: Request, { params }: Props) {
  const { id } = params;

  try {
    const { proposal, decoded } = await fetchDroposal(id);

    if (!proposal) {
      return renderFallback("Droposal Not Found");
    }

    const title = decoded?.name || proposal.title || `Droposal #${proposal.proposalNumber}`;
    const imageWidth = 560;
    const imageHeight = 600;
    const imageUrl = toOgImageUrl(decoded?.imageURI ?? null, {
      width: imageWidth,
      height: imageHeight,
      fit: "cover",
    });
    const priceEth = decoded?.saleConfig?.publicSalePrice
      ? formatEthDisplay(formatEther(decoded.saleConfig.publicSalePrice))
      : "Free";
    const editionSize = decoded?.editionSize || "Unlimited";
    const description = decoded?.collectionDescription || proposal.description || "NFT Drop";

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            backgroundColor: OG_COLORS.background,
            fontFamily: OG_FONTS.family,
            padding: "80px",
          }}
        >
          {/* Left side: Image */}
          <div
            style={{
              flex: 1.1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "56px",
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
                  maxHeight: "640px",
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

          {/* Right side: Info */}
          <div
            style={{
              flex: 0.9,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "20px",
              }}
            >
              <div style={{ fontSize: 30, color: OG_COLORS.muted }}>
                {`DROPOSAL #${proposal.proposalNumber}`}
              </div>
              <div
                style={{
                  fontSize: 52,
                  fontWeight: 700,
                  color: OG_COLORS.foreground,
                  lineHeight: 1.2,
                }}
              >
                {truncateText(title, 50)}
              </div>
            </div>

            {/* Description */}
            <div
              style={{
                fontSize: 20,
                color: OG_COLORS.mutedLight,
                marginBottom: "40px",
                lineHeight: 1.5,
              }}
            >
              {truncateText(description, 100)}
            </div>

            {/* Stats */}
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
                  fontSize: 20,
                  color: OG_COLORS.muted,
                }}
              >
                <div>Price</div>
                <div style={{ fontSize: 26, fontWeight: 600, color: OG_COLORS.accent }}>
                  {`${priceEth} ETH`}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 20,
                  color: OG_COLORS.muted,
                }}
              >
                <div>Edition Size</div>
                <div style={{ fontSize: 26, fontWeight: 600, color: OG_COLORS.foreground }}>
                  {editionSize}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                fontSize: 18,
                color: OG_COLORS.muted,
                marginTop: "auto",
                paddingTop: "40px",
              }}
            >
              gnars.com/droposals
            </div>
          </div>
        </div>
      ),
      { ...size }
    );
  } catch (error) {
    console.error("[droposals OG] error:", error);
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
        <div style={{ display: "flex", marginBottom: "16px" }}>
          <NogglesIcon color={OG_COLORS.accent} width={180} />
        </div>
        <div style={{ fontSize: 40, color: OG_COLORS.foreground, textAlign: "center" }}>
          {message}
        </div>
      </div>
    ),
    { ...size }
  );
}
