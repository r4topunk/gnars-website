import "server-only";
import { getAddress, parseEventLogs, parseUnits, type Address, type Hex } from "viem";
import { STORE_CHECKOUT } from "@/lib/config";
import { serverPublicClient } from "@/lib/rpc";

/**
 * Verify a customer's on-chain USDC payment for a /store order.
 *
 * Trust nothing from the client except the tx hash: we re-read the receipt on Base and
 * confirm an actual USDC `Transfer` to our checkout wallet for at least the retail amount.
 * The caller derives the order's idempotency key from the tx hash, so the same payment can
 * never place two orders. See docs/features/store-checkout.md.
 *
 * NEVER import into client code.
 */

const ERC20_TRANSFER_EVENT = [
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
] as const;

/** Confirmations required before we treat a payment as final (Base blocks are ~2s). */
const MIN_CONFIRMATIONS = 1n;

export type PaymentVerification =
  | { ok: true; from: Address; amount: bigint; txHash: Hex }
  | { ok: false; code: PaymentErrorCode; message: string };

export type PaymentErrorCode =
  | "not_configured"
  | "not_found"
  | "not_confirmed"
  | "reverted"
  | "no_matching_transfer";

/**
 * @param txHash        Base tx hash the customer says paid.
 * @param amountUsd     Retail price in USD (e.g. 59.95); converted to 6-decimal USDC.
 */
export async function verifyUsdcPayment(
  txHash: string,
  amountUsd: number,
): Promise<PaymentVerification> {
  const recipient = STORE_CHECKOUT.recipient;
  if (!recipient) {
    return {
      ok: false,
      code: "not_configured",
      message: "Store checkout wallet (NEXT_PUBLIC_STORE_CHECKOUT_ADDRESS) is not set",
    };
  }

  const hash = txHash as Hex;
  const minAmount = parseUnits(amountUsd.toString(), STORE_CHECKOUT.usdcDecimals);

  let receipt;
  try {
    receipt = await serverPublicClient.getTransactionReceipt({ hash });
  } catch {
    return { ok: false, code: "not_found", message: "Transaction not found or not yet mined" };
  }

  if (receipt.status !== "success") {
    return { ok: false, code: "reverted", message: "Payment transaction reverted" };
  }

  const currentBlock = await serverPublicClient.getBlockNumber();
  if (currentBlock - receipt.blockNumber + 1n < MIN_CONFIRMATIONS) {
    return { ok: false, code: "not_confirmed", message: "Payment not yet confirmed" };
  }

  const wantRecipient = getAddress(recipient);
  const transfers = parseEventLogs({
    abi: ERC20_TRANSFER_EVENT,
    eventName: "Transfer",
    logs: receipt.logs,
  }).filter(
    (log) =>
      getAddress(log.address) === getAddress(STORE_CHECKOUT.usdc) &&
      getAddress(log.args.to) === wantRecipient &&
      log.args.value >= minAmount,
  );

  const match = transfers[0];
  if (!match) {
    return {
      ok: false,
      code: "no_matching_transfer",
      message: `No USDC transfer of ≥ $${amountUsd} to the checkout wallet in this tx`,
    };
  }

  return { ok: true, from: getAddress(match.args.from), amount: match.args.value, txHash: hash };
}
