import { describe, it, expect } from "vitest";
import { chunkText, prepareProposalText } from "../../src/embeddings/chunker.js";

describe("chunkText", () => {
  it("should return single chunk for short text", () => {
    const text = "This is a short text that fits in one chunk.";
    const chunks = chunkText(text);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe(text);
    expect(chunks[0].index).toBe(0);
  });

  it("should split long text into multiple chunks", () => {
    const text = "A".repeat(1000);
    const chunks = chunkText(text, { maxChunkSize: 200, overlap: 20 });

    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((chunk, i) => {
      expect(chunk.index).toBe(i);
      expect(chunk.text.length).toBeLessThanOrEqual(200);
    });
  });

  it("should try to break at sentence boundaries", () => {
    const text =
      "This is the first sentence. This is the second sentence. This is the third sentence. This is the fourth sentence.";
    const chunks = chunkText(text, { maxChunkSize: 60, overlap: 10 });

    // Each chunk should ideally end with a sentence
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("should handle paragraph breaks", () => {
    const text = "First paragraph content.\n\nSecond paragraph content.\n\nThird paragraph content.";
    const chunks = chunkText(text, { maxChunkSize: 50, overlap: 5 });

    expect(chunks.length).toBeGreaterThan(1);
  });

  it("should clean up extra whitespace", () => {
    const text = "Some text\r\n\r\n\r\nwith extra\n\n\n\nnewlines";
    const chunks = chunkText(text);

    expect(chunks[0].text).not.toContain("\r\n");
    expect(chunks[0].text).not.toContain("\n\n\n");
  });
});

describe("prepareProposalText", () => {
  it("should combine title and description", () => {
    const result = prepareProposalText("My Title", "My description");
    expect(result).toBe("My Title\n\nMy description");
  });

  it("should remove markdown headers", () => {
    const result = prepareProposalText("Title", "## Summary\n\nSome content\n\n### Details\n\nMore content");
    expect(result).not.toContain("##");
    expect(result).toContain("Summary");
    expect(result).toContain("Details");
  });

  it("should remove bold and italic markers", () => {
    const result = prepareProposalText("Title", "This is **bold** and *italic* text");
    expect(result).not.toContain("**");
    expect(result).not.toContain("*");
    expect(result).toContain("bold");
    expect(result).toContain("italic");
  });

  it("should convert links to text", () => {
    const result = prepareProposalText("Title", "Check [this link](https://example.com) out");
    expect(result).not.toContain("](");
    expect(result).toContain("this link");
  });

  it("should remove code blocks", () => {
    const result = prepareProposalText("Title", "Here is `inline code` and ```block code```");
    expect(result).not.toContain("`");
  });

  it("should remove list markers", () => {
    const result = prepareProposalText("Title", "- Item 1\n* Item 2\n+ Item 3\n1. Item 4");
    expect(result).not.toMatch(/^[-*+]\s/m);
    expect(result).not.toMatch(/^\d+\.\s/m);
    expect(result).toContain("Item 1");
  });
});
