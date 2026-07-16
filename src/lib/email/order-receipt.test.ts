import { describe, expect, it } from "vitest";
import {
  orderReceiptHtml,
  orderReceiptSubject,
  orderReceiptText,
  type OrderReceiptInput,
} from "./order-receipt";

const base: OrderReceiptInput = {
  to: "buyer@example.com",
  customerName: "Vlad",
  productTitle: "KeepKey Hardware Wallet",
  finish: "Classic",
  amount: 59.95,
  currency: "USD",
  keepKeyOrderId: "kk_abc123",
  externalOrderId: "gnars-web-sandbox-1",
  shippingAddress: {
    line1: "123 Skate St",
    line2: "",
    city: "Denver",
    state: "CO",
    postalCode: "80202",
    country: "US",
  },
  sandbox: true,
};

describe("order receipt template", () => {
  it("tags the subject as a test order in sandbox", () => {
    expect(orderReceiptSubject({ ...base, sandbox: true })).toMatch(/^\[TEST\]/);
    expect(orderReceiptSubject({ ...base, sandbox: false })).not.toMatch(/TEST/);
  });

  it("includes order id, price and product in the text body", () => {
    const txt = orderReceiptText({ ...base, sandbox: false });
    expect(txt).toContain("kk_abc123");
    expect(txt).toContain("$59.95");
    expect(txt).toContain("KeepKey Hardware Wallet (Classic)");
    expect(txt).toContain("123 Skate St");
  });

  it("says nothing ships for a sandbox order", () => {
    expect(orderReceiptText({ ...base, sandbox: true })).toContain("test order");
    expect(orderReceiptHtml({ ...base, sandbox: true })).toContain("nothing will ship");
  });

  it("promises tracking for a live order", () => {
    expect(orderReceiptText({ ...base, sandbox: false })).toContain("tracking");
    expect(orderReceiptHtml({ ...base, sandbox: false })).toContain("tracking");
  });

  it("escapes HTML in user-supplied fields (no injection)", () => {
    const html = orderReceiptHtml({
      ...base,
      customerName: "<script>alert(1)</script>",
      productTitle: 'Wallet & "Friends" <b>',
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp;");
    expect(html).toContain("&quot;");
  });

  it("omits an empty address line2", () => {
    const txt = orderReceiptText({
      ...base,
      shippingAddress: { ...base.shippingAddress, line2: "" },
    });
    // No blank indented line between line1 and the city line.
    expect(txt).not.toMatch(/123 Skate St\n {2}\n/);
  });

  it("formats an unknown currency without throwing", () => {
    const txt = orderReceiptText({ ...base, currency: "XYZ" as string });
    expect(txt).toContain("59.95");
  });
});
