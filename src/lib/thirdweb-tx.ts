import type { Chain } from "thirdweb/chains";
import type { Wallet } from "thirdweb/wallets";

export type TxErrorCategory = "user-rejected" | "reverted" | "timeout" | "unknown";

export interface NormalizedTxError {
  category: TxErrorCategory;
  message: string;
}

/**
 * Classifies a write-path error into a fixed set of categories so every
 * hook can show consistent toasts and decide whether to retry without
 * reimplementing string matching logic.
 */
export function normalizeTxError(err: unknown): NormalizedTxError {
  let message = "Unknown error";

  if (typeof err === "string") {
    message = err;
  } else if (err && typeof err === "object" && "message" in err) {
    const raw = (err as { message?: unknown }).message;
    message = raw ? String(raw) : "Unknown error";
  }

  // EIP-1193: user rejected request
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code?: unknown }).code;
    if (code === 4001 || code === "ACTION_REJECTED") {
      return { category: "user-rejected", message };
    }
  }

  const lower = message.toLowerCase();

  if (
    lower.includes("user rejected") ||
    lower.includes("user denied") ||
    lower.includes("rejected the request") ||
    lower.includes("rejected by user") ||
    lower.includes("action rejected") ||
    lower.includes("transaction was rejected") ||
    lower.includes("user cancelled") ||
    lower.includes("request rejected")
  ) {
    return { category: "user-rejected", message };
  }

  if (lower.includes("timeout") || lower.includes("request timeout")) {
    return { category: "timeout", message };
  }

  if (lower.includes("reverted") || lower.includes("execution reverted")) {
    return { category: "reverted", message };
  }

  return { category: "unknown", message };
}

/**
 * Ensures the active thirdweb wallet is on the requested chain before
 * signing. Noop if the wallet is absent or already on the right chain.
 * Any switch failure propagates so the caller can decide how to toast.
 */
export async function ensureOnChain(wallet: Wallet | undefined, chain: Chain): Promise<void> {
  if (!wallet) return;
  if (wallet.getChain()?.id === chain.id) return;
  await wallet.switchChain(chain);
}
