"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Dev/sandbox-only panel to place a KeepKey sandbox order (KK-TEST-001) from the browser
 * and watch its status, without any payment or checkout. Rendered on a /store device
 * detail page only while KEEPKEY_DROPSHIP_MODE=test (the server passes `enabled`), so it
 * disappears automatically in live mode. Never ships, never draws credit.
 */
export function SandboxOrderTester() {
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<{ keepKeyOrderId: string; status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function placeOrder() {
    setLoading(true);
    setError(null);
    setOrder(null);
    try {
      const res = await fetch("/api/store/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          externalOrderId: `gnars-sandbox-${Date.now()}`,
          customerName: "Gnars Sandbox",
          customerEmail: "sandbox@gnars.com",
          shippingAddress: {
            line1: "123 Skate St",
            city: "Denver",
            state: "CO",
            postalCode: "80202",
            country: "US",
          },
          lineItems: [{ sku: "KK-TEST-001", quantity: 1 }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
      setOrder({ keepKeyOrderId: data.keepKeyOrderId, status: data.status });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place order");
    } finally {
      setLoading(false);
    }
  }

  async function refreshStatus() {
    if (!order) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/store/orders/${order.keepKeyOrderId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
      setOrder({ keepKeyOrderId: data.keepKeyOrderId, status: data.status });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch status");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 rounded-xl border border-dashed border-border p-4">
      <div className="flex items-center gap-2">
        <span className="rounded bg-[#e08968]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#e08968]">
          Sandbox
        </span>
        <span className="text-xs text-muted-foreground">
          Dev tool — places a KeepKey <code>KK-TEST-001</code> order. No payment, never ships.
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={placeOrder} disabled={loading}>
          {loading && !order ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
          Place sandbox test order
        </Button>
        {order && (
          <Button size="sm" variant="outline" onClick={refreshStatus} disabled={loading}>
            {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            Refresh status
          </Button>
        )}
      </div>

      {order && (
        <p className="mt-3 font-mono text-xs text-foreground">
          {order.keepKeyOrderId} — <span className="text-[#e08968]">{order.status}</span>
        </p>
      )}
      {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
    </div>
  );
}
