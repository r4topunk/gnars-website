// Embedding generation using Hugging Face Transformers.js

import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

// Model: all-MiniLM-L6-v2 - 384 dimensions, fast and good quality
const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";

let embeddingPipeline: FeatureExtractionPipeline | null = null;

/**
 * Initialize the embedding pipeline (lazy loaded on first use)
 */
async function getEmbeddingPipeline(): Promise<FeatureExtractionPipeline> {
  if (!embeddingPipeline) {
    console.error("Loading embedding model (first use)...");
    embeddingPipeline = await pipeline("feature-extraction", MODEL_NAME, {
      dtype: "fp32",
    });
    console.error("Embedding model loaded.");
  }
  return embeddingPipeline;
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const pipe = await getEmbeddingPipeline();

  // Generate embedding with mean pooling
  const output = await pipe(text, { pooling: "mean", normalize: true });

  // Convert to array
  return Array.from(output.data as Float32Array);
}

/**
 * Generate embeddings for multiple texts (batched)
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const pipe = await getEmbeddingPipeline();

  const embeddings: number[][] = [];

  // Process in small batches to avoid memory issues
  const batchSize = 8;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    for (const text of batch) {
      const output = await pipe(text, { pooling: "mean", normalize: true });
      embeddings.push(Array.from(output.data as Float32Array));
    }
  }

  return embeddings;
}

/**
 * Compute cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

/**
 * Find most similar embeddings from a list
 */
export function findSimilar(
  queryEmbedding: number[],
  embeddings: Array<{ id: string; embedding: number[] }>,
  topK: number = 5,
  threshold: number = 0.3
): Array<{ id: string; similarity: number }> {
  const results = embeddings
    .map(({ id, embedding }) => ({
      id,
      similarity: cosineSimilarity(queryEmbedding, embedding),
    }))
    .filter(({ similarity }) => similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  return results;
}

// Export embedding dimension for schema
export const EMBEDDING_DIMENSION = 384;
