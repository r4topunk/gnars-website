"use client";

import { useTranslations } from "next-intl";
import { PastAuctions } from "@/components/auctions/PastAuctions";
import { useAllAuctions } from "@/hooks/use-auctions";
import { Link } from "@/i18n/navigation";

export default function AuctionsPage() {
  const { data: allAuctions, isLoading } = useAllAuctions();
  const t = useTranslations("auctions");

  return (
    <div className="flex flex-1 flex-col py-8">
      <div className="space-y-6">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight mb-2">{t("page.title")}</h1>
          <p className="text-muted-foreground">{t("page.description")}</p>
          <p className="text-muted-foreground mt-2">
            {t.rich("page.browseCta", {
              grantsLink: (chunks) => (
                <Link href="/proposals" className="text-foreground underline underline-offset-4">
                  {chunks}
                </Link>
              ),
              aboutLink: (chunks) => (
                <Link href="/about" className="text-foreground underline underline-offset-4">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>

        <PastAuctions auctions={allAuctions} loading={isLoading} gridOnly />
      </div>
    </div>
  );
}
