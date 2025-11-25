import { z } from "zod";
import type { ProposalRepository } from "../db/repository.js";
import { generateEmbedding, findSimilar } from "../embeddings/generator.js";
import { chunkText, prepareProposalText } from "../embeddings/chunker.js";

export const searchProposalsSchema = z.object({
  query: z.string().min(3).describe("Natural language search query"),
  limit: z.number().min(1).max(20).default(5).describe("Maximum number of results to return"),
  status: z
    .enum([
      "PENDING",
      "ACTIVE",
      "CANCELLED",
      "DEFEATED",
      "SUCCEEDED",
      "QUEUED",
      "EXPIRED",
      "EXECUTED",
      "VETOED",
    ])
    .optional()
    .describe("Filter results by proposal status"),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe("Minimum similarity score (0-1)"),
});

export type SearchProposalsInput = z.infer<typeof searchProposalsSchema>;

export interface SearchProposalsOutput {
  results: Array<{
    proposalNumber: number;
    title: string;
    status: string;
    relevantExcerpt: string;
    similarity: number;
  }>;
  query: string;
  embeddingsIndexed: number;
}

export async function searchProposals(
  repo: ProposalRepository,
  input: SearchProposalsInput
): Promise<SearchProposalsOutput> {
  // Get all embeddings from database
  const allEmbeddings = repo.getAllEmbeddings();

  if (allEmbeddings.length === 0) {
    return {
      results: [],
      query: input.query,
      embeddingsIndexed: 0,
    };
  }

  // Filter by status if specified
  const filteredEmbeddings = input.status
    ? allEmbeddings.filter((e) => e.status === input.status)
    : allEmbeddings;

  if (filteredEmbeddings.length === 0) {
    return {
      results: [],
      query: input.query,
      embeddingsIndexed: allEmbeddings.length,
    };
  }

  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(input.query);

  // Find similar embeddings
  const similar = findSimilar(
    queryEmbedding,
    filteredEmbeddings.map((e) => ({
      id: `${e.proposalNumber}-${e.chunkIndex}`,
      embedding: e.embedding,
    })),
    input.limit * 3, // Get more results to deduplicate by proposal
    input.threshold
  );

  // Deduplicate by proposal (keep highest similarity per proposal)
  const proposalMap = new Map<
    number,
    {
      proposalNumber: number;
      title: string;
      status: string;
      relevantExcerpt: string;
      similarity: number;
    }
  >();

  for (const match of similar) {
    const [proposalNumStr] = match.id.split("-");
    const proposalNumber = parseInt(proposalNumStr, 10);

    // Find the embedding data for this match
    const embeddingData = filteredEmbeddings.find(
      (e) => e.proposalNumber === proposalNumber && `${e.proposalNumber}-${e.chunkIndex}` === match.id
    );

    if (!embeddingData) continue;

    // Only keep highest similarity for each proposal
    if (!proposalMap.has(proposalNumber) || proposalMap.get(proposalNumber)!.similarity < match.similarity) {
      proposalMap.set(proposalNumber, {
        proposalNumber,
        title: embeddingData.title,
        status: embeddingData.status,
        relevantExcerpt: truncateExcerpt(embeddingData.chunkText, 200),
        similarity: Math.round(match.similarity * 1000) / 1000, // Round to 3 decimals
      });
    }
  }

  // Convert to array and limit
  const results = Array.from(proposalMap.values())
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, input.limit);

  return {
    results,
    query: input.query,
    embeddingsIndexed: allEmbeddings.length,
  };
}

/**
 * Index embeddings for proposals that don't have them yet
 */
export async function indexProposalEmbeddings(
  repo: ProposalRepository,
  onProgress?: (current: number, total: number) => void
): Promise<{ indexed: number; errors: string[] }> {
  const proposals = repo.getProposalsWithoutEmbeddings();
  const errors: string[] = [];
  let indexed = 0;

  for (let i = 0; i < proposals.length; i++) {
    const proposal = proposals[i];

    try {
      // Prepare text for embedding
      const text = prepareProposalText(proposal.title, proposal.description);

      // Chunk the text
      const chunks = chunkText(text);

      // Generate and store embeddings for each chunk
      for (const chunk of chunks) {
        const embedding = await generateEmbedding(chunk.text);
        repo.upsertEmbedding(proposal.id, chunk.index, chunk.text, embedding);
      }

      indexed++;
      onProgress?.(i + 1, proposals.length);
    } catch (err) {
      errors.push(`Failed to index proposal ${proposal.proposal_number}: ${err}`);
    }
  }

  return { indexed, errors };
}

function truncateExcerpt(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  // Try to truncate at a word boundary
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");

  if (lastSpace > maxLength * 0.7) {
    return truncated.slice(0, lastSpace) + "...";
  }

  return truncated + "...";
}
