import { keccak256, toBytes } from "viem";

export type RoundSignedAction = "request" | "submit" | "vote" | "admin";

export interface RoundSignatureMessageInput {
  action: RoundSignedAction;
  method: "POST";
  path: string;
  walletAddress: string;
  payload: unknown;
  issuedAt: string;
}

export function createRoundPayloadDigest(payload: unknown) {
  return keccak256(toBytes(stableStringify(payload)));
}

export function createRoundActionMessage({
  action,
  method,
  path,
  walletAddress,
  payload,
  issuedAt,
}: RoundSignatureMessageInput) {
  return [
    "Gnars Rounds",
    `Action: ${action}`,
    `Method: ${method}`,
    `Path: ${path}`,
    `Wallet: ${walletAddress.toLowerCase()}`,
    `Payload: ${createRoundPayloadDigest(payload)}`,
    `Issued At: ${issuedAt}`,
  ].join("\n");
}

/** Issued-at window (ms) within which a signed action message is accepted. */
export const ROUND_SIGNATURE_MAX_AGE_MS = 10 * 60 * 1000;

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}
