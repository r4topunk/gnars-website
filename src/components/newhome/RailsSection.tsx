"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { RailGlobeSection } from "@/components/nogglesrails/RailGlobeSection";
import { NOGGLES_RAILS } from "@/content/nogglesrails";
import { SectionHeading, SHELL, StatTile } from "./primitives";

export function RailsSection() {
  const t = useTranslations("newhome.rails");

  const stats = useMemo(
    () => ({
      installations: NOGGLES_RAILS.length,
      countries: new Set(NOGGLES_RAILS.map((r) => r.country)).size,
      continents: new Set(NOGGLES_RAILS.map((r) => r.continent)).size,
    }),
    [],
  );

  return (
    <section id="rails" className="px-4 py-10 sm:px-6 sm:py-18">
      <div className={`${SHELL} flex flex-col gap-6 px-0`}>
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("title", { rails: stats.installations, countries: stats.countries })}
          body={t("body")}
          aside={
            <>
              <StatTile value={stats.installations} label={t("stats.installations")} />
              <StatTile value={stats.countries} label={t("stats.countries")} />
              <StatTile value={stats.continents} label={t("stats.continents")} />
            </>
          }
        />

        <RailGlobeSection />
      </div>
    </section>
  );
}
