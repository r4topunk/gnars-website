"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { PropdateCard } from "@/components/proposals/detail/PropdateCard";
import { Link } from "@/i18n/navigation";
import { Propdate } from "@/services/propdates";

export function PropdateDetail({ propdate }: { propdate: Propdate }) {
  const t = useTranslations("propdates");
  return (
    <div className="space-y-6">
      <Link
        href="/propdates"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        {t("detail.backToPropdates")}
      </Link>
      <PropdateCard propdate={propdate} />
    </div>
  );
}
