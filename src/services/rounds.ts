import "server-only";
import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { getAddress, isAddress } from "viem";
import { getRoundState } from "@/features/rounds/state";
import type {
  Round,
  RoundAward,
  RoundAwardInput,
  RoundRequest,
  RoundRequestInput,
  RoundSubmission,
  RoundSubmissionInput,
  RoundVoteActivity,
  RoundVoteAllocationInput,
  RoundWithSubmissions,
} from "@/features/rounds/types";
import {
  normalizeRoundRequestSlug,
  validateRoundRequest,
  validateRoundSubmission,
  validateRoundVoteAllocation,
} from "@/features/rounds/validation";

let pool: Pool | null = null;
let tablesReady: Promise<void> | null = null;

function getConnectionString() {
  return (
    process.env.ROUNDS_DATABASE_URL || process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL
  );
}

export function isRoundsDatabaseConfigured() {
  return Boolean(getConnectionString());
}

function getPool() {
  const connectionString = getConnectionString();
  if (!connectionString) throw new Error("ROUNDS_DATABASE_URL or DATABASE_URL is required.");

  if (!pool) {
    pool = new Pool({
      connectionString,
      connectionTimeoutMillis: 8000,
      idleTimeoutMillis: 10000,
      max: 2,
      ssl: connectionString.includes("localhost") ? undefined : { rejectUnauthorized: false },
    });
  }

  return pool;
}

async function ensureTables() {
  if (!tablesReady) {
    tablesReady = getPool()
      .query(
        `
      CREATE TABLE IF NOT EXISTS rounds (
        id text PRIMARY KEY,
        slug text NOT NULL UNIQUE,
        title text NOT NULL,
        description text NOT NULL DEFAULT '',
        content text NOT NULL DEFAULT '',
        image text NOT NULL DEFAULT '',
        starts_at timestamptz NOT NULL,
        submissions_open_at timestamptz NOT NULL,
        voting_starts_at timestamptz NOT NULL,
        voting_ends_at timestamptz NOT NULL,
        ends_at timestamptz NOT NULL,
        active boolean NOT NULL DEFAULT false,
        featured boolean NOT NULL DEFAULT false,
        status text NOT NULL DEFAULT 'draft',
        voting_strategy text NOT NULL DEFAULT 'fixed_per_wallet',
        votes_per_wallet integer NOT NULL DEFAULT 1,
        winner_count integer NOT NULL DEFAULT 1,
        max_submissions_per_wallet integer NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        CONSTRAINT rounds_status_check CHECK (status IN ('draft', 'published', 'archived')),
        CONSTRAINT rounds_voting_strategy_check CHECK (voting_strategy IN ('one_per_wallet', 'one_per_nft', 'fixed_per_wallet')),
        CONSTRAINT rounds_votes_per_wallet_check CHECK (votes_per_wallet > 0),
        CONSTRAINT rounds_winner_count_check CHECK (winner_count > 0),
        CONSTRAINT rounds_submission_limit_check CHECK (max_submissions_per_wallet > 0)
      );

      CREATE TABLE IF NOT EXISTS round_submissions (
        id text PRIMARY KEY,
        round_id text NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
        wallet_address text NOT NULL,
        title text NOT NULL,
        description text NOT NULL,
        image text NOT NULL,
        url text NOT NULL DEFAULT '',
        status text NOT NULL DEFAULT 'approved',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        CONSTRAINT round_submissions_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'hidden'))
      );

      CREATE TABLE IF NOT EXISTS round_votes (
        id text PRIMARY KEY,
        round_id text NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
        submission_id text NOT NULL REFERENCES round_submissions(id) ON DELETE CASCADE,
        wallet_address text NOT NULL,
        vote_count integer NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT round_votes_positive_check CHECK (vote_count > 0),
        CONSTRAINT round_votes_unique_wallet_submission UNIQUE (round_id, submission_id, wallet_address)
      );

      CREATE TABLE IF NOT EXISTS round_awards (
        id text PRIMARY KEY,
        round_id text NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
        award_position integer NOT NULL,
        title text NOT NULL,
        description text NOT NULL DEFAULT '',
        award_value text NOT NULL DEFAULT '',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT round_awards_position_check CHECK (award_position > 0),
        CONSTRAINT round_awards_unique_position UNIQUE (round_id, award_position)
      );

      CREATE TABLE IF NOT EXISTS round_requests (
        id text PRIMARY KEY,
        wallet_address text NOT NULL,
        requester_name text NOT NULL,
        requester_email text NOT NULL,
        requested_slug text NOT NULL,
        title text NOT NULL,
        description text NOT NULL,
        content text NOT NULL DEFAULT '',
        image text NOT NULL DEFAULT '',
        url text NOT NULL DEFAULT '',
        timeline text NOT NULL DEFAULT '',
        starts_at timestamptz NOT NULL,
        submissions_open_at timestamptz NOT NULL,
        voting_starts_at timestamptz NOT NULL,
        voting_ends_at timestamptz NOT NULL,
        ends_at timestamptz NOT NULL,
        voting_strategy text NOT NULL DEFAULT 'fixed_per_wallet',
        votes_per_wallet integer NOT NULL DEFAULT 1,
        winner_count integer NOT NULL DEFAULT 1,
        max_submissions_per_wallet integer NOT NULL DEFAULT 1,
        awards jsonb NOT NULL DEFAULT '[]',
        status text NOT NULL DEFAULT 'pending',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        reviewed_at timestamptz,
        deleted_at timestamptz,
        CONSTRAINT round_requests_status_check CHECK (status IN ('pending', 'approved', 'rejected')),
        CONSTRAINT round_requests_voting_strategy_check CHECK (voting_strategy IN ('one_per_wallet', 'one_per_nft', 'fixed_per_wallet')),
        CONSTRAINT round_requests_votes_per_wallet_check CHECK (votes_per_wallet > 0),
        CONSTRAINT round_requests_winner_count_check CHECK (winner_count > 0),
        CONSTRAINT round_requests_submission_limit_check CHECK (max_submissions_per_wallet > 0)
      );

      CREATE INDEX IF NOT EXISTS rounds_public_idx ON rounds(status, active, deleted_at);
      CREATE INDEX IF NOT EXISTS round_submissions_round_status_idx ON round_submissions(round_id, status);
      CREATE INDEX IF NOT EXISTS round_votes_round_wallet_idx ON round_votes(round_id, wallet_address);
      CREATE INDEX IF NOT EXISTS round_awards_round_position_idx ON round_awards(round_id, award_position);
      CREATE INDEX IF NOT EXISTS round_requests_status_idx ON round_requests(status, deleted_at);
    `,
      )
      .then(() => undefined);
  }

  return tablesReady;
}

const roundSelectFields = `
  r.id,
  r.slug,
  r.title,
  r.description,
  r.content,
  r.image,
  r.starts_at,
  r.submissions_open_at,
  r.voting_starts_at,
  r.voting_ends_at,
  r.ends_at,
  r.active,
  r.featured,
  r.status,
  r.voting_strategy,
  r.votes_per_wallet,
  r.winner_count,
  r.max_submissions_per_wallet,
  r.created_at,
  r.updated_at,
  r.deleted_at,
  COALESCE(stats.submission_count, 0)::int AS submission_count,
  COALESCE(stats.approved_submission_count, 0)::int AS approved_submission_count,
  COALESCE(stats.total_votes, 0)::int AS total_votes
`;

const roundStatsJoin = `
  LEFT JOIN LATERAL (
    SELECT
      COUNT(DISTINCT s.id) FILTER (WHERE s.deleted_at IS NULL)::int AS submission_count,
      COUNT(DISTINCT s.id) FILTER (WHERE s.deleted_at IS NULL AND s.status = 'approved')::int AS approved_submission_count,
      COALESCE(SUM(v.vote_count), 0)::int AS total_votes
    FROM round_submissions s
    LEFT JOIN round_votes v ON v.submission_id = s.id
    WHERE s.round_id = r.id
  ) stats ON true
`;

const submissionSelectFields = `
  s.id,
  s.round_id,
  s.wallet_address,
  s.title,
  s.description,
  s.image,
  s.url,
  s.status,
  s.created_at,
  s.updated_at,
  COALESCE(vote_totals.vote_count, 0)::int AS vote_count,
  NULL::int AS winner_position
`;

const voteTotalsJoin = `
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(v.vote_count), 0)::int AS vote_count
    FROM round_votes v
    WHERE v.submission_id = s.id
  ) vote_totals ON true
`;

const requestSelectFields = `
  id,
  wallet_address,
  requester_name,
  requester_email,
  requested_slug,
  title,
  description,
  content,
  image,
  url,
  timeline,
  starts_at,
  submissions_open_at,
  voting_starts_at,
  voting_ends_at,
  ends_at,
  voting_strategy,
  votes_per_wallet,
  winner_count,
  max_submissions_per_wallet,
  awards,
  status,
  created_at,
  updated_at,
  reviewed_at,
  deleted_at
`;

function mapRound(row: Record<string, unknown>): Round {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    description: String(row.description || ""),
    content: String(row.content || ""),
    image: String(row.image || ""),
    startsAt: new Date(String(row.starts_at)).toISOString(),
    submissionsOpenAt: new Date(String(row.submissions_open_at)).toISOString(),
    votingStartsAt: new Date(String(row.voting_starts_at)).toISOString(),
    votingEndsAt: new Date(String(row.voting_ends_at)).toISOString(),
    endsAt: new Date(String(row.ends_at)).toISOString(),
    active: Boolean(row.active),
    featured: Boolean(row.featured),
    status: row.status as Round["status"],
    votingStrategy: row.voting_strategy as Round["votingStrategy"],
    votesPerWallet: Number(row.votes_per_wallet || 1),
    winnerCount: Number(row.winner_count || 1),
    maxSubmissionsPerWallet: Number(row.max_submissions_per_wallet || 1),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    deletedAt: row.deleted_at ? new Date(String(row.deleted_at)).toISOString() : null,
    submissionCount: Number(row.submission_count || 0),
    approvedSubmissionCount: Number(row.approved_submission_count || 0),
    totalVotes: Number(row.total_votes || 0),
  };
}

function mapSubmission(row: Record<string, unknown>): RoundSubmission {
  return {
    id: String(row.id),
    roundId: String(row.round_id),
    walletAddress: String(row.wallet_address),
    title: String(row.title),
    description: String(row.description || ""),
    image: String(row.image || ""),
    url: String(row.url || ""),
    status: row.status as RoundSubmission["status"],
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    voteCount: Number(row.vote_count || 0),
    winnerPosition: row.winner_position ? Number(row.winner_position) : null,
  };
}

function mapAward(row: Record<string, unknown>): RoundAward {
  return {
    id: String(row.id),
    roundId: String(row.round_id),
    position: Number(row.award_position),
    title: String(row.title),
    description: String(row.description || ""),
    value: String(row.award_value || ""),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function mapRoundRequest(row: Record<string, unknown>): RoundRequest {
  return {
    id: String(row.id),
    walletAddress: String(row.wallet_address),
    requesterName: String(row.requester_name),
    requesterEmail: String(row.requester_email),
    requestedSlug: String(row.requested_slug),
    title: String(row.title),
    description: String(row.description || ""),
    content: String(row.content || ""),
    image: String(row.image || ""),
    url: String(row.url || ""),
    timeline: String(row.timeline || ""),
    startsAt: new Date(String(row.starts_at)).toISOString(),
    submissionsOpenAt: new Date(String(row.submissions_open_at)).toISOString(),
    votingStartsAt: new Date(String(row.voting_starts_at)).toISOString(),
    votingEndsAt: new Date(String(row.voting_ends_at)).toISOString(),
    endsAt: new Date(String(row.ends_at)).toISOString(),
    votingStrategy: row.voting_strategy as RoundRequest["votingStrategy"],
    votesPerWallet: Number(row.votes_per_wallet || 1),
    winnerCount: Number(row.winner_count || 1),
    maxSubmissionsPerWallet: Number(row.max_submissions_per_wallet || 1),
    awards: parseJson<RoundAwardInput[]>(row.awards || []),
    status: row.status as RoundRequest["status"],
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    reviewedAt: row.reviewed_at ? new Date(String(row.reviewed_at)).toISOString() : null,
    deletedAt: row.deleted_at ? new Date(String(row.deleted_at)).toISOString() : null,
  };
}

function parseJson<T>(value: unknown): T {
  if (typeof value === "string") return JSON.parse(value) as T;
  return value as T;
}

async function hydrateAwards(rounds: Round[]) {
  if (rounds.length === 0) return rounds;

  const result = await getPool().query(
    `SELECT * FROM round_awards WHERE round_id = ANY($1::text[]) ORDER BY award_position ASC`,
    [rounds.map((round) => round.id)],
  );
  const awardsByRound = new Map<string, RoundAward[]>();

  for (const row of result.rows) {
    const award = mapAward(row);
    awardsByRound.set(award.roundId, [...(awardsByRound.get(award.roundId) || []), award]);
  }

  return rounds.map((round) => ({ ...round, awards: awardsByRound.get(round.id) || [] }));
}

export async function listPublicRounds(): Promise<Round[]> {
  if (!isRoundsDatabaseConfigured()) {
    return [];
  }

  await ensureTables();
  const result = await getPool().query(`
    SELECT ${roundSelectFields}
    FROM rounds r
    ${roundStatsJoin}
    WHERE r.status = 'published' AND r.active = true AND r.deleted_at IS NULL
    ORDER BY r.featured DESC, r.submissions_open_at DESC, r.created_at DESC
  `);

  return hydrateAwards(result.rows.map(mapRound));
}

export async function getPublicRoundBySlug(slug: string): Promise<RoundWithSubmissions | null> {
  if (!isRoundsDatabaseConfigured()) {
    return null;
  }

  await ensureTables();
  const result = await getPool().query(
    `
      SELECT ${roundSelectFields}
      FROM rounds r
      ${roundStatsJoin}
      WHERE r.slug = $1 AND r.status = 'published' AND r.active = true AND r.deleted_at IS NULL
      LIMIT 1
    `,
    [slug],
  );
  const round = result.rows[0] ? (await hydrateAwards([mapRound(result.rows[0])]))[0] : null;
  if (!round) return null;

  const [submissionsResult, activityResult] = await Promise.all([
    getPool().query(
      `
        SELECT ${submissionSelectFields}
        FROM round_submissions s
        ${voteTotalsJoin}
        WHERE s.round_id = $1 AND s.status = 'approved' AND s.deleted_at IS NULL
        ORDER BY vote_count DESC, s.created_at ASC
      `,
      [round.id],
    ),
    getPool().query(
      `
        SELECT
          v.id,
          v.wallet_address,
          v.submission_id,
          s.title AS submission_title,
          v.vote_count,
          v.created_at,
          v.updated_at
        FROM round_votes v
        INNER JOIN round_submissions s ON s.id = v.submission_id
        WHERE v.round_id = $1
        ORDER BY v.updated_at DESC
        LIMIT 40
      `,
      [round.id],
    ),
  ]);

  const submissions = submissionsResult.rows.map(mapSubmission);
  const voteActivity: RoundVoteActivity[] = activityResult.rows.map(
    (row: Record<string, unknown>) => ({
      id: String(row.id),
      walletAddress: String(row.wallet_address),
      submissionId: String(row.submission_id),
      submissionTitle: String(row.submission_title),
      voteCount: Number(row.vote_count || 0),
      createdAt: new Date(String(row.created_at)).toISOString(),
      updatedAt: new Date(String(row.updated_at)).toISOString(),
    }),
  );

  return { ...round, submissions, voteActivity };
}

export async function getRoundVotingPower(round: Round, walletAddress?: string | null) {
  if (!walletAddress || !isAddress(walletAddress)) return 0;
  if (round.votingStrategy === "fixed_per_wallet") return round.votesPerWallet;
  if (round.votingStrategy === "one_per_wallet") return 1;

  // The Yellow feature supported NFT-weighted voting. Gnars keeps this safe by
  // defaulting to one wallet vote until an onchain snapshot indexer is configured.
  return 1;
}

export async function getRoundVoteUsage(
  roundId: string,
  walletAddress: string,
  client: Pool | PoolClient = getPool(),
) {
  const result = await client.query(
    `
      SELECT COALESCE(SUM(vote_count), 0)::int AS used_votes
      FROM round_votes
      WHERE round_id = $1 AND lower(wallet_address) = lower($2)
    `,
    [roundId, walletAddress],
  );

  return Number(result.rows[0]?.used_votes || 0);
}

export async function listRoundRequests(): Promise<RoundRequest[]> {
  if (!isRoundsDatabaseConfigured()) return [];

  await ensureTables();
  const result = await getPool().query(`
    SELECT ${requestSelectFields}
    FROM round_requests
    WHERE deleted_at IS NULL
    ORDER BY
      CASE status
        WHEN 'pending' THEN 0
        WHEN 'approved' THEN 1
        ELSE 2
      END,
      created_at DESC
  `);

  return result.rows.map(mapRoundRequest);
}

export async function createRoundRequest(input: RoundRequestInput) {
  if (!isRoundsDatabaseConfigured()) throw new Error("Rounds database is not configured.");

  const normalized = normalizeRoundRequest(input);
  const validationError = validateRoundRequest(normalized);
  if (validationError) throw new Error(validationError);

  await ensureTables();
  const result = await getPool().query(
    `
      INSERT INTO round_requests (
        id,
        wallet_address,
        requester_name,
        requester_email,
        requested_slug,
        title,
        description,
        content,
        image,
        url,
        timeline,
        starts_at,
        submissions_open_at,
        voting_starts_at,
        voting_ends_at,
        ends_at,
        voting_strategy,
        votes_per_wallet,
        winner_count,
        max_submissions_per_wallet,
        awards
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING ${requestSelectFields}
    `,
    [
      randomUUID(),
      normalized.walletAddress,
      normalized.requesterName,
      normalized.requesterEmail,
      normalized.requestedSlug,
      normalized.title,
      normalized.description,
      normalized.content,
      normalized.image,
      normalized.url || "",
      normalized.timeline || "",
      normalized.submissionsOpenAt,
      normalized.submissionsOpenAt,
      normalized.votingStartsAt,
      normalized.votingEndsAt,
      normalized.votingEndsAt,
      normalized.votingStrategy,
      normalized.votesPerWallet,
      normalized.winnerCount,
      normalized.maxSubmissionsPerWallet,
      JSON.stringify(normalized.awards),
    ],
  );

  return mapRoundRequest(result.rows[0]);
}

function normalizeRoundRequest(input: RoundRequestInput): RoundRequestInput {
  const title = input.title.trim();
  const winnerCount = toPositiveInteger(input.winnerCount, 1);

  return {
    walletAddress: isAddress(input.walletAddress)
      ? getAddress(input.walletAddress)
      : input.walletAddress,
    requesterName: input.requesterName.trim(),
    requesterEmail: input.requesterEmail.trim(),
    requestedSlug: normalizeRoundRequestSlug(input.requestedSlug || title),
    title,
    description: input.description.trim(),
    content: input.content.trim(),
    image: input.image.trim(),
    url: input.url?.trim() || "",
    timeline: input.timeline?.trim() || "",
    submissionsOpenAt: toIsoDate(input.submissionsOpenAt),
    votingStartsAt: toIsoDate(input.votingStartsAt),
    votingEndsAt: toIsoDate(input.votingEndsAt),
    votingStrategy: input.votingStrategy || "fixed_per_wallet",
    votesPerWallet: toPositiveInteger(input.votesPerWallet, 1),
    winnerCount,
    maxSubmissionsPerWallet: toPositiveInteger(input.maxSubmissionsPerWallet, 1),
    awards: normalizeRoundAwards(input.awards, winnerCount),
  };
}

function normalizeRoundAwards(awards: RoundAwardInput[], winnerCount: number) {
  const nextAwards = Array.from({ length: winnerCount }, (_, index) => {
    const existing = awards.find((award) => Number(award.position) === index + 1) || awards[index];
    return {
      position: index + 1,
      title: existing?.title?.trim() || `${ordinal(index + 1)} place`,
      description: existing?.description?.trim() || "",
      value: existing?.value?.trim() || "",
    };
  });

  return nextAwards;
}

function toIsoDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : value;
}

function toPositiveInteger(value: number, fallback: number) {
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function ordinal(value: number) {
  if (value === 1) return "1st";
  if (value === 2) return "2nd";
  if (value === 3) return "3rd";
  return `${value}th`;
}

export async function createRoundSubmission(slug: string, input: RoundSubmissionInput) {
  if (!isRoundsDatabaseConfigured()) throw new Error("Rounds database is not configured.");

  const round = await getPublicRoundBySlug(slug);
  if (!round) throw new Error("Round not found.");
  if (getRoundState(round) !== "submissions_open")
    throw new Error("This round is not accepting submissions.");

  const validationError = validateRoundSubmission(round, input);
  if (validationError) throw new Error(validationError);

  const walletAddress = getAddress(input.walletAddress);
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    const existing = await client.query(
      `
        SELECT COUNT(*)::int AS count
        FROM round_submissions
        WHERE round_id = $1 AND lower(wallet_address) = lower($2) AND deleted_at IS NULL
      `,
      [round.id, walletAddress],
    );

    if (Number(existing.rows[0]?.count || 0) >= round.maxSubmissionsPerWallet) {
      throw new Error("This wallet has reached the submission limit for this round.");
    }

    const result = await client.query(
      `
        INSERT INTO round_submissions (
          id, round_id, wallet_address, title, description, image, url, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'approved')
        RETURNING id
      `,
      [
        randomUUID(),
        round.id,
        walletAddress,
        input.title.trim(),
        input.description.trim(),
        input.image.trim(),
        input.url?.trim() || "",
      ],
    );
    await client.query("COMMIT");
    const detail = await getPool().query(
      `
        SELECT ${submissionSelectFields}
        FROM round_submissions s
        ${voteTotalsJoin}
        WHERE s.id = $1
        LIMIT 1
      `,
      [result.rows[0].id],
    );
    return mapSubmission(detail.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function castRoundVotes({
  slug,
  walletAddress,
  votes,
}: {
  slug: string;
  walletAddress: string;
  votes: RoundVoteAllocationInput[];
}) {
  if (!isRoundsDatabaseConfigured()) throw new Error("Rounds database is not configured.");

  const round = await getPublicRoundBySlug(slug);
  if (!round) throw new Error("Round not found.");
  if (getRoundState(round) !== "voting_open") throw new Error("Voting is not open for this round.");

  const votingPower = await getRoundVotingPower(round, walletAddress);
  const validationError = validateRoundVoteAllocation({ votingPower, votes });
  if (validationError) throw new Error(validationError);

  const normalizedWallet = getAddress(walletAddress);
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    const approvedIds = new Set(round.submissions.map((submission) => submission.id));
    if (votes.some((vote) => !approvedIds.has(vote.submissionId))) {
      throw new Error("Votes can only be cast for approved submissions.");
    }

    await client.query(
      `DELETE FROM round_votes WHERE round_id = $1 AND lower(wallet_address) = lower($2)`,
      [round.id, normalizedWallet],
    );

    for (const vote of votes) {
      await client.query(
        `
          INSERT INTO round_votes (id, round_id, submission_id, wallet_address, vote_count)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [randomUUID(), round.id, vote.submissionId, normalizedWallet, vote.voteCount],
      );
    }

    const usedVotes = await getRoundVoteUsage(round.id, normalizedWallet, client);
    if (usedVotes > votingPower) throw new Error("Vote allocation exceeds available voting power.");

    await client.query("COMMIT");
    return { votingPower, usedVotes };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
