"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { CheckCircle2, FlaskConical, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ShopItem } from "@/types/shop";
import { formatPrice } from "./shared";

type Step = "form" | "processing" | "success";

function makeOrderId() {
  return `GN-${Date.now().toString(36).toUpperCase()}`;
}

export function SimulatePurchaseDialog({ item }: { item: ShopItem }) {
  const t = useTranslations("shop");
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [orderId, setOrderId] = useState("");
  const [form, setForm] = useState({ name: "", email: "", country: "" });

  const price = formatPrice(item.priceUSD);
  const canPay = form.name.trim() && form.email.trim() && form.country.trim();

  function reset() {
    setStep("form");
    setForm({ name: "", email: "", country: "" });
    setOrderId("");
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setTimeout(reset, 200);
  }

  function handlePay() {
    setStep("processing");
    // Simulated payment + fulfillment — no real charge, no network call.
    setTimeout(() => {
      setOrderId(makeOrderId());
      setStep("success");
    }, 1600);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="lg">{t("simulate.cta")}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
            {t("simulate.title")}
          </DialogTitle>
          <DialogDescription>{t("simulate.disclaimer")}</DialogDescription>
        </DialogHeader>

        {/* Order summary */}
        <div className="flex items-center gap-3 rounded-lg border p-3">
          <div className="relative h-14 w-14 shrink-0">
            <Image src={item.images[0]} alt={item.title} fill className="object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{item.title}</p>
            {item.vendor && <p className="text-xs text-muted-foreground">{item.vendor}</p>}
          </div>
          {price && <span className="text-sm font-bold">{price}</span>}
        </div>

        {step === "form" && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (canPay) handlePay();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="sim-name">{t("simulate.fullName")}</Label>
              <Input
                id="sim-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoComplete="name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sim-email">{t("simulate.email")}</Label>
              <Input
                id="sim-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sim-country">{t("simulate.country")}</Label>
              <Input
                id="sim-country"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                autoComplete="country-name"
              />
            </div>
            <p className="text-xs text-muted-foreground">{t("simulate.shippingNote")}</p>
            <Button type="submit" className="w-full" disabled={!canPay}>
              {t("simulate.pay", { price: price ?? "" })}
            </Button>
          </form>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("simulate.processing")}</p>
          </div>
        )}

        {step === "success" && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
            <div>
              <p className="font-semibold">{t("simulate.successTitle")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("simulate.successBody")}</p>
            </div>
            <p className="rounded-md bg-muted px-3 py-1.5 font-mono text-sm">
              {t("simulate.orderId")}: {orderId}
            </p>
            <Button
              variant="outline"
              className="mt-2 w-full"
              onClick={() => handleOpenChange(false)}
            >
              {t("simulate.done")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
