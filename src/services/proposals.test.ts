import { describe, expect, it } from "vitest";
import { deriveTerminalState } from "./proposals";

describe("deriveTerminalState", () => {
  it("returns null (not conclusively terminal) when no terminal fields are set", () => {
    expect(deriveTerminalState({})).toBeNull();
    expect(
      deriveTerminalState({
        cancelTransactionHash: null,
        vetoTransactionHash: null,
        executionTransactionHash: null,
        executedAt: null,
      }),
    ).toBeNull();
  });

  it("returns null when executedAt is present but zero/falsy", () => {
    expect(deriveTerminalState({ executedAt: "0" })).toBeNull();
    expect(deriveTerminalState({ executedAt: 0 })).toBeNull();
  });

  it("derives Canceled (2) from cancelTransactionHash, taking priority over other fields", () => {
    expect(deriveTerminalState({ cancelTransactionHash: "0xcancel" })).toBe(2);
    expect(
      deriveTerminalState({
        cancelTransactionHash: "0xcancel",
        executionTransactionHash: "0xexec",
      }),
    ).toBe(2);
  });

  it("derives Vetoed (8) from vetoTransactionHash", () => {
    expect(deriveTerminalState({ vetoTransactionHash: "0xveto" })).toBe(8);
  });

  it("derives Executed (7) from executionTransactionHash", () => {
    expect(deriveTerminalState({ executionTransactionHash: "0xexec" })).toBe(7);
  });

  it("derives Executed (7) from a non-zero executedAt when no executionTransactionHash is present", () => {
    expect(deriveTerminalState({ executedAt: "1700000000" })).toBe(7);
    expect(deriveTerminalState({ executedAt: 1700000000 })).toBe(7);
  });

  it("prioritizes Canceled over Vetoed over Executed when multiple fields are (implausibly) set", () => {
    expect(
      deriveTerminalState({
        vetoTransactionHash: "0xveto",
        executionTransactionHash: "0xexec",
      }),
    ).toBe(8);
  });
});
