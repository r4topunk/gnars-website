import { keccak256, toBytes, verifyMessage } from "viem";

export type RoundSignedAction = "request" | "submit" | "vote";

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

export async function verifyRoundActionSignature({
  action,
  method,
  path,
  walletAddress,
  payload,
  issuedAt,
  signature,
}: RoundSignatureMessageInput & { signature: `0x${string}` }) {
  const issuedAtTime = new Date(issuedAt).getTime();
  if (!Number.isFinite(issuedAtTime) || Math.abs(Date.now() - issuedAtTime) > 10 * 60 * 1000) {
    return false;
  }

  const message = createRoundActionMessage({
    action,
    method,
    path,
    walletAddress,
    payload,
    issuedAt,
  });
  return verifyMessage({
    address: walletAddress as `0x${string}`,
    message,
    signature,
  });
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}
