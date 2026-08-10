"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { NogglesRailsGlobe } from "@/components/nogglesrails/NogglesRailsGlobe";
import { NOGGLES_RAILS, type Continent, type NogglesRailLocation } from "@/content/nogglesrails";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** The render that stands in for a rail with no site photography yet. */
const RENDER_FALLBACK = "/nogglesRail3D.png";

/**
 * Site photography only.
 *
 * `images` is a mixed bag — the rails dataset stores YouTube watch links in it
 * alongside stills, and a watch URL in an <img> is an empty frame. Rails left
 * with nothing fall through to the 3D render rather than a blank panel.
 */
function railPhotos(rail: NogglesRailLocation): string[] {
  return rail.images.filter((url) => !/youtube\.com|youtu\.be/i.test(url));
}

/** First paragraph only — the rest belongs on the rail's own page. */
function lede(rail: NogglesRailLocation): string {
  return rail.description.split("\n\n")[0];
}

/** Continents actually present in the data, in the order they first appear. */
const CONTINENTS: Continent[] = Array.from(new Set(NOGGLES_RAILS.map((r) => r.continent)));

const FILTER_KEY: Record<Continent, string> = {
  Americas: "americas",
  Europe: "europe",
  Asia: "asia",
  Africa: "africa",
  Oceania: "oceania",
};

export function RailGlobeSection({
  autoRotate = true,
  spinSpeed = 1,
}: {
  autoRotate?: boolean;
  spinSpeed?: number;
} = {}) {
  const t = useTranslations("newhome.rails");
  const [index, setIndex] = useState(0);
  const [filter, setFilter] = useState<Continent | null>(null);
  const [photo, setPhoto] = useState(0);

  const active = NOGGLES_RAILS[index];
  const photos = useMemo(() => railPhotos(active), [active]);
  const hasPhotos = photos.length > 0;
  const frames = hasPhotos ? photos : [RENDER_FALLBACK];

  // A new rail starts at its first frame; without this the carousel keeps an
  // index the next rail may not have.
  useEffect(() => {
    setPhoto(0);
  }, [index]);

  const stats = useMemo(
    () => ({
      installations: NOGGLES_RAILS.length,
      countries: new Set(NOGGLES_RAILS.map((r) => r.country)).size,
      continents: new Set(NOGGLES_RAILS.map((r) => r.continent)).size,
    }),
    [],
  );

  const selectRail = useCallback((rail: NogglesRailLocation) => {
    const i = NOGGLES_RAILS.findIndex((r) => r.slug === rail.slug);
    if (i >= 0) setIndex(i);
  }, []);

  const step = useCallback(
    (delta: number) => setPhoto((p) => (p + delta + frames.length) % frames.length),
    [frames.length],
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Continent filter. Non-matching entries in the grid below dim rather
          than disappear: the list is the page's index of every rail, and one
          that vanishes on a filter reads as missing data. */}
      <div className="flex flex-wrap items-center gap-1.5">
        <FilterPill active={filter === null} onClick={() => setFilter(null)}>
          {t("filters.all")}
        </FilterPill>
        {CONTINENTS.map((c) => (
          <FilterPill key={c} active={filter === c} onClick={() => setFilter(c)}>
            {t(`filters.${FILTER_KEY[c]}`)}
          </FilterPill>
        ))}
      </div>

      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-[1.08fr_1fr]">
        {/* ── Globe ─────────────────────────────────────────── */}
        <div className="relative min-h-[420px] overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0f1114] bg-[radial-gradient(70%_60%_at_50%_45%,rgba(30,58,138,.28),rgba(10,10,10,0)_70%)] lg:min-h-[560px]">
          <NogglesRailsGlobe
            focusSlug={active.slug}
            onSelectRail={selectRail}
            autoRotate={autoRotate}
            spinSpeed={spinSpeed}
            className="h-full min-h-[420px] w-full lg:min-h-[560px]"
          />

          <span className="pointer-events-none absolute left-4 top-4 font-mono text-[11px] uppercase tracking-[0.08em] text-white/45">
            {t("hint")}
          </span>

          <span className="pointer-events-none absolute bottom-4 left-4 font-mono text-[11px] tracking-[0.08em] text-white/45">
            <span className="text-white">{stats.installations}</span> {t("mono.installed")} ·{" "}
            <span className="text-white">{stats.countries}</span> {t("mono.countries")} ·{" "}
            <span className="text-white">{stats.continents}</span> {t("mono.continents")}
          </span>

          <span className="pointer-events-none absolute bottom-4 right-4 flex items-center gap-1.5 font-mono text-[11px] tracking-[0.08em] text-white/45">
            <span className="size-[7px] rounded-full bg-[#22c55e] shadow-[0_0_6px_#22c55e]" />
            {t("selected")}
          </span>
        </div>

        {/* ── Detail ────────────────────────────────────────── */}
        <div className="flex flex-col gap-3.5 rounded-2xl border border-white/[0.09] bg-[#131316] p-6">
          <div>
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[#6699cc]">
              {active.type} · {active.continent}
            </span>
            <h3 className="mt-1.5 text-[clamp(1.75rem,3vw,2.125rem)] font-extrabold leading-[1.05] text-neutral-50">
              {active.label}
            </h3>
            <p className="mt-1 text-sm text-neutral-400">
              {active.city}, {active.country}
            </p>
          </div>

          {/* Carousel */}
          <div className="relative h-[220px] overflow-hidden rounded-xl border border-white/10 bg-[#0d0d10]">
            {hasPhotos ? (
              // eslint-disable-next-line @next/next/no-img-element -- rail photography is hosted across hive/ipfs/gnars.center; the optimizer would need every host allow-listed
              <img
                key={frames[photo]}
                src={frames[photo]}
                alt={`${active.label} — ${active.city}, ${active.country}`}
                className="size-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex size-full items-center justify-center bg-[radial-gradient(60%_60%_at_50%_45%,rgba(255,45,45,.16),rgba(0,0,0,0)_70%)]">
                {/* eslint-disable-next-line @next/next/no-img-element -- local asset, sized by the frame */}
                <img
                  src={RENDER_FALLBACK}
                  alt={active.label}
                  className="max-h-[70%] max-w-[70%] object-contain"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute text-[86px] leading-none text-white/[0.04]"
                >
                  ⌐◨-◨
                </span>
              </div>
            )}

            <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/55 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-white/80">
              {hasPhotos ? t("photoTag") : t("renderTag")}
            </span>
            <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2 py-1 font-mono text-[9.5px] text-white/75">
              {photo + 1} / {frames.length}
            </span>

            {frames.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label={t("prevPhoto")}
                  className="absolute left-2.5 top-1/2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6699cc]"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label={t("nextPhoto")}
                  className="absolute right-2.5 top-1/2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6699cc]"
                >
                  <ChevronRight className="size-4" />
                </button>
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
                  {frames.map((frame, i) => (
                    <button
                      key={frame}
                      type="button"
                      onClick={() => setPhoto(i)}
                      aria-label={t("goToPhoto", { n: i + 1 })}
                      aria-current={i === photo}
                      className={cn(
                        "h-[7px] cursor-pointer rounded-full transition-[width,background-color] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6699cc]",
                        i === photo ? "w-[18px] bg-white" : "w-[7px] bg-white/40",
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          <p className="text-pretty text-[13.5px] leading-[1.62] text-neutral-300">
            {lede(active)}
          </p>

          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11.5px] text-neutral-300">
              {active.proposal.name}
            </span>
            <span className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 font-mono text-[11.5px] text-neutral-400">
              {active.position[0].toFixed(2)}, {active.position[1].toFixed(2)}
            </span>
            <a
              href={active.proposal.link}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-[#6699cc]/35 bg-[#1e3a8a]/[0.18] px-2.5 py-1.5 text-[11.5px] font-medium text-[#9dc0e8] hover:bg-[#1e3a8a]/30"
            >
              {t("readProposal")}
            </a>
          </div>

          <Link
            href={`/nogglesrails/${active.slug}`}
            className="rounded-[9px] bg-neutral-50 py-2.5 text-center text-[13px] font-semibold text-neutral-900 hover:opacity-90"
          >
            {t("viewInstallation")}
          </Link>

          <div className="grid max-h-[260px] grid-cols-2 gap-1.5 overflow-y-auto pr-1 [scrollbar-width:thin]">
            {NOGGLES_RAILS.map((rail, i) => {
              const dimmed = filter !== null && rail.continent !== filter;
              return (
                <button
                  key={rail.slug}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`${rail.label}, ${rail.country}`}
                  aria-pressed={i === index}
                  className={cn(
                    "cursor-pointer rounded-lg border px-3 py-2 text-left transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6699cc]",
                    i === index
                      ? "border-white/40 bg-[#262626]"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
                    dimmed && "opacity-45",
                  )}
                >
                  <span className="block truncate text-[13px] font-semibold text-neutral-100">
                    {rail.label}
                  </span>
                  <span className="block truncate text-[11.5px] text-neutral-400">
                    {rail.country}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "cursor-pointer rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6699cc]",
        active
          ? "border-white/40 bg-[#262626] text-neutral-50"
          : "border-white/10 bg-transparent text-neutral-400 hover:text-neutral-50",
      )}
    >
      {children}
    </button>
  );
}
