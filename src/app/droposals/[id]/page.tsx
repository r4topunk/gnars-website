import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { subgraphQuery } from "@/lib/subgraph";
import { decodeDroposalParams, formatDroposalForTable, isDroposal } from "@/lib/droposal-utils";
import { GNARS_ADDRESSES } from "@/lib/config";
import { Separator } from "@/components/ui/separator";
import { SectionHeader } from "@/components/common/SectionHeader";
import { AddressDisplay } from "@/components/ui/address-display";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { ipfsToHttp } from "@/lib/ipfs";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { StatCard } from "@/components/common/StatCard";
import { formatEther } from "viem";

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
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Droposal not found</CardTitle>
          </CardHeader>
          <CardContent>We couldn't find this droposal.</CardContent>
        </Card>
      </div>
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
  const execHash = (p as any).executionTransactionHash as string | undefined;
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
  const priceEth = decoded?.saleConfig?.publicSalePrice ? formatEther(decoded.saleConfig.publicSalePrice) : "0";
  const editionSize = decoded?.editionSize ? decoded.editionSize.toString() : "Open";
  const createdAt = Number(p.timeCreated) * 1000;
  const isExecuted = Boolean(p.executedAt);

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Droposal #{p.proposalNumber}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={isExecuted ? "secondary" : "outline"}>
              {isExecuted ? "Executed" : "Pending"}
            </Badge>
            <Badge variant="outline">{Number(priceEth) === 0 ? "Free" : `${priceEth} ETH`}</Badge>
            <Badge variant="outline">Edition: {editionSize === "0" ? "Open" : editionSize}</Badge>
            <span className="text-xs text-muted-foreground">{new Date(createdAt).toLocaleDateString()}</span>
          </div>
          {p.title && <p className="text-muted-foreground mt-2">{p.title}</p>}
        </div>
        <div className="hidden lg:flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/droposals">Back to Droposals</Link>
          </Button>
        </div>
      </div>
      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Media and Supporters */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <SectionHeader title="Media" />
            <CardContent className="space-y-4">
              <div className="relative w-full aspect-[16/9] bg-muted rounded-lg overflow-hidden">
                {mediaAnimation ? (
                  <>
                    <video src={mediaAnimation} className="h-full w-full object-cover" controls preload="metadata" />
                    <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded bg-purple-600 px-2 py-1 text-xs text-white">Video</div>
                  </>
                ) : mediaImage ? (
                  <Image src={mediaImage} alt={decoded?.name || p.title || "Droposal media"} fill className="object-cover" />
                ) : (
                  <div className="h-full w-full" />
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Price" value={Number(priceEth) === 0 ? "Free" : `${priceEth} ETH`} />
                <StatCard title="Edition" value={editionSize === "0" ? "Open" : editionSize} />
                <StatCard title="Admin" value={<AddressDisplay address={(decoded?.defaultAdmin || "0x").toString()} variant="compact" showAvatar={false} />} />
                <StatCard title="Recipient" value={<AddressDisplay address={(decoded?.fundsRecipient || "0x").toString()} variant="compact" showAvatar={false} />} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <SectionHeader title="Supporters" description="Collectors who minted this drop" />
            <CardContent>
              <div className="text-muted-foreground">Supporters list coming soon.</div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Details, Sale, Addresses, Mint */}
        <div className="space-y-6 lg:sticky lg:top-24 h-fit">
          <Card>
            <SectionHeader title="Details" />
            <CardContent className="space-y-2">
              <div className="text-sm">
                <span className="text-muted-foreground">Name</span>
                <div className="font-medium">{decoded?.name || p.title}</div>
              </div>
              {decoded?.description && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Description</span>
                  <div className="whitespace-pre-wrap mt-1">{decoded.description}</div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <SectionHeader title="Sale" />
            <CardContent>
              {decoded ? (
                <dl className="grid grid-cols-1 gap-3">
                  {formatDroposalForTable(decoded).map((row) => (
                    <div key={row.parameter} className="grid grid-cols-3 items-start gap-3 rounded-lg border p-3">
                      <dt className="col-span-1 text-xs text-muted-foreground">{row.parameter}</dt>
                      <dd className="col-span-2 text-sm">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <div className="text-muted-foreground">No sale data.</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <SectionHeader title="Addresses" />
            <CardContent className="space-y-3">
              {decoded?.fundsRecipient && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Funds Recipient</div>
                  <AddressDisplay address={decoded.fundsRecipient} variant="compact" />
                </div>
              )}
              {decoded?.defaultAdmin && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Admin</div>
                  <AddressDisplay address={decoded.defaultAdmin} variant="compact" />
                </div>
              )}
              {tokenAddress && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Token Contract</div>
                  <AddressDisplay address={tokenAddress} variant="compact" />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <SectionHeader title="Mint" />
            <CardContent>
              <Button disabled className="w-full">Mint is not available yet</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


