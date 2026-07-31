import "server-only";
import { BASE_URL } from "@/lib/config";
import type { ShippingAddress } from "@/lib/schemas/dropship";
import { emailFrom, getMailTransport, isEmailConfigured } from "./mailer";

/**
 * Order-confirmation email for a /store purchase. Best-effort: `sendOrderReceiptEmail`
 * never throws — a mail failure must not fail an order that's already placed. Returns
 * whether the mail was actually sent.
 */

export interface OrderReceiptInput {
  to: string;
  customerName: string;
  productTitle: string;
  finish?: string;
  /** Retail total in `currency`. */
  amount: number;
  currency: string;
  keepKeyOrderId: string;
  externalOrderId: string;
  shippingAddress: ShippingAddress;
  /** Sandbox orders are test-only (never shipped); the email says so. */
  sandbox: boolean;
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function addressLines(a: ShippingAddress): string[] {
  return [
    a.line1,
    a.line2 || "",
    [a.city, a.state, a.postalCode].filter(Boolean).join(", "),
    a.country,
  ].filter((l) => l.trim().length > 0);
}

export function orderReceiptSubject(input: OrderReceiptInput): string {
  const tag = input.sandbox ? "[TEST] " : "";
  return `${tag}Your Gnars order — ${input.productTitle}`;
}

export function orderReceiptText(input: OrderReceiptInput): string {
  const lines = [
    input.sandbox ? "*** TEST ORDER — nothing was charged and nothing will ship. ***\n" : "",
    `Hi ${input.customerName},`,
    "",
    input.sandbox
      ? "This is a sandbox confirmation so you can preview the flow."
      : "Thanks for your order! Here are the details.",
    "",
    `Product: ${input.productTitle}${input.finish ? ` (${input.finish})` : ""}`,
    `Total: ${formatMoney(input.amount, input.currency)}`,
    `Order ID: ${input.keepKeyOrderId}`,
    "",
    "Shipping to:",
    ...addressLines(input.shippingAddress).map((l) => `  ${l}`),
    "",
    input.sandbox
      ? "No shipment will be created for a test order."
      : "Fulfilled and shipped by KeepKey. We'll follow up with tracking once it ships.",
    "",
    `Store: ${BASE_URL}/store`,
    "",
    "— Gnars",
  ];
  return lines.filter((l) => l !== null && l !== undefined).join("\n");
}

export function orderReceiptHtml(input: OrderReceiptInput): string {
  const money = formatMoney(input.amount, input.currency);
  const addr = addressLines(input.shippingAddress)
    .map((l) => esc(l))
    .join("<br>");
  const banner = input.sandbox
    ? `<div style="background:#fff3cd;color:#664d03;border:1px solid #ffe69c;border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:20px">
         <strong>Test order</strong> — nothing was charged and nothing will ship.
       </div>`
    : "";
  const shipNote = input.sandbox
    ? "No shipment will be created for a test order."
    : "Fulfilled and shipped by KeepKey. We'll email tracking once it ships.";

  return `<!-- order receipt -->
<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0a0a0a">
  <h1 style="font-size:20px;margin:0 0 4px">Order confirmed</h1>
  <p style="color:#666;margin:0 0 20px">Hi ${esc(input.customerName)}, thanks for your order.</p>
  ${banner}
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #eee;color:#666">Product</td>
      <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right">${esc(input.productTitle)}${input.finish ? ` <span style="color:#666">(${esc(input.finish)})</span>` : ""}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #eee;color:#666">Total</td>
      <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;font-weight:600">${esc(money)}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #eee;color:#666">Order ID</td>
      <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;font-family:monospace">${esc(input.keepKeyOrderId)}</td>
    </tr>
  </table>
  <p style="font-size:13px;color:#666;margin:20px 0 6px">Shipping to</p>
  <p style="font-size:14px;margin:0 0 20px;line-height:1.5">${addr}</p>
  <p style="font-size:13px;color:#666;margin:0 0 24px">${shipNote}</p>
  <a href="${BASE_URL}/store" style="display:inline-block;background:#0a0a0a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px">Visit the store</a>
  <p style="font-size:12px;color:#999;margin-top:28px">Gnars DAO · ${esc(BASE_URL)}</p>
</div>`;
}

export async function sendOrderReceiptEmail(input: OrderReceiptInput): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.warn("[order-receipt] EMAIL_USER/EMAIL_PASS not set — skipping receipt email");
    return false;
  }
  try {
    await getMailTransport().sendMail({
      from: emailFrom(),
      to: input.to,
      subject: orderReceiptSubject(input),
      text: orderReceiptText(input),
      html: orderReceiptHtml(input),
    });
    return true;
  } catch (error) {
    console.error("[order-receipt] failed to send:", error);
    return false;
  }
}
