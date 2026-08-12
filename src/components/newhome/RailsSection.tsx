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
    // No horizontal padding here: the heading keeps the page's shell while the
    // globe breaks out of it, so each one owns its own gutter.
    <section id="rails" className="py-10 sm:py-18">
      <div className={SHELL}>
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
      </div>

      {/* Full-bleed globe, desktop only.
          The page renders inside the layout's `max-w-6xl mx-auto` main, so the
          globe and its detail panel were capped at 1152px with dead space either
          side on a wide screen. `mx-[calc(50%-50vw)] w-screen` re-centres the
          block on the viewport instead of on the shell.
          `100vw` counts the scrollbar on platforms that reserve one, so this
          overshoots by half a scrollbar per side — `overflow-x: clip` on body
          (globals.css) absorbs it. Without that guard this is exactly the
          horizontal scrollbar the homepage comment warns about.
          Below lg it stays inside the shell: the grid is single-column there and
          a full-width globe on a phone buys nothing. */}
      <div className="mx-auto mt-6 w-full max-w-6xl px-4 sm:px-6 lg:mx-[calc(50%-50vw)] lg:w-screen lg:max-w-none lg:px-6">
        <RailGlobeSection />
      </div>
    </section>
  );
}
