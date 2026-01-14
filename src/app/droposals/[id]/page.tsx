import type { Metadata } from "next";
import { createPublicClient, formatEther, http } from "viem";
import { base } from "viem/chains";
import { DroposalActionBox } from "@/components/droposals/detail/DroposalActionBox";
import { DroposalAddresses } from "@/components/droposals/detail/DroposalAddresses";
import { DroposalDetailsCard } from "@/components/droposals/detail/DroposalDetailsCard";
import { DroposalHeader } from "@/components/droposals/detail/DroposalHeader";
import { DroposalMedia } from "@/components/droposals/detail/DroposalMedia";
import { DroposalMetadata } from "@/components/droposals/detail/DroposalMetadata";
import { DroposalMintProvider } from "@/components/droposals/detail/DroposalMintContext";
import { DroposalSupporters } from "@/components/droposals/detail/DroposalSupporters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BASE_URL, GNARS_ADDRESSES } from "@/lib/config";
import { decodeDroposalParams, formatDroposalForTable, isDroposal } from "@/lib/droposal-utils";
import { ipfsToHttp } from "@/lib/ipfs";
import { DROPOSALS_MINIAPP_EMBED_CONFIG } from "@/lib/miniapp-config";
import { subgraphQuery } from "@/lib/subgraph";

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

type ProposalQuery = {
  proposal: ProposalData | null;
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

type ProposalsByNumberQuery = {
  proposals: ProposalData[];
};

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

/**
 * Fetch droposal data by ID or proposal number
 */
async function fetchDroposal(id: string): Promise<{
  proposal: ProposalData | null;
  decoded: ReturnType<typeof decodeDroposalParams> | null;
}> {
  let proposal: ProposalData | null = null;

  if (id.startsWith("0x")) {
    const byId = await subgraphQuery<ProposalQuery>(PROPOSAL_GQL, { id });
    proposal = byId.proposal;
  } else {
    const num = Number.parseInt(id, 10);
    if (!Number.isNaN(num)) {
      const byNumber = await subgraphQuery<ProposalsByNumberQuery>(PROPOSALS_BY_NUMBER_GQL, {
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

/**
 * Generate metadata for droposal pages
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { proposal, decoded } = await fetchDroposal(id);

  // Default metadata if droposal not found
  if (!proposal) {
    return {
      title: "Droposal Not Found | Gnars DAO",
      description: "This droposal could not be found.",
    };
  }

  const title = decoded?.name || proposal.title || `Droposal #${proposal.proposalNumber}`;
  const description =
    decoded?.collectionDescription ||
    proposal.description?.slice(0, 160) ||
    "A Gnars DAO NFT drop proposal";

  // Prefer static image over animation for OG
  const imageUrl = decoded?.imageURI ? ipfsToHttp(decoded.imageURI) : `${BASE_URL}/logo-banner.jpg`;

  const droposalUrl = `${BASE_URL}/droposals/${id}`;

  // Build dynamic miniapp embed
  const miniappEmbed = {
    ...DROPOSALS_MINIAPP_EMBED_CONFIG,
    imageUrl,
    button: {
      ...DROPOSALS_MINIAPP_EMBED_CONFIG.button,
      title: `View ${title}`,
      action: {
        ...DROPOSALS_MINIAPP_EMBED_CONFIG.button.action,
        url: droposalUrl,
      },
    },
  };

  return {
    title: `${title} | Gnars Droposals`,
    description,
    openGraph: {
      title: `${title} | Gnars Droposals`,
      description,
      images: [imageUrl],
      type: "website",
      url: droposalUrl,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Gnars Droposals`,
      description,
      images: [imageUrl],
    },
    other: {
      "fc:miniapp": JSON.stringify(miniappEmbed),
    },
  };
}

export default async function DroposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { proposal: p, decoded } = await fetchDroposal(id);

  if (!p) {
    return (
      <div className="py-8">
        <Card>
          <CardHeader>
            <CardTitle>Droposal not found</CardTitle>
          </CardHeader>
          <CardContent>We couldn&apos;t find this droposal.</CardContent>
        </Card>
      </div>
    );
  }

  // Try to resolve deployed token address from execution receipt (if executed)
  let tokenAddress: string | null = null;
  const execHash = p.executionTransactionHash;
  if (execHash && execHash.startsWith("0x")) {
    try {
      const client = createPublicClient({ chain: base, transport: http() });
      const receipt = await client.getTransactionReceipt({ hash: execHash as `0x${string}` });
      if (receipt.logs && receipt.logs.length > 0) {
        tokenAddress = receipt.logs[0]?.address ?? null;
      }
    } catch {
      tokenAddress = null;
    }
  }

  const mediaImage = decoded?.imageURI ? ipfsToHttp(decoded.imageURI) : undefined;
  const mediaAnimation = decoded?.animationURI ? ipfsToHttp(decoded.animationURI) : undefined;
  const priceEth = decoded?.saleConfig?.publicSalePrice
    ? formatEther(decoded.saleConfig.publicSalePrice)
    : "0";
  const editionSize = decoded?.editionSize ? decoded.editionSize.toString() : "Open";
  const createdAt = Number(p.timeCreated) * 1000;
  const isExecuted = Boolean(p.executedAt);

  // Sale timing
  const now = Date.now();
  const saleStart = decoded?.saleConfig?.publicSaleStart
    ? Number(decoded.saleConfig.publicSaleStart) * 1000
    : 0;
  const saleEnd = decoded?.saleConfig?.publicSaleEnd
    ? Number(decoded.saleConfig.publicSaleEnd) * 1000
    : 0;
  const saleNotStarted = saleStart && now < saleStart;
  const saleEnded = saleEnd && now > saleEnd;
  const saleActive = !saleNotStarted && !saleEnded && !!decoded;

  return (
    <div className="py-8 space-y-6">
      <DroposalHeader
        proposalNumber={p.proposalNumber}
        title={p.title}
        fallbackName={decoded?.name || null}
        createdAtMs={createdAt}
        isExecuted={isExecuted}
        priceEth={priceEth}
        editionSize={editionSize}
      />
      <Separator />

      <DroposalMintProvider>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <DroposalMedia
              mediaAnimation={mediaAnimation}
              mediaImage={mediaImage}
              alt={decoded?.name || p.title || "Droposal media"}
            />
            <DroposalSupporters
              tokenAddress={tokenAddress as `0x${string}` | null}
              totalSupply={decoded?.editionSize?.toString() ?? null}
            />
            <DroposalMetadata rows={decoded ? formatDroposalForTable(decoded) : []} />
          </div>

          <div className="space-y-6 h-fit">
            <DroposalActionBox
              priceEth={priceEth}
              saleActive={saleActive}
              saleNotStarted={Boolean(saleNotStarted)}
              saleEnded={Boolean(saleEnded)}
              saleStart={saleStart || undefined}
              saleEnd={saleEnd || undefined}
              hasDecoded={Boolean(decoded)}
              tokenAddress={tokenAddress as `0x${string}` | undefined}
            />
            <DroposalDetailsCard
              name={decoded?.name}
              title={p.title}
              description={decoded?.collectionDescription}
            />
            <DroposalAddresses
              fundsRecipient={decoded?.fundsRecipient}
              defaultAdmin={decoded?.defaultAdmin}
              tokenAddress={tokenAddress}
            />
          </div>
        </div>
      </DroposalMintProvider>
    </div>
  );
}
