import { createPublicClient, formatEther, http } from "viem";
import { base } from "viem/chains";
import { DroposalActionBox } from "@/components/droposals/detail/DroposalActionBox";
import { DroposalAddresses } from "@/components/droposals/detail/DroposalAddresses";
import { DroposalDetailsCard } from "@/components/droposals/detail/DroposalDetailsCard";
import { DroposalHeader } from "@/components/droposals/detail/DroposalHeader";
import { DroposalMedia } from "@/components/droposals/detail/DroposalMedia";
import { DroposalMetadata } from "@/components/droposals/detail/DroposalMetadata";
import { DroposalSupporters } from "@/components/droposals/detail/DroposalSupporters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SidebarInset } from "@/components/ui/sidebar";
import { GNARS_ADDRESSES } from "@/lib/config";
import { decodeDroposalParams, formatDroposalForTable, isDroposal } from "@/lib/droposal-utils";
import { ipfsToHttp } from "@/lib/ipfs";
import { subgraphQuery } from "@/lib/subgraph";

type ProposalQuery = {
  proposal: {
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
  } | null;
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
  proposals: Array<{
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
  }>;
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

export default async function DroposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let p: ProposalQuery["proposal"] | ProposalsByNumberQuery["proposals"][number] | null = null;
  if (id.startsWith("0x")) {
    const byId = await subgraphQuery<ProposalQuery>(PROPOSAL_GQL, { id });
    p = byId.proposal;
  } else {
    const num = Number.parseInt(id, 10);
    if (!Number.isNaN(num)) {
      const byNumber = await subgraphQuery<ProposalsByNumberQuery>(PROPOSALS_BY_NUMBER_GQL, {
        dao: GNARS_ADDRESSES.token.toLowerCase(),
        proposalNumber: num,
      });
      p = byNumber.proposals?.[0] ?? null;
    }
  }

  if (!p) {
    return (
      <SidebarInset>
        <div className="container mx-auto py-8 px-4">
          <Card>
            <CardHeader>
              <CardTitle>Droposal not found</CardTitle>
            </CardHeader>
            <CardContent>We couldn&apos;t find this droposal.</CardContent>
          </Card>
        </div>
      </SidebarInset>
    );
  }

  const calldatasRaw = p.calldatas;
  const calldatas = Array.isArray(calldatasRaw)
    ? (calldatasRaw as unknown as string[])
    : typeof calldatasRaw === "string"
      ? calldatasRaw.split(":")
      : [];

  let decoded = null as ReturnType<typeof decodeDroposalParams> | null;
  let tokenAddress: string | null = null;
  for (let i = 0; i < p.targets.length; i += 1) {
    if (isDroposal(p.targets[i], calldatas[i])) {
      decoded = calldatas[i] ? decodeDroposalParams(calldatas[i]!) : null;
      break;
    }
  }

  // Try to resolve deployed token address from execution receipt (if executed)
  const execHash = ("executionTransactionHash" in p ? p.executionTransactionHash : undefined) as
    | string
    | undefined;
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

  const countdown = (target: number) => {
    const diff = Math.max(0, target - now);
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${d}d ${h}h ${m}m`;
  };

  return (
    <SidebarInset>
      <div className="container mx-auto py-8 px-4 space-y-6">
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
              editionSize={editionSize}
              saleActive={saleActive}
              saleNotStarted={Boolean(saleNotStarted)}
              saleEnded={Boolean(saleEnded)}
              saleStart={saleStart || undefined}
              saleEnd={saleEnd || undefined}
              hasDecoded={Boolean(decoded)}
              formatCountdown={countdown}
            />
            <DroposalDetailsCard
              name={decoded?.name}
              title={p.title}
              description={decoded?.description}
            />
            <DroposalAddresses
              fundsRecipient={decoded?.fundsRecipient}
              defaultAdmin={decoded?.defaultAdmin}
              tokenAddress={tokenAddress}
            />
          </div>
        </div>
      </div>
    </SidebarInset>
  );
}
