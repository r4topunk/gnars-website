import { describe, expect, it } from "vitest";
import { createRoundActionMessage, createRoundPayloadDigest } from "./signature";

describe("createRoundPayloadDigest", () => {
  it("is independent of object key order (client and server must agree)", () => {
    const a = createRoundPayloadDigest({
      walletAddress: "0xabc",
      votes: [{ submissionId: "s1", voteCount: 2 }],
    });
    const b = createRoundPayloadDigest({
      votes: [{ voteCount: 2, submissionId: "s1" }],
      walletAddress: "0xabc",
    });
    expect(a).toBe(b);
  });

  it("changes when the payload changes", () => {
    const base = createRoundPayloadDigest({
      walletAddress: "0xabc",
      votes: [{ submissionId: "s1", voteCount: 2 }],
    });
    const tampered = createRoundPayloadDigest({
      walletAddress: "0xabc",
      votes: [{ submissionId: "s1", voteCount: 3 }],
    });
    expect(tampered).not.toBe(base);
  });
});

describe("createRoundActionMessage", () => {
  const input = {
    action: "vote" as const,
    method: "POST" as const,
    path: "/api/rounds/clip-round/vote",
    walletAddress: "0xAbC0000000000000000000000000000000000001",
    payload: { walletAddress: "0xAbC0000000000000000000000000000000000001", votes: [] },
    issuedAt: "2026-05-28T12:00:00.000Z",
  };

  it("binds action, method, path, lowercased wallet, payload digest, and issuedAt", () => {
    const message = createRoundActionMessage(input);
    expect(message).toContain("Gnars Rounds");
    expect(message).toContain("Action: vote");
    expect(message).toContain("Method: POST");
    expect(message).toContain(`Path: ${input.path}`);
    expect(message).toContain(`Wallet: ${input.walletAddress.toLowerCase()}`);
    expect(message).toContain(`Payload: ${createRoundPayloadDigest(input.payload)}`);
    expect(message).toContain(`Issued At: ${input.issuedAt}`);
  });

  it("produces a different message when the bound action changes (no cross-action replay)", () => {
    const vote = createRoundActionMessage(input);
    const submit = createRoundActionMessage({ ...input, action: "submit" });
    expect(vote).not.toBe(submit);
  });
});
