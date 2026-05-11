"use client";

import { useTranslations } from "next-intl";
import { CalendarDays } from "lucide-react";

export function RecentProposalsEmptyState() {
  const t = useTranslations("proposals");
  return (
    <div className="text-center py-8">
      <CalendarDays className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">{t("recent.noRecentTitle")}</h3>
      <p className="text-muted-foreground">{t("recent.noRecentDesc")}</p>
    </div>
  );
}
