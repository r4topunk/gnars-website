import type { Round, RoundState } from "./types";

export function getRoundState(
  round: Pick<
    Round,
    "active" | "status" | "startsAt" | "submissionsOpenAt" | "votingStartsAt" | "votingEndsAt"
  >,
  now = new Date(),
): RoundState {
  if (round.status === "archived") return "archived";
  if (round.status !== "published" || !round.active) return "draft";

  const currentTime = now.getTime();
  const startsAt = new Date(round.startsAt).getTime();
  const submissionsOpenAt = new Date(round.submissionsOpenAt).getTime();
  const votingStartsAt = new Date(round.votingStartsAt).getTime();
  const votingEndsAt = new Date(round.votingEndsAt).getTime();

  if (currentTime < startsAt || currentTime < submissionsOpenAt) return "upcoming";
  if (currentTime >= submissionsOpenAt && currentTime < votingStartsAt) return "submissions_open";
  if (currentTime >= votingStartsAt && currentTime < votingEndsAt) return "voting_open";
  if (currentTime >= votingEndsAt) return "ended";

  return "upcoming";
}

export function getRoundStateLabel(state: RoundState) {
  return {
    draft: "Draft",
    upcoming: "Upcoming",
    submissions_open: "Submissions open",
    voting_open: "Voting open",
    ended: "Ended",
    archived: "Archived",
  }[state];
}
