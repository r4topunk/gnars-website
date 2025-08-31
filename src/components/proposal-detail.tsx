"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, ExternalLink } from "lucide-react";
import { getProposal, getProposals, type Proposal as SdkProposal } from "@buildeross/sdk";
import { ProposalMetrics } from "@/components/proposal-metrics";
import { Badge } from "@/components/ui/badge";
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
import { Markdown } from "@/components/markdown";
import { toast } from "sonner";

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

const getStatusBadgeVariant = (state: UiProposal["state"]) => {
  switch (state) {
    case "EXECUTED":
      return "default"; // green
    case "ACTIVE":
      return "secondary"; // blue
    case "DEFEATED":
    case "VETOED":
      return "destructive"; // red
    case "CANCELED":
      return "outline"; // gray
    default:
      return "secondary";
  }
};

const getStatusLabel = (state: UiProposal["state"]) => {
  switch (state) {
    case "PENDING":
      return "Pending";
    case "ACTIVE":
      return "Active";
    case "DEFEATED":
      return "Defeated";
    case "SUCCEEDED":
      return "Succeeded";
    case "QUEUED":
      return "Queued";
    case "EXECUTED":
      return "Executed";
    case "CANCELED":
      return "Canceled";
    case "VETOED":
      return "Vetoed";
    default:
      return state;
  }
};

export function ProposalDetail({ proposalId }: ProposalDetailProps) {
  const [proposal, setProposal] = useState<UiProposal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState<"FOR" | "AGAINST" | "ABSTAIN" | null>(null);
  const [proposerEnsName, setProposerEnsName] = useState<string | undefined>(undefined);

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

  // Fetch ENS for proposer if available
  useEffect(() => {
    const fetchEns = async () => {
      if (!proposal?.proposer) return;
      try {
        // Public ENS resolution API (read-only)
        const res = await fetch(`https://api.ensideas.com/ens/resolve/${proposal.proposer}`);
        if (res.ok) {
          const data = (await res.json()) as { name?: string; displayName?: string };
          const name = data?.displayName || data?.name;
          if (name) setProposerEnsName(name);
        }
      } catch {
        // non-critical
      }
    };
    fetchEns();
  }, [proposal?.proposer]);

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
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Proposal {proposal.proposalNumber}</span>
          <Badge variant={getStatusBadgeVariant(proposal.state)}>
            {getStatusLabel(proposal.state)}
          </Badge>
          {proposal.transactionHash && (
            <a
              href={`https://basescan.org/tx/${proposal.transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-muted-foreground hover:text-foreground"
              aria-label="Open in explorer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{proposal.title}</h1>
        <div className="text-sm text-muted-foreground">By {proposerEnsName || proposal.proposerEnsName || `${proposal.proposer.slice(0, 6)}...${proposal.proposer.slice(-4)}`}</div>
      </div>

      {/* Vote callout removed per request */}

      {/* Metrics (compact) */}
      <ProposalMetrics
        forVotes={proposal.forVotes}
        againstVotes={proposal.againstVotes}
        abstainVotes={proposal.abstainVotes}
        quorumVotes={proposal.quorumVotes}
        snapshotBlock={proposal.snapshotBlock}
        endDate={proposal.endDate}
        proposer={proposal.proposer}
        proposerEnsName={proposerEnsName || proposal.proposerEnsName}
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
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <Markdown>{proposal.description}</Markdown>
            </CardContent>
          </Card>

          {/* Proposed Transactions: human-readable table */}
          <Card>
            <CardHeader>
              <CardTitle>Proposed Transactions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {proposal.targets.length === 0 ? (
                <p className="text-muted-foreground">No transaction calls attached.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Target</TableHead>
                      <TableHead>Function</TableHead>
                      <TableHead>Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proposal.targets.map((target, index) => {
                      const valueEth = (() => {
                        const raw = Number(proposal.values[index] || 0);
                        if (!Number.isFinite(raw)) return "0";
                        return (raw / 1e18).toLocaleString(undefined, { maximumFractionDigits: 6 });
                      })();
                      const fnSig = proposal.signatures[index] || "—";
                      const addressLabel = `${target.slice(0, 6)}...${target.slice(-4)}`;
                      const copy = async (text: string, label: string) => {
                        try {
                          await navigator.clipboard.writeText(text);
                          toast.success(`${label} copied`);
                        } catch {
                          toast.error(`Failed to copy ${label}`);
                        }
                      };
                      return (
                        <TableRow key={`${target}-${index}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="link" className="px-0" asChild>
                                <a
                                  href={`https://basescan.org/address/${target}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-mono"
                                >
                                  {addressLabel}
                                </a>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Copy address"
                                onClick={() => copy(target, "Address")}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{fnSig}</Badge>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">{valueEth} ETH</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="votes" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Individual Votes</CardTitle>
            </CardHeader>
            <CardContent>
              {proposal.votes && proposal.votes.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Voter</TableHead>
                      <TableHead>Choice</TableHead>
                      <TableHead className="text-right">Vote Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proposal.votes.map((vote, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="font-mono text-sm">
                            {vote.voterEnsName || `${vote.voter.slice(0, 6)}...${vote.voter.slice(-4)}`}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              vote.choice === "FOR"
                                ? "default"
                                : vote.choice === "AGAINST"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {vote.choice}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {parseFloat(vote.votes).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">No votes have been cast yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="propdates" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Propdates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>Propdates functionality coming soon...</p>
                <p className="text-sm mt-2">This will show EAS-based proposal updates and community feedback</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
