"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { getProposal, getProposals, type Proposal as SdkProposal } from "@buildeross/sdk";
import { ProposalMetrics } from "@/components/proposal-metrics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VotingControls } from "@/components/voting-controls";
import { CHAIN, GNARS_ADDRESSES } from "@/lib/config";
import { ProposalHeader } from "@/components/proposal-detail/ProposalHeader";
import { ProposalDescriptionCard } from "@/components/proposal-detail/ProposalDescriptionCard";
import { ProposedTransactionsTable } from "@/components/proposal-detail/ProposedTransactionsTable";
import { ProposalVotesTable } from "@/components/proposal-detail/ProposalVotesTable";
import { PropdatesPlaceholder } from "@/components/proposal-detail/PropdatesPlaceholder";
 

interface UiProposalVote {
  voter: string;
  voterEnsName?: string;
  choice: "FOR" | "AGAINST" | "ABSTAIN";
  votes: string;
  transactionHash: string;
}

interface UiProposal {
  proposalId: string;
  proposalNumber: number;
  title: string;
  description: string;
  state:
    | "PENDING"
    | "ACTIVE"
    | "DEFEATED"
    | "SUCCEEDED"
    | "QUEUED"
    | "EXECUTED"
    | "CANCELED"
    | "VETOED";
  proposer: string;
  proposerEnsName?: string;
  createdAt: number;
  endBlock: number;
  snapshotBlock?: number;
  endDate?: Date;
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  quorumVotes: string;
  calldatas: string[];
  targets: string[];
  values: string[];
  signatures: string[];
  transactionHash: string;
  votes?: UiProposalVote[];
}

interface ProposalDetailProps {
  proposalId: string;
}


export function ProposalDetail({ proposalId }: ProposalDetailProps) {
  const [proposal, setProposal] = useState<UiProposal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState<"FOR" | "AGAINST" | "ABSTAIN" | null>(null);
  // Removed unused proposerEnsName state to satisfy linter

  console.log("description", proposal?.description);

  useEffect(() => {
    const fetchProposal = async () => {
      try {
        // Resolve whether the route param is a 0x proposalId or a numeric proposalNumber.
        const isHexId = proposalId.startsWith("0x");
        let sdkProposal: SdkProposal | undefined;

        if (isHexId) {
          sdkProposal = await getProposal(CHAIN.id as unknown as number, proposalId);
        } else {
          // Numeric route: search proposals by proposalNumber (paginate up to 5 pages x 200 = 1000)
          const targetNumber = Number.parseInt(proposalId, 10);
          if (Number.isNaN(targetNumber)) {
            sdkProposal = undefined;
          } else {
            const LIMIT = 200;
            const MAX_PAGES = 5;
            for (let page = 0; page < MAX_PAGES; page += 1) {
              const { proposals } = await getProposals(
                CHAIN.id as unknown as number,
                GNARS_ADDRESSES.token,
                LIMIT,
                page,
              );
              const match = (proposals ?? []).find(
                (p) => Number(p.proposalNumber ?? -1) === targetNumber,
              );
              if (match) {
                sdkProposal = match;
                break;
              }
              if (!proposals || proposals.length < LIMIT) {
                break; // no more pages
              }
            }
          }
        }

        if (!sdkProposal) {
          setProposal(null);
          return;
        }

        const endDate = (() => {
          // Prefer executableFrom/expiresAt, else interpret voteEnd as seconds
          const voteEnd = Number(sdkProposal.voteEnd ?? 0);
          if (voteEnd > 0) return new Date(voteEnd * 1000);
          const record = sdkProposal as unknown as Record<string, unknown>;
          const expiresAtRaw = record["expiresAt"];
          const expiresAtNumber =
            typeof expiresAtRaw === "number"
              ? expiresAtRaw
              : typeof expiresAtRaw === "string"
                ? Number.parseInt(expiresAtRaw, 10)
                : 0;
          return expiresAtNumber > 0 ? new Date(expiresAtNumber * 1000) : undefined;
        })();

        const uiProposal: UiProposal = {
          proposalId: String(sdkProposal.proposalId),
          proposalNumber: Number(sdkProposal.proposalNumber ?? 0),
          title: sdkProposal.title ?? "",
          description: sdkProposal.description ?? "",
          state: String(sdkProposal.state ?? "PENDING").toUpperCase() as UiProposal["state"],
          proposer: String(sdkProposal.proposer),
          proposerEnsName: undefined,
          createdAt: Number(sdkProposal.timeCreated ?? 0) * 1000,
          endBlock: Number(sdkProposal.voteEnd ?? 0),
          snapshotBlock: sdkProposal.snapshotBlockNumber ? Number(sdkProposal.snapshotBlockNumber) : undefined,
          endDate,
          forVotes: String(sdkProposal.forVotes ?? 0),
          againstVotes: String(sdkProposal.againstVotes ?? 0),
          abstainVotes: String(sdkProposal.abstainVotes ?? 0),
          quorumVotes: String(sdkProposal.quorumVotes ?? 0),
          calldatas: (() => {
            const direct = (sdkProposal as unknown as { calldatas?: unknown }).calldatas;
            if (Array.isArray(direct)) return direct.map(String);
            if (typeof direct === "string") return [direct];
            const record = sdkProposal as unknown as Record<string, unknown>;
            const raw = record["calldatas"];
            if (Array.isArray(raw)) return raw.map(String);
            if (typeof raw === "string") return [raw];
            return [] as string[];
          })(),
          targets: (sdkProposal.targets as unknown[] | undefined)?.map(String) ?? [],
          values: (sdkProposal.values as unknown[] | undefined)?.map(String) ?? [],
          signatures: [],
          transactionHash: String(sdkProposal.transactionHash ?? ""),
          votes: Array.isArray(sdkProposal.votes)
            ? sdkProposal.votes.map((v) => ({
                voter: String(v.voter),
                voterEnsName: undefined,
                choice: ((): UiProposalVote["choice"] => {
                  const s = String(v.support ?? "").toUpperCase();
                  if (s.includes("FOR")) return "FOR";
                  if (s.includes("AGAINST")) return "AGAINST";
                  return "ABSTAIN";
                })(),
                votes: String(v.weight ?? 0),
                transactionHash: "",
              }))
            : [],
        };

        setProposal(uiProposal);
      } catch (error) {
        console.error("Failed to fetch proposal:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProposal();
  }, [proposalId]);

  // Removed unused ENS fetch for proposer to satisfy linter

  const handleVote = (vote: "FOR" | "AGAINST" | "ABSTAIN") => {
    setHasVoted(true);
    setUserVote(vote);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
        <div className="h-96 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-muted-foreground">Proposal Not Found</h2>
        <p className="text-muted-foreground mt-2">
          The proposal you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Button asChild className="mt-4">
          <Link href="/proposals">Back to Proposals</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header like reference */}
      <ProposalHeader
        proposalNumber={proposal.proposalNumber}
        title={proposal.title}
        proposer={proposal.proposer}
        state={proposal.state}
        transactionHash={proposal.transactionHash}
      />

      {/* Vote callout removed per request */}

      {/* Metrics (compact) */}
      <ProposalMetrics
        forVotes={proposal.forVotes}
        againstVotes={proposal.againstVotes}
        abstainVotes={proposal.abstainVotes}
        quorumVotes={proposal.quorumVotes}
        snapshotBlock={proposal.snapshotBlock}
        endDate={proposal.endDate}
      />

      {/* Voting Controls */}
      <Card id="voting-section">
        <CardHeader>
          <CardTitle>Cast Your Vote</CardTitle>
        </CardHeader>
        <CardContent>
          <VotingControls
            proposalId={proposal.proposalNumber.toString()}
            isActive={proposal.state === "ACTIVE"}
            hasVoted={hasVoted}
            userVote={userVote || undefined}
            onVote={handleVote}
          />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="votes">Votes</TabsTrigger>
          <TabsTrigger value="propdates">Propdates</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6 mt-6">
          {/* Description: full markdown */}
          <ProposalDescriptionCard description={proposal.description} />

          {/* Proposed Transactions: human-readable table */}
          <ProposedTransactionsTable
            targets={proposal.targets}
            values={proposal.values}
            signatures={proposal.signatures}
          />
        </TabsContent>

        <TabsContent value="votes" className="mt-6 space-y-6">
          <ProposalVotesTable votes={proposal.votes?.map((v) => ({ voter: v.voter, choice: v.choice, votes: v.votes }))} />
        </TabsContent>

        <TabsContent value="propdates" className="mt-6">
          <PropdatesPlaceholder />
        </TabsContent>
      </Tabs>
    </div>
  );
}
