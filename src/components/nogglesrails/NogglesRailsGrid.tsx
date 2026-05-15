"use client";

import { useTranslations } from "next-intl";
import { RailCard } from "@/components/nogglesrails/RailCard";
import { NOGGLES_RAILS } from "@/content/nogglesrails";

export function NogglesRailsGrid() {
  const t = useTranslations("installations.nogglesrails");

  return (
    <section id="rails" className="space-y-4">
      <div className="flex items-end justify-between">
        <h2 className="text-2xl font-bold tracking-tight">{t("grid.heading")}</h2>
        <span className="text-sm text-muted-foreground">
          {t("grid.locationsCount", { count: NOGGLES_RAILS.length })}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {NOGGLES_RAILS.map((rail) => (
          <RailCard key={rail.slug} rail={rail} />
        ))}
      </div>
    </section>
  );
}
