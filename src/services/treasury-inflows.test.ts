import { describe, expect, it } from "vitest";
import { matchLedgerCredit, SUBNET_FINAL_SPLIT, SWAP_FEE_SPLIT } from "./treasury-inflows";

/**
 * Real shape, from the credit that funded the 2026-08-19 withdrawal: warehouse
 * ERC-6909 `Transfer`, topic1 = the split that paid, data = abi.encode(caller,
 * amount). That withdrawal spent weeks tagged generic "Splits" because the
 * classifier only ever read the withdrawal's own receipt, which names no split.
 */
const topic = (a: string) => `0x${a.replace(/^0x/, "").padStart(64, "0")}`;
const credit = (split: string, raw: bigint) => ({
  topics: [
    "0x1b3d7edb2e9c0b0e7c525b20aaaef0f5940d2ed71663c7d39266ecafac728859",
    topic(split),
    topic("0x72ad986ebac0246d2b3c565ab2a1ce3a14ce6f88"),
    topic("0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"),
  ],
  data: `0x${topic(split).slice(2)}${raw.toString(16).padStart(64, "0")}`,
});

// 7.843441 USDC — the exact amount credited by the subnet split at block
// 50182875 and withdrawn ten blocks later.
const SUBNET_AMOUNT = 7_843_441n;

describe("matchLedgerCredit", () => {
  it("attributes a bare withdraw to the split that credited the same amount", () => {
    expect(matchLedgerCredit([credit(SUBNET_FINAL_SPLIT, SUBNET_AMOUNT)], SUBNET_AMOUNT)).toBe(
      "subnet",
    );
  });

  it("picks the matching credit out of a window holding several", () => {
    const logs = [
      credit(SWAP_FEE_SPLIT, 86_904n),
      credit(SUBNET_FINAL_SPLIT, SUBNET_AMOUNT),
      credit(SUBNET_FINAL_SPLIT, 18_268_694n),
    ];
    expect(matchLedgerCredit(logs, 86_904n)).toBe("swap");
    expect(matchLedgerCredit(logs, SUBNET_AMOUNT)).toBe("subnet");
  });

  it("asserts nothing when no credit matches the amount", () => {
    expect(matchLedgerCredit([credit(SUBNET_FINAL_SPLIT, 1n)], SUBNET_AMOUNT)).toBeNull();
  });

  it("asserts nothing when two products credited the identical amount", () => {
    const logs = [credit(SUBNET_FINAL_SPLIT, SUBNET_AMOUNT), credit(SWAP_FEE_SPLIT, SUBNET_AMOUNT)];
    expect(matchLedgerCredit(logs, SUBNET_AMOUNT)).toBeNull();
  });

  it("ignores an unmapped split even on an exact amount match", () => {
    const logs = [
      credit("0xd9b2000000000000000000000000000000000ad6b".slice(0, 42), SUBNET_AMOUNT),
    ];
    expect(matchLedgerCredit(logs, SUBNET_AMOUNT)).toBeNull();
  });

  it("survives a truncated or malformed log without throwing", () => {
    expect(matchLedgerCredit([{ topics: [], data: "0x" }], SUBNET_AMOUNT)).toBeNull();
  });

  it("treats the same amount from two credits of ONE product as that product", () => {
    const logs = [
      credit(SUBNET_FINAL_SPLIT, SUBNET_AMOUNT),
      credit(SUBNET_FINAL_SPLIT, SUBNET_AMOUNT),
    ];
    expect(matchLedgerCredit(logs, SUBNET_AMOUNT)).toBe("subnet");
  });
});
