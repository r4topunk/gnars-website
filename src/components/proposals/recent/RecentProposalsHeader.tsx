"use client";

import { useTranslations } from "next-intl";
import { ArrowRightIcon } from "lucide-react";
import { SectionHeader } from "@/components/common/SectionHeader";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export function RecentProposalsHeader() {
  const t = useTranslations("proposals");
  return (
    <SectionHeader
      title={t("recent.title")}
      description={t("recent.description")}
      action={
        <Button variant="outline" size="sm" asChild>
          <Link href="/proposals">
            {t("recent.viewAll")}
            <ArrowRightIcon className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      }
    />
  );
}
