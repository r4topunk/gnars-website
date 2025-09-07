import Image from "next/image";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { createPublicClient, formatEther, http } from "viem";
import { base } from "viem/chains";
import { SectionHeader } from "@/components/common/SectionHeader";
import { StatCard } from "@/components/common/StatCard";
import { AddressDisplay } from "@/components/ui/address-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Droposal not found</CardTitle>
          </CardHeader>
          <CardContent>We couldn&apos;t find this droposal.</CardContent>
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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // noop
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={isExecuted ? "secondary" : "outline"}>
              {isExecuted ? "Executed" : "Pending"}
            </Badge>
            <span className="text-xs text-muted-foreground">#{p.proposalNumber}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            {p.title || decoded?.name || `Droposal #${p.proposalNumber}`}
          </h1>
          <div className="mt-3 grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
            <Badge variant="secondary">{Number(priceEth) === 0 ? "Free" : `${priceEth} ETH`}</Badge>
            <Badge variant="secondary">Edition: {editionSize === "0" ? "Open" : editionSize}</Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(createdAt).toLocaleDateString()}
            </span>
          </div>
          {p.title && <p className="text-muted-foreground mt-2 max-w-2xl">{p.title}</p>}
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
          <div className="relative w-full aspect-[16/9] bg-muted rounded-xl overflow-hidden">
            {mediaAnimation ? (
              <>
                <video
                  src={mediaAnimation}
                  className="h-full w-full object-cover"
                  controls
                  preload="metadata"
                />
                <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded bg-purple-600 px-2 py-1 text-xs text-white">
                  Video
                </div>
              </>
            ) : mediaImage ? (
              <Image
                src={mediaImage}
                alt={decoded?.name || p.title || "Droposal media"}
                fill
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full" />
            )}
          </div>

          <Card>
            <SectionHeader title="Supporters" description="Collectors who minted this drop" />
            <CardContent>
              <div className="text-muted-foreground">Supporters list coming soon.</div>
            </CardContent>
          </Card>

          <Card>
            <SectionHeader title="Metadata" />
            <CardContent>
              {decoded ? (
                <dl className="grid grid-cols-1 gap-2">
                  {formatDroposalForTable(decoded).map((row) => {
                    const isUri =
                      typeof row.value === "string" && row.parameter.toLowerCase().includes("uri");
                    const text = String(row.value ?? "");
                    const truncated =
                      isUri && text.length > 28 ? `${text.slice(0, 18)}…${text.slice(-8)}` : text;
                    return (
                      <div
                        key={row.parameter}
                        className="flex items-start justify-between gap-3 rounded-md bg-muted/50 px-3 py-2"
                      >
                        <dt className="text-xs text-muted-foreground">{row.parameter}</dt>
                        <dd className="text-sm text-right break-words">
                          {isUri ? (
                            <div className="inline-flex items-center gap-2">
                              <a
                                href={text.startsWith("ipfs://") ? ipfsToHttp(text) : text}
                                target="_blank"
                                rel="noreferrer"
                                className="underline decoration-dotted"
                              >
                                {truncated}
                              </a>
                            </div>
                          ) : (
                            <span>{row.value}</span>
                          )}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              ) : (
                <div className="text-muted-foreground">No sale data.</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Action box, Details, Sale, Addresses */}
        <div className="space-y-6 h-fit">
          {/* Action Box */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Price</div>
                  <div className="text-lg font-semibold">
                    {Number(priceEth) === 0 ? "Free" : `${priceEth} ETH`}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Edition</div>
                  <div className="text-lg font-semibold">
                    {editionSize === "0" ? "Open" : editionSize}
                  </div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {saleActive && (
                  <span className="text-green-600 dark:text-green-500">Sale is live</span>
                )}
                {saleNotStarted && (
                  <span>
                    Starts {new Date(saleStart).toLocaleString()} · {countdown(saleStart)}
                  </span>
                )}
                {saleEnded && <span>Ended {new Date(saleEnd).toLocaleString()}</span>}
                {!decoded && (
                  <span className="inline-flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    No sale configuration
                  </span>
                )}
              </div>
              <Button disabled={!saleActive} className="w-full">
                {saleActive ? "Mint" : "Mint is not available yet"}
              </Button>
            </CardContent>
          </Card>
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
        </div>
      </div>
    </div>
  );
}
