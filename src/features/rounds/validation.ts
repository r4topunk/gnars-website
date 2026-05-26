import type { Round, RoundSubmissionInput, RoundVoteAllocationInput } from "./types";

export function validateRoundSubmission(round: Round, input: RoundSubmissionInput) {
  const title = input.title.trim();
  const description = input.description.trim();
  const image = input.image.trim();

  if (!input.walletAddress.startsWith("0x") || input.walletAddress.length !== 42) {
    return "Connect a valid wallet before submitting.";
  }

  if (title.length < 3 || title.length > 120) {
    return "Submission title must be between 3 and 120 characters.";
  }

  if (description.length < 20 || description.length > 2000) {
    return "Submission description must be between 20 and 2000 characters.";
  }

  if (!isSafeUrl(image, { allowDataImages: true })) {
    return "Use a valid image URL.";
  }

  if (input.url && !isSafeUrl(input.url)) {
    return "Use a valid project URL.";
  }

  if (round.status !== "published" || !round.active) {
    return "This round is not active.";
  }

  return undefined;
}

export function validateRoundVoteAllocation({
  votingPower,
  votes,
}: {
  votingPower: number;
  votes: RoundVoteAllocationInput[];
}) {
  if (!Number.isInteger(votingPower) || votingPower < 0) return "Voting power is invalid.";
  if (!Array.isArray(votes) || votes.length === 0)
    return "Select at least one submission to vote for.";

  const seen = new Set<string>();
  const totalVotes = votes.reduce((total, vote) => {
    if (!vote.submissionId || seen.has(vote.submissionId)) {
      throw new Error("Vote allocations must target unique submissions.");
    }

    if (!Number.isInteger(vote.voteCount) || vote.voteCount <= 0) {
      throw new Error("Vote count must be a positive whole number.");
    }

    seen.add(vote.submissionId);
    return total + vote.voteCount;
  }, 0);

  if (votingPower <= 0) return "This wallet does not have votes for this round.";
  if (totalVotes > votingPower)
    return `You can allocate up to ${votingPower} vote${votingPower === 1 ? "" : "s"}.`;

  return undefined;
}

function isSafeUrl(value: string, options: { allowDataImages?: boolean } = {}) {
  const trimmed = value.trim();
  if (options.allowDataImages && /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(trimmed)) {
    return true;
  }

  if (trimmed.startsWith("/")) return true;

  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
