import type {
  Round,
  RoundAwardInput,
  RoundRequestInput,
  RoundSubmissionInput,
  RoundVoteAllocationInput,
} from "./types";

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

export function validateRoundRequest(input: RoundRequestInput) {
  const title = input.title.trim();
  const description = input.description.trim();
  const content = input.content.trim();
  const requesterName = input.requesterName.trim();
  const requesterEmail = input.requesterEmail.trim();
  const requestedSlug = normalizeSlug(input.requestedSlug || input.title);
  const image = input.image.trim();
  const timeline = input.timeline?.trim() || "";

  if (!input.walletAddress.startsWith("0x") || input.walletAddress.length !== 42) {
    return "Connect a valid wallet before requesting a round.";
  }

  if (requesterName.length < 2 || requesterName.length > 120) {
    return "Your name must be between 2 and 120 characters.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requesterEmail)) {
    return "Use a valid email address.";
  }

  if (title.length < 3 || title.length > 120) {
    return "Round title must be between 3 and 120 characters.";
  }

  if (!requestedSlug || !/^[a-z0-9-]+$/.test(requestedSlug)) {
    return "Use a valid round slug.";
  }

  if (description.length < 20 || description.length > 2000) {
    return "Round summary must be between 20 and 2000 characters.";
  }

  if (content.length < 20 || content.length > 4000) {
    return "Round details must be between 20 and 4000 characters.";
  }

  if (!isSafeUrl(image, { allowDataImages: true })) {
    return "Use a valid image URL or uploaded image.";
  }

  if (input.url && !isSafeUrl(input.url)) {
    return "Use a valid reference URL.";
  }

  if (timeline.length > 1000) {
    return "Timeline notes must be 1000 characters or fewer.";
  }

  if (!isValidVotingStrategy(input.votingStrategy)) {
    return "Use a valid voting strategy.";
  }

  if (!Number.isInteger(input.votesPerWallet) || input.votesPerWallet < 1) {
    return "Votes per wallet must be a positive whole number.";
  }

  if (!Number.isInteger(input.winnerCount) || input.winnerCount < 1 || input.winnerCount > 10) {
    return "Winner count must be between 1 and 10.";
  }

  if (
    !Number.isInteger(input.maxSubmissionsPerWallet) ||
    input.maxSubmissionsPerWallet < 1 ||
    input.maxSubmissionsPerWallet > 20
  ) {
    return "Submission limit must be between 1 and 20.";
  }

  const submissionsOpenAt = parseDate(input.submissionsOpenAt);
  const votingStartsAt = parseDate(input.votingStartsAt);
  const votingEndsAt = parseDate(input.votingEndsAt);

  if (!submissionsOpenAt || !votingStartsAt || !votingEndsAt) {
    return "Use valid timeline dates.";
  }

  if (submissionsOpenAt >= votingStartsAt) {
    return "Voting must start after submissions open.";
  }

  if (votingStartsAt >= votingEndsAt) {
    return "Voting must end after voting starts.";
  }

  return validateRoundAwards(input.awards, input.winnerCount);
}

export function normalizeRoundRequestSlug(value: string) {
  return normalizeSlug(value);
}

function validateRoundAwards(awards: RoundAwardInput[], winnerCount: number) {
  if (!Array.isArray(awards) || awards.length !== winnerCount) {
    return `Add ${winnerCount} award${winnerCount === 1 ? "" : "s"}.`;
  }

  const seenPositions = new Set<number>();

  for (const award of awards) {
    if (!Number.isInteger(award.position) || award.position < 1) {
      return "Award positions must be positive whole numbers.";
    }

    if (seenPositions.has(award.position)) {
      return "Award positions must be unique.";
    }

    if (!award.title.trim() || award.title.trim().length > 120) {
      return "Each award needs a title under 120 characters.";
    }

    if (!award.value.trim() || award.value.trim().length > 120) {
      return "Each award needs a value under 120 characters.";
    }

    if ((award.description || "").trim().length > 500) {
      return "Award descriptions must be 500 characters or fewer.";
    }

    seenPositions.add(award.position);
  }

  return undefined;
}

function isValidVotingStrategy(value: string) {
  return value === "fixed_per_wallet" || value === "one_per_wallet" || value === "one_per_nft";
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseDate(value: string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
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
