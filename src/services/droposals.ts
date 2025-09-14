import { formatEther } from "viem";
import { DROPOSAL_TARGET, GNARS_ADDRESSES } from "@/lib/config";
import { decodeDroposalParams, isDroposal } from "@/lib/droposal-utils";
import { ipfsToHttp } from "@/lib/ipfs";
import { subgraphQuery } from "@/lib/subgraph";

type ProposalsQuery = {
  proposals: Array<{
    proposalId: string;
    proposalNumber: number;
    title?: string | null;
    description?: string | null;
    calldatas?: string | null;
    targets: string[];
    timeCreated: string;
    canceled?: boolean;
    vetoed?: boolean;
    executed?: boolean;
    queued?: boolean;
    executedAt?: string | null;
    transactionHash?: string | null;
  }>;
};

const PROPOSALS_GQL = /* GraphQL */ `
  query DroposalProposals($dao: ID!, $creator: Bytes!, $first: Int!, $skip: Int!) {
    proposals(
      where: { dao: $dao, targets_contains: [$creator] }
      first: $first
      skip: $skip
      orderBy: timeCreated
      orderDirection: desc
    ) {
      proposalId
      proposalNumber
      title
      description
      calldatas
      targets
      timeCreated
      canceled
      vetoed
      executed
      queued
      executedAt
      transactionHash
    }
  }
`;

export type DroposalListItem = {
  proposalId: string;
  proposalNumber: number;
  title: string;
  name?: string;
  symbol?: string;
  description?: string;
  bannerImage?: string;
  animationUrl?: string;
  priceEth?: string;
  fundsRecipient?: string;
  defaultAdmin?: string;
  editionSize?: string;
  createdAt: number;
  executedAt?: number;
  tokenAddress?: string;
};

export async function fetchDroposals(max: number = 24): Promise<DroposalListItem[]> {
  const dao = GNARS_ADDRESSES.token.toLowerCase();
  const pageSize = Math.min(100, Math.max(1, max));
  const data = await subgraphQuery<ProposalsQuery>(PROPOSALS_GQL, {
    dao,
    // Filter by the droposal target address used in Gnars proposals
    creator: DROPOSAL_TARGET.base.toLowerCase(),
    first: pageSize,
    skip: 0,
  });

  const items: DroposalListItem[] = [];
  for (const p of data.proposals) {
    // Only include proposals that have been executed (droposal deploy finalized)
    const isExecuted = (p.executed || !!p.executedAt) && !p.canceled && !p.vetoed;
    if (!isExecuted) continue;

    const calldatasRaw = p.calldatas;
    const calldatas = Array.isArray(calldatasRaw)
      ? (calldatasRaw as unknown as string[])
      : typeof calldatasRaw === "string"
        ? calldatasRaw.split(":")
        : [];

    // match each target to its corresponding calldata index
    for (let i = 0; i < p.targets.length; i += 1) {
      const target = String(p.targets[i]).toLowerCase();
      if (!isDroposal(target, calldatas[i])) continue;

      const decoded = calldatas[i] ? decodeDroposalParams(calldatas[i]!) : null;
      const bannerImage = decoded?.imageURI ? ipfsToHttp(decoded.imageURI) : undefined;
      const animationUrl = decoded?.animationURI ? ipfsToHttp(decoded.animationURI) : undefined;
      const priceEth =
        decoded?.saleConfig?.publicSalePrice !== undefined
          ? formatEther(decoded.saleConfig.publicSalePrice)
          : undefined;

      items.push({
        proposalId: p.proposalId,
        proposalNumber: Number(p.proposalNumber),
        title: p.title ?? `Proposal #${p.proposalNumber}`,
        name: decoded?.name,
        symbol: decoded?.symbol,
        description: decoded?.description,
        bannerImage,
        animationUrl,
        priceEth,
        fundsRecipient: decoded?.fundsRecipient,
        defaultAdmin: decoded?.defaultAdmin,
        editionSize: decoded?.editionSize?.toString(),
        createdAt: Number(p.timeCreated) * 1000,
        executedAt: p.executedAt ? Number(p.executedAt) * 1000 : undefined,
      });
      break; // one droposal per proposal entry
    }
  }

  return items;
}
