import { z } from "zod";

/**
 * KeepKey Dropship API shapes.
 * Base: https://affiliates.keepkey.com/api/dropship/v1 — see docs/integrations/keepkey-fulfillment.md
 */

/** Live fulfillment states reported by KeepKey. */
export const DROPSHIP_ORDER_STATUSES = [
  "received",
  "processing",
  "shipped",
  "cancelled",
  "failed",
] as const;
export type DropshipOrderStatus = (typeof DROPSHIP_ORDER_STATUSES)[number];

/** Webhook event types KeepKey emits on status changes. */
export const DROPSHIP_WEBHOOK_EVENTS = [
  "order.received",
  "order.processing",
  "order.shipped",
  "order.cancelled",
  "order.failed",
] as const;
export type DropshipWebhookEvent = (typeof DROPSHIP_WEBHOOK_EVENTS)[number];

export interface DropshipProduct {
  sku: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  availability: "in_stock" | "out_of_stock" | "discontinued";
  images: string[];
  /** null = ships anywhere KeepKey normally ships; otherwise ISO country codes. */
  shippingRegions: string[] | null;
}

/**
 * Crypto settlement KeepKey owes-to on a live order (what the store pays KeepKey,
 * drawn against the credit line). Null in sandbox.
 */
export interface DropshipSettlement {
  amountDue: number;
  currency: string;
  chain: string;
  depositAddress: string;
  chainAmount: number;
  chainCurrency: string;
  dueAt: string;
  status: "unpaid" | "paid" | string;
}

export interface DropshipOrderResult {
  keepKeyOrderId: string;
  status: DropshipOrderStatus;
  estimatedShippingDate: string | null;
  sandbox: boolean;
  settlement: DropshipSettlement | null;
}

export interface DropshipOrderRecord {
  keepKeyOrderId: string;
  externalOrderId: string;
  status: DropshipOrderStatus;
  trackingNumber: string | null;
  trackingUrl: string | null;
  carrier: string | null;
  shippedAt: string | null;
  estimatedShippingDate?: string | null;
  /**
   * The order's crypto settlement, re-returned by `GET /orders?externalOrderId=…`.
   * Lets us recover an order's `depositAddress` / `amountDue` / `dueAt` if the
   * create-order response was lost. Null/absent in sandbox.
   */
  settlement?: DropshipSettlement | null;
}

export const shippingAddressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional().default(""),
  city: z.string().min(1),
  state: z.string().optional().default(""),
  postalCode: z.string().min(1),
  country: z.string().length(2, "ISO 3166-1 alpha-2 country code"),
});

export const dropshipOrderInputSchema = z.object({
  externalOrderId: z.string().min(1),
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  shippingAddress: shippingAddressSchema,
  lineItems: z
    .array(z.object({ sku: z.string().min(1), quantity: z.number().int().positive() }))
    .min(1),
  // KeepKey requires shippingMethod on every order; default so callers can omit it.
  shippingMethod: z.string().default("standard"),
  notes: z.string().optional(),
});

export type DropshipOrderInput = z.infer<typeof dropshipOrderInputSchema>;

/** Webhook payload KeepKey POSTs to us (signed via X-KeepKey-Signature). */
export const dropshipWebhookSchema = z.object({
  eventType: z.enum(DROPSHIP_WEBHOOK_EVENTS),
  keepKeyOrderId: z.string(),
  externalOrderId: z.string(),
  status: z.enum(DROPSHIP_ORDER_STATUSES),
  trackingNumber: z.string().nullish(),
  trackingUrl: z.string().nullish(),
  carrier: z.string().nullish(),
  timestamp: z.string(),
});

export type DropshipWebhookPayload = z.infer<typeof dropshipWebhookSchema>;
