"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, Minus, Plus } from "lucide-react";
import { useActiveAccount } from "thirdweb/react";
import { Button } from "@/components/ui/button";
import { createRoundActionMessage } from "@/features/rounds/signature";
import { getRoundState, getRoundStateLabel } from "@/features/rounds/state";
import type { RoundState, RoundSubmission, RoundWithSubmissions } from "@/features/rounds/types";
import { useUserAddress } from "@/hooks/use-user-address";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { RoundStatusPill } from "./RoundStatusPill";
import { RoundTimeline } from "./RoundTimeline";

type RoundVotingPower = {
  walletAddress: string;
  votingPower: number;
  usedVotes: number;
  remainingVotes: number;
};

export function RoundDetailView({
  round,
  databaseConfigured,
}: {
  round: RoundWithSubmissions;
  databaseConfigured: boolean;
}) {
  const state = getRoundState(round);
  const { address, isConnected } = useUserAddress();
  const account = useActiveAccount();
  const router = useRouter();
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("");
  const [isVoting, setIsVoting] = useState(false);
  const [votingPowerStatus, setVotingPowerStatus] = useState<RoundVotingPower | null>(null);
  const [isLoadingVotingPower, setIsLoadingVotingPower] = useState(false);
  const [votingPowerError, setVotingPowerError] = useState("");
  const votingPower = state === "voting_open" && isConnected ? votingPowerStatus?.votingPower || 0 : 0;
  const remainingVotes =
    state === "voting_open" && isConnected ? votingPowerStatus?.remainingVotes || 0 : 0;
  const allocatedVotes = useMemo(
    () => Object.values(allocations).reduce((total, count) => total + count, 0),
    [allocations],
  );
  const availableVotes = Math.max(remainingVotes - allocatedVotes, 0);
  const showVotingControls = canShowRoundVotingControls({ state, votingPower });
  const votingStatusMessage = getVotingStatusMessage({
    isConnected,
    isLoadingVotingPower,
    votingPowerError,
    votingPower,
    availableVotes,
    remainingVotes,
  });
  const winners = state === "ended" ? round.submissions.slice(0, round.winnerCount) : [];

  const fetchVotingPower = useCallback(async () => {
    if (state !== "voting_open" || !isConnected || !address) {
      setVotingPowerStatus(null);
      setVotingPowerError("");
      return;
    }

    setIsLoadingVotingPower(true);
    setVotingPowerError("");

    try {
      const response = await fetch(
        `/api/rounds/${round.slug}/voting-power?wallet=${encodeURIComponent(address)}`,
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load voting power.");

      setVotingPowerStatus(result as RoundVotingPower);
    } catch (error) {
      setVotingPowerStatus(null);
      setVotingPowerError(error instanceof Error ? error.message : "Unable to load voting power.");
    } finally {
      setIsLoadingVotingPower(false);
    }
  }, [
    address,
    isConnected,
    round.slug,
    setIsLoadingVotingPower,
    setVotingPowerError,
    setVotingPowerStatus,
    state,
  ]);

  useEffect(() => {
    void fetchVotingPower();
  }, [fetchVotingPower]);

  const updateAllocation = (submissionId: string, delta: number) => {
    setMessage("");
    setAllocations((current) => {
      const currentValue = current[submissionId] || 0;
      const next = Math.max(0, currentValue + delta);
      const totalWithoutCurrent = Object.entries(current).reduce(
        (total, [id, count]) => (id === submissionId ? total : total + count),
        0,
      );
      return {
        ...current,
        [submissionId]: Math.min(next, Math.max(remainingVotes - totalWithoutCurrent, 0)),
      };
    });
  };

  const submitVotes = async () => {
    if (!address || !account || allocatedVotes <= 0 || allocatedVotes > remainingVotes) return;

    setIsVoting(true);
    setMessage("");

    try {
      const votes = Object.entries(allocations)
        .map(([submissionId, voteCount]) => ({ submissionId, voteCount }))
        .filter((vote) => vote.voteCount > 0);
      const path = `/api/rounds/${round.slug}/vote`;
      // Sign and submit under the active (smart) account address — that is the
      // account that actually signs, so the server verifies against it.
      const signerAddress = account.address;
      const payload = { walletAddress: signerAddress, votes };
      const issuedAt = new Date().toISOString();
      const messageToSign = createRoundActionMessage({
        action: "vote",
        method: "POST",
        path,
        walletAddress: signerAddress,
        payload,
        issuedAt,
      });
      const signature = await account.signMessage({ message: messageToSign });
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, issuedAt, signature }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to submit votes.");

      setAllocations({});
      setMessage("Votes submitted.");
      await fetchVotingPower();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit votes.");
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <main className="container mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-6">
        <Button asChild variant="ghost" className="px-0">
          <Link href="/rounds">
            <ArrowLeft className="size-4" />
            Back to rounds
          </Link>
        </Button>

        <section className="grid gap-6 rounded-lg border border-border bg-muted/30 p-6 md:p-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <RoundStatusPill state={state} />
              {round.featured && (
                <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium">
                  Featured
                </span>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-5xl">{round.title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
                {round.description}
              </p>
            </div>
            {round.content && (
              <div className="max-w-3xl space-y-3 border-t border-border pt-5 text-sm leading-7 text-muted-foreground">
                {round.content.split("\n").map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            )}
            {round.awards && round.awards.length > 0 && <RoundPrizes round={round} />}
            <div className="flex flex-wrap gap-3">
              {state === "submissions_open" && (
                <Button asChild>
                  <Link href={`/rounds/${round.slug}/submit`}>Submit project</Link>
                </Button>
              )}
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-border bg-background">
            {round.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={round.image}
                alt={round.title}
                className="h-full min-h-[260px] w-full object-cover"
              />
            ) : (
              <div className="flex min-h-[260px] items-center justify-center p-8 text-center text-2xl font-semibold">
                {round.title}
              </div>
            )}
          </div>
        </section>

        <RoundTimeline round={round} />

        <section className="space-y-4 rounded-lg border border-border bg-card p-5">
          <div className="grid gap-4 md:grid-cols-4">
            <RoundStat label="Status" value={getRoundStateLabel(state)} />
            <RoundStat label="Voting" value={getVotingStrategyLabel(round)} />
            <RoundStat label="Winners" value={`${round.winnerCount}`} />
            <RoundStat label="Votes" value={`${round.totalVotes || 0}`} />
          </div>
        </section>

        {!databaseConfigured && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
            Configure `ROUNDS_DATABASE_URL` or `DATABASE_URL` to enable submissions and voting.
          </div>
        )}

        {winners.length > 0 && (
          <section className="space-y-4 rounded-lg border border-border bg-card p-5">
            <h2 className="text-xl font-semibold tracking-tight">Winners</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {winners.map((submission, index) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  rank={index + 1}
                  showVoting={false}
                  allocation={0}
                  onMinus={() => undefined}
                  onPlus={() => undefined}
                />
              ))}
            </div>
          </section>
        )}

        {state === "voting_open" && (
          <section className="rounded-lg border border-border bg-card p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Voting</h2>
                <p className="mt-1 text-sm text-muted-foreground">{votingStatusMessage}</p>
              </div>
              <Button
                onClick={submitVotes}
                disabled={
                  !databaseConfigured ||
                  !isConnected ||
                  !showVotingControls ||
                  allocatedVotes <= 0 ||
                  allocatedVotes > remainingVotes ||
                  isVoting ||
                  isLoadingVotingPower
                }
              >
                {isVoting ? "Submitting..." : "Submit votes"}
              </Button>
            </div>
            {message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}
          </section>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold tracking-tight">Submissions</h2>
            <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
              {round.submissions.length}
            </span>
          </div>
          {round.submissions.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {round.submissions.map((submission, index) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  rank={index + 1}
                  showVoting={showVotingControls}
                  allocation={allocations[submission.id] || 0}
                  onMinus={() => updateAllocation(submission.id, -1)}
                  onPlus={() => updateAllocation(submission.id, 1)}
                  disablePlus={availableVotes <= 0}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
              No approved submissions yet.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function RoundStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-muted/40 p-4">
      <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 truncate text-lg font-semibold">{value}</div>
    </div>
  );
}

function RoundPrizes({ round }: { round: RoundWithSubmissions }) {
  return (
    <div className="border-t border-border pt-5" style={{ maxWidth: "34rem" }}>
      <div className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Prizes
      </div>
      <div className="divide-y divide-border rounded-md bg-background/70">
        {round.awards
          ?.slice()
          .sort((a, b) => a.position - b.position)
          .map((award) => (
            <div
              key={award.id}
              className="grid items-center gap-4 px-4 py-3"
              style={{ gridTemplateColumns: "5rem 5.5rem minmax(0, 1fr)" }}
            >
              <div className="text-sm font-semibold">{award.title}</div>
              <div className="text-sm font-bold">{award.value}</div>
              <div className="min-w-0 text-sm text-muted-foreground">
                {award.description || "Prize"}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function SubmissionCard({
  submission,
  rank,
  showVoting,
  allocation,
  onMinus,
  onPlus,
  disablePlus,
}: {
  submission: RoundSubmission;
  rank: number;
  showVoting: boolean;
  allocation: number;
  onMinus: () => void;
  onPlus: () => void;
  disablePlus?: boolean;
}) {
  return (
    <article
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm",
        submission.winnerPosition && "border",
      )}
      style={
        submission.winnerPosition
          ? {
              borderColor: "rgba(16, 185, 129, 0.8)",
              boxShadow: "0 0 0 1.5px rgba(16, 185, 129, 0.8), 0 0 12px rgba(16, 185, 129, 0.18)",
            }
          : undefined
      }
    >
      <div className="aspect-[16/10] overflow-hidden bg-muted">
        {submission.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={submission.image}
            alt={submission.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-lg font-semibold">
            {submission.title}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
            #{rank}
          </div>
          <div className="text-sm font-semibold tabular-nums">{submission.voteCount} votes</div>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold tracking-tight">{submission.title}</h3>
          <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
            {submission.description}
          </p>
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          {submission.url ? (
            <a
              href={submission.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Project link
              <ExternalLink className="size-3.5" />
            </a>
          ) : (
            <span className="text-sm text-muted-foreground">No project link</span>
          )}
          {showVoting && (
            <div className="flex items-center gap-2">
              <Button size="icon-sm" variant="outline" onClick={onMinus} disabled={allocation <= 0}>
                <Minus className="size-3.5" />
              </Button>
              <span className="w-6 text-center text-sm font-semibold tabular-nums">
                {allocation}
              </span>
              <Button size="icon-sm" variant="outline" onClick={onPlus} disabled={disablePlus}>
                <Plus className="size-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function getVotingStrategyLabel(round: RoundWithSubmissions) {
  if (round.votingStrategy === "one_per_wallet") return "1 vote per wallet";
  if (round.votingStrategy === "one_per_nft") return "1 vote per Gnars NFT";
  return `${round.votesPerWallet} votes per wallet`;
}

export function canShowRoundVotingControls({
  state,
  votingPower,
}: {
  state: RoundState;
  votingPower: number;
}) {
  return state === "voting_open" && votingPower > 0;
}

function getVotingStatusMessage({
  isConnected,
  isLoadingVotingPower,
  votingPowerError,
  votingPower,
  availableVotes,
  remainingVotes,
}: {
  isConnected: boolean;
  isLoadingVotingPower: boolean;
  votingPowerError: string;
  votingPower: number;
  availableVotes: number;
  remainingVotes: number;
}) {
  if (!isConnected) return "Connect your wallet to vote.";
  if (isLoadingVotingPower) return "Checking delegated Gnars voting power...";
  if (votingPowerError) return votingPowerError;
  if (votingPower <= 0) {
    return "This wallet needs at least 1 delegated Gnars DAO vote to vote in this round.";
  }

  return `${availableVotes} of ${remainingVotes} votes remaining`;
}
