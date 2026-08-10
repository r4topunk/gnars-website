"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { NogglesRailsGlobe } from "@/components/nogglesrails/NogglesRailsGlobe";
import { NOGGLES_RAILS, type NogglesRailLocation } from "@/content/nogglesrails";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { SectionHeading, SHELL, StatTile } from "./primitives";

/** First paragraph only — the full description belongs on the rail's own page. */
function lede(rail: NogglesRailLocation): string {
  return rail.description.split("\n\n")[0];
}

export function RailsSection() {
  const t = useTranslations("newhome.rails");
  const [index, setIndex] = useState(0);
  const active = NOGGLES_RAILS[index];

  const stats = useMemo(
    () => ({
      installations: NOGGLES_RAILS.length,
      countries: new Set(NOGGLES_RAILS.map((r) => r.country)).size,
      continents: new Set(NOGGLES_RAILS.map((r) => r.continent)).size,
    }),
    [],
  );

  const handleSelect = useCallback((rail: NogglesRailLocation) => {
    const i = NOGGLES_RAILS.findIndex((r) => r.slug === rail.slug);
    if (i >= 0) setIndex(i);
  }, []);

  return (
    <section id="rails" className="px-6 py-18">
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

        <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-[1.35fr_1fr]">
          <div className="relative min-h-[420px] overflow-hidden rounded-xl border border-white/10 bg-[#0f1114] bg-[radial-gradient(70%_60%_at_50%_45%,rgba(102,153,204,.12),rgba(10,10,10,0)_70%)] lg:min-h-[540px]">
            <NogglesRailsGlobe
              focusSlug={active.slug}
              onSelectRail={handleSelect}
              className="h-full min-h-[420px] w-full lg:min-h-[540px]"
            />
            <span className="pointer-events-none absolute left-4.5 top-4 text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-400">
              {t("hint")}
            </span>
          </div>

          <div className="flex flex-col gap-3.5 rounded-xl border border-white/10 bg-neutral-900 p-5.5">
            <div>
              <span className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[#6699cc]">
                {active.type} · {active.continent}
              </span>
              <h3 className="mt-1.5 text-[28px] font-extrabold leading-[1.05] text-neutral-50">
                {active.label}
              </h3>
              <p className="mt-1 text-sm text-neutral-400">
                {active.city}, {active.country}
              </p>
            </div>

            <p className="line-clamp-4 text-pretty text-[13.5px] leading-[1.6] text-neutral-400">
              {lede(active)}
            </p>

            <div className="flex flex-wrap gap-1.5">
              <a
                href={active.proposal.link}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-white/10 bg-neutral-800/60 px-2.5 py-1 text-xs font-medium text-neutral-400 hover:text-neutral-50"
              >
                {active.proposal.name}
              </a>
              <span className="rounded-md border border-white/10 bg-neutral-800/60 px-2.5 py-1 font-mono text-[11.5px] text-neutral-400">
                {active.position[0].toFixed(2)}, {active.position[1].toFixed(2)}
              </span>
              <Link
                href={`/nogglesrails/${active.slug}`}
                className="rounded-md border border-white/10 bg-neutral-800/60 px-2.5 py-1 text-xs font-medium text-neutral-400 hover:text-neutral-50"
              >
                {t("readProposal")}
              </Link>
            </div>

            <div className="grid flex-1 auto-rows-min grid-cols-2 gap-1.5 overflow-hidden">
              {NOGGLES_RAILS.map((rail, i) => (
                <button
                  key={rail.slug}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={cn(
                    "rounded-lg border px-2.5 py-2 text-left",
                    i === index
                      ? "border-neutral-50/40 bg-neutral-800"
                      : "border-white/[0.08] bg-neutral-800/35 hover:border-white/20",
                  )}
                >
                  <span className="block truncate text-[13px] font-semibold text-neutral-100">
                    {rail.label}
                  </span>
                  <span className="block truncate text-[11px] text-neutral-400">
                    {rail.country}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
