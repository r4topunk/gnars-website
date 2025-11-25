import { describe, it, expect } from "vitest";
import { cosineSimilarity, findSimilar, EMBEDDING_DIMENSION } from "../../src/embeddings/generator.js";

describe("cosineSimilarity", () => {
  it("should return 1 for identical vectors", () => {
    const vec = [1, 2, 3, 4, 5];
    expect(cosineSimilarity(vec, vec)).toBeCloseTo(1, 5);
  });

  it("should return 0 for orthogonal vectors", () => {
    const vec1 = [1, 0, 0];
    const vec2 = [0, 1, 0];
    expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(0, 5);
  });

  it("should return -1 for opposite vectors", () => {
    const vec1 = [1, 2, 3];
    const vec2 = [-1, -2, -3];
    expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(-1, 5);
  });

  it("should handle normalized vectors", () => {
    const vec1 = [0.6, 0.8];
    const vec2 = [0.8, 0.6];
    const similarity = cosineSimilarity(vec1, vec2);
    expect(similarity).toBeGreaterThan(0.9);
    expect(similarity).toBeLessThan(1);
  });

  it("should throw for vectors of different lengths", () => {
    const vec1 = [1, 2, 3];
    const vec2 = [1, 2];
    expect(() => cosineSimilarity(vec1, vec2)).toThrow("Vectors must have same length");
  });

  it("should return 0 for zero vector", () => {
    const vec1 = [0, 0, 0];
    const vec2 = [1, 2, 3];
    expect(cosineSimilarity(vec1, vec2)).toBe(0);
  });
});

describe("findSimilar", () => {
  it("should find most similar embeddings", () => {
    const query = [1, 0, 0];
    const embeddings = [
      { id: "a", embedding: [1, 0, 0] }, // Most similar (identical)
      { id: "b", embedding: [0.9, 0.1, 0] }, // Very similar
      { id: "c", embedding: [0, 1, 0] }, // Orthogonal
      { id: "d", embedding: [-1, 0, 0] }, // Opposite
    ];

    const results = findSimilar(query, embeddings, 2, 0);

    expect(results).toHaveLength(2);
    expect(results[0].id).toBe("a");
    expect(results[0].similarity).toBeCloseTo(1, 5);
    expect(results[1].id).toBe("b");
  });

  it("should respect threshold", () => {
    const query = [1, 0, 0];
    const embeddings = [
      { id: "a", embedding: [1, 0, 0] }, // 1.0
      { id: "b", embedding: [0.5, 0.5, 0] }, // ~0.7
      { id: "c", embedding: [0, 1, 0] }, // 0
    ];

    const results = findSimilar(query, embeddings, 10, 0.5);

    expect(results).toHaveLength(2); // Only a and b above 0.5 threshold
    expect(results.map((r) => r.id)).toContain("a");
    expect(results.map((r) => r.id)).toContain("b");
    expect(results.map((r) => r.id)).not.toContain("c");
  });

  it("should respect topK limit", () => {
    const query = [1, 0, 0];
    const embeddings = [
      { id: "a", embedding: [1, 0, 0] },
      { id: "b", embedding: [0.9, 0.1, 0] },
      { id: "c", embedding: [0.8, 0.2, 0] },
      { id: "d", embedding: [0.7, 0.3, 0] },
    ];

    const results = findSimilar(query, embeddings, 2, 0);

    expect(results).toHaveLength(2);
  });

  it("should sort by similarity descending", () => {
    const query = [1, 0, 0];
    const embeddings = [
      { id: "c", embedding: [0.5, 0.5, 0] },
      { id: "a", embedding: [1, 0, 0] },
      { id: "b", embedding: [0.9, 0.1, 0] },
    ];

    const results = findSimilar(query, embeddings, 10, 0);

    expect(results[0].id).toBe("a");
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
    }
  });

  it("should handle empty embeddings", () => {
    const query = [1, 0, 0];
    const results = findSimilar(query, [], 5, 0);
    expect(results).toHaveLength(0);
  });
});

describe("EMBEDDING_DIMENSION", () => {
  it("should be 384 (all-MiniLM-L6-v2 output dimension)", () => {
    expect(EMBEDDING_DIMENSION).toBe(384);
  });
});
