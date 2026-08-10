import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared chrome for the /newhome experiment.
 *
 * The design (Claude Design "Gnars Homepage") is a dark showpiece: near-black
 * ground, hairline white borders, mono numerals. These helpers keep that
 * treatment in one place so every section reads as one surface instead of each
 * block re-inventing its own greys.
 */

/** Page ground + max width used by every section. */
export const SHELL = "mx-auto w-full max-w-6xl px-6";

/** Small caps eyebrow above a section title. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Section heading block: eyebrow + h2 + lead paragraph. */
export function SectionHeading({
  eyebrow,
  eyebrowClassName,
  title,
  body,
  aside,
}: {
  eyebrow: ReactNode;
  eyebrowClassName?: string;
  title: ReactNode;
  body?: ReactNode;
  /** Stat tiles or actions pinned to the baseline on the right. */
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div className="flex flex-col gap-2.5">
        <Eyebrow className={eyebrowClassName}>{eyebrow}</Eyebrow>
        <h2 className="text-[clamp(1.875rem,3.4vw,2.75rem)] font-extrabold leading-[1.05] tracking-[-0.025em] text-neutral-50">
          {title}
        </h2>
        {body ? (
          <p className="max-w-[48em] text-pretty text-[15.5px] leading-[1.55] text-neutral-400">
            {body}
          </p>
        ) : null}
      </div>
      {/* Wraps: three 100px-min tiles plus gaps overflow a phone, and an
          unwrapped row here pushed the whole document into horizontal scroll. */}
      {aside ? <div className="flex flex-wrap gap-2.5">{aside}</div> : null}
    </div>
  );
}

/** Bordered number tile used beside section headings. */
export function StatTile({
  value,
  label,
  valueClassName,
}: {
  value: ReactNode;
  label: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-[100px] rounded-xl border border-white/10 bg-neutral-900 px-4 py-3">
      <div
        className={cn(
          "font-mono text-[22px] font-bold tabular-nums text-neutral-50",
          valueClassName,
        )}
      >
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-[0.08em] text-neutral-400">{label}</div>
    </div>
  );
}

/**
 * The narrow "Why X exists" band that separates the big sections. In the design
 * every showpiece is followed by one of these — it is what turns a stack of
 * features into an argument.
 */
export function Interlude({
  eyebrow,
  eyebrowClassName,
  children,
}: {
  eyebrow: ReactNode;
  eyebrowClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-[#0a0a0a] px-6 py-9">
      <div className="mx-auto flex max-w-[640px] flex-col gap-1.5 text-center">
        <span
          className={cn(
            "text-[11.5px] font-bold uppercase tracking-[0.1em] text-[#f7c948]",
            eyebrowClassName,
          )}
        >
          {eyebrow}
        </span>
        <p className="text-[15.5px] leading-[1.6] text-neutral-300">{children}</p>
      </div>
    </section>
  );
}
