"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, Package } from "lucide-react";
import { toast } from "sonner";
import { useConnectModal } from "thirdweb/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUsdcPayment } from "@/hooks/use-usdc-payment";
import { useUserAddress } from "@/hooks/use-user-address";
import { STORE_CHECKOUT } from "@/lib/config";
import { getThirdwebClient } from "@/lib/thirdweb";
import { THIRDWEB_AA_CONFIG, THIRDWEB_WALLETS } from "@/lib/thirdweb-wallets";
import type { Currency } from "@/types/store";
import { formatPrice } from "./shared";

interface Finish {
  id: string;
  title: string;
  disabled: boolean;
}

interface CheckoutFlowProps {
  slug: string;
  title: string;
  price: number;
  currency: Currency;
  finishes: Finish[];
  defaultFinish?: string;
  /** True when KEEPKEY_DROPSHIP_MODE=test — payment is skipped, order never ships. */
  sandbox: boolean;
}

interface OrderResult {
  keepKeyOrderId: string;
  externalOrderId: string;
  status: string;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  carrier?: string | null;
}

const TERMINAL = new Set(["shipped", "cancelled", "failed"]);

const EMPTY_FORM = {
  customerName: "",
  customerEmail: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "US",
};

export function CheckoutFlow({
  slug,
  title,
  price,
  currency,
  finishes,
  defaultFinish,
  sandbox,
}: CheckoutFlowProps) {
  const t = useTranslations("store");
  const { isConnected } = useUserAddress();
  const { connect: openConnectModal } = useConnectModal();
  const { pay, isPaying } = useUsdcPayment();

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [finish, setFinish] = useState(
    defaultFinish ?? finishes.find((f) => !f.disabled)?.title ?? "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<OrderResult | null>(null);

  const set = (k: keyof typeof EMPTY_FORM, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const recipientConfigured = Boolean(STORE_CHECKOUT.recipient);

  function validate(): string | null {
    if (!form.customerName.trim()) return t("checkout.errors.name");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.customerEmail)) return t("checkout.errors.email");
    if (!form.line1.trim()) return t("checkout.errors.line1");
    if (!form.city.trim()) return t("checkout.errors.city");
    if (!form.postalCode.trim()) return t("checkout.errors.postalCode");
    if (form.country.trim().length !== 2) return t("checkout.errors.country");
    if (form.country.toUpperCase() === "US" && !form.state.trim())
      return t("checkout.errors.state");
    return null;
  }

  async function placeOrder(txHash?: string) {
    const res = await fetch("/api/store/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        finish,
        customerName: form.customerName.trim(),
        customerEmail: form.customerEmail.trim(),
        shippingAddress: {
          line1: form.line1.trim(),
          line2: form.line2.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          postalCode: form.postalCode.trim(),
          country: form.country.trim().toUpperCase(),
        },
        ...(txHash ? { txHash } : {}),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
    setOrder({
      keepKeyOrderId: data.keepKeyOrderId,
      externalOrderId: data.externalOrderId,
      status: data.status,
    });
  }

  async function onSubmit() {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    setSubmitting(true);
    try {
      if (sandbox) {
        await placeOrder();
        return;
      }

      // Live: require a configured wallet + an on-chain USDC payment first.
      if (!recipientConfigured) {
        toast.error(t("checkout.errors.notConfigured"));
        return;
      }
      if (!isConnected) {
        const client = getThirdwebClient();
        if (client) {
          await openConnectModal({
            client,
            wallets: THIRDWEB_WALLETS,
            accountAbstraction: THIRDWEB_AA_CONFIG,
            size: "compact",
            title: t("checkout.connectTitle"),
          });
        }
        return;
      }
      const txHash = await pay({
        to: STORE_CHECKOUT.recipient as `0x${string}`,
        amountUsd: price,
      });
      toast.success(t("checkout.paid"));
      await placeOrder(txHash);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("checkout.errors.generic"));
    } finally {
      setSubmitting(false);
    }
  }

  if (order) {
    return <OrderConfirmation order={order} title={title} sandbox={sandbox} />;
  }

  const busy = submitting || isPaying;
  const payLabel = sandbox
    ? t("checkout.placeSandbox")
    : !isConnected
      ? t("checkout.connectToPay")
      : t("checkout.payAmount", { amount: formatPrice(price, currency) });

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href={`/store/${slug}`}
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t("detail.backToStore")}
      </Link>

      <h1 className="text-2xl font-bold">{t("checkout.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {title} —{" "}
        <span className="font-medium text-foreground">{formatPrice(price, currency)}</span>
      </p>

      {sandbox && (
        <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {t("checkout.sandboxNotice")}
        </div>
      )}

      <div className="mt-6 space-y-4">
        {finishes.length > 1 && (
          <Field label={t("detail.finish")}>
            <Select value={finish} onValueChange={setFinish}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {finishes.map((f) => (
                  <SelectItem key={f.id} value={f.title} disabled={f.disabled}>
                    {f.title}
                    {f.disabled ? ` (${t("card.outOfStock")})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("checkout.fields.name")}>
            <Input
              value={form.customerName}
              onChange={(e) => set("customerName", e.target.value)}
            />
          </Field>
          <Field label={t("checkout.fields.email")}>
            <Input
              type="email"
              value={form.customerEmail}
              onChange={(e) => set("customerEmail", e.target.value)}
            />
          </Field>
        </div>

        <Field label={t("checkout.fields.line1")}>
          <Input value={form.line1} onChange={(e) => set("line1", e.target.value)} />
        </Field>
        <Field label={t("checkout.fields.line2")} optional>
          <Input value={form.line2} onChange={(e) => set("line2", e.target.value)} />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label={t("checkout.fields.city")}>
            <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
          </Field>
          <Field label={t("checkout.fields.state")}>
            <Input value={form.state} onChange={(e) => set("state", e.target.value)} />
          </Field>
          <Field label={t("checkout.fields.postalCode")}>
            <Input value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
          </Field>
        </div>

        <Field label={t("checkout.fields.country")}>
          <Input
            value={form.country}
            maxLength={2}
            onChange={(e) => set("country", e.target.value.toUpperCase())}
            className="w-24"
          />
        </Field>
      </div>

      <Button size="lg" className="mt-6 w-full" onClick={onSubmit} disabled={busy}>
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {payLabel}
      </Button>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        {sandbox ? t("checkout.sandboxFootnote") : t("checkout.payFootnote")}
      </p>
    </div>
  );
}

function Field({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations("store");
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">
        {label}
        {optional ? ` (${t("checkout.optional")})` : ""}
      </Label>
      {children}
    </div>
  );
}

function OrderConfirmation({
  order,
  title,
  sandbox,
}: {
  order: OrderResult;
  title: string;
  sandbox: boolean;
}) {
  const t = useTranslations("store");
  const [current, setCurrent] = useState(order);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/store/orders?externalOrderId=${encodeURIComponent(order.externalOrderId)}`,
      );
      if (!res.ok) return;
      const data = await res.json();
      setCurrent({
        keepKeyOrderId: data.keepKeyOrderId,
        externalOrderId: data.externalOrderId,
        status: data.status,
        trackingNumber: data.trackingNumber,
        trackingUrl: data.trackingUrl,
        carrier: data.carrier,
      });
    } catch {
      // transient — next tick retries
    }
  }, [order.externalOrderId]);

  useEffect(() => {
    if (TERMINAL.has(current.status)) return;
    timer.current = setInterval(refresh, 12_000);
    return () => clearInterval(timer.current);
  }, [current.status, refresh]);

  return (
    <div className="mx-auto max-w-lg text-center">
      <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
      <h1 className="mt-4 text-2xl font-bold">{t("checkout.success.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("checkout.success.subtitle", { title })}
      </p>

      <div className="mt-6 rounded-xl border border-border p-4 text-left">
        <Row label={t("checkout.success.orderId")} value={current.keepKeyOrderId} mono />
        <Row
          label={t("checkout.success.status")}
          value={
            t.has(`checkout.status.${current.status}`)
              ? t(`checkout.status.${current.status}`)
              : current.status
          }
        />
        {current.trackingNumber && (
          <Row
            label={current.carrier ?? t("checkout.success.tracking")}
            value={current.trackingNumber}
            href={current.trackingUrl ?? undefined}
          />
        )}
      </div>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Package className="h-3.5 w-3.5" />
        {sandbox ? t("checkout.success.sandboxNote") : t("checkout.success.liveNote")}
      </p>

      <div className="mt-6 flex justify-center gap-2">
        <Button variant="outline" size="sm" onClick={refresh}>
          {t("checkout.success.refresh")}
        </Button>
        <Button asChild size="sm">
          <Link href="/store">{t("checkout.success.backToStore")}</Link>
        </Button>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  href,
}: {
  label: string;
  value: string;
  mono?: boolean;
  href?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 py-2 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className={`text-sm text-primary underline ${mono ? "font-mono" : ""}`}
        >
          {value}
        </a>
      ) : (
        <span className={`text-sm ${mono ? "font-mono" : ""}`}>{value}</span>
      )}
    </div>
  );
}
