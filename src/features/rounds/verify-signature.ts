import "server-only";
import { verifyMessage } from "viem/actions";
import { serverPublicClient } from "@/lib/rpc";
import {
  createRoundActionMessage,
  ROUND_SIGNATURE_MAX_AGE_MS,
  type RoundSignatureMessageInput,
} from "./signature";

/**
 * Verify a signed Rounds action message server-side.
 *
 * Uses viem's public-client `verifyMessage` Action (ERC-6492 / ERC-1271 aware)
 * rather than the offline EOA-only utility. This is required because every
 * wallet on this site is wrapped in a thirdweb Smart Account (account
 * abstraction, `sponsorGas: true`), so `account.signMessage` produces an
 * ERC-1271 (deployed) or ERC-6492 (counterfactual) signature — never a raw
 * EOA ECDSA signature. Validating those requires an onchain call, which the
 * Action performs through `serverPublicClient` (Base). Plain EOA signatures
 * (e.g. an admin signing with their personal wallet) still verify via the
 * same path.
 */
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
  if (
    !Number.isFinite(issuedAtTime) ||
    Math.abs(Date.now() - issuedAtTime) > ROUND_SIGNATURE_MAX_AGE_MS
  ) {
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

  try {
    return await verifyMessage(serverPublicClient, {
      address: walletAddress as `0x${string}`,
      message,
      signature,
    });
  } catch {
    // Malformed signature blob or RPC failure → treat as unverified.
    return false;
  }
}
