"use client";

// Stacks the four rider-select layout experiments with a label above each, on the
// same committed dark surface the prototype uses, so what is judged is the layout
// and nothing else. The current production-of-the-prototype version renders last
// as the baseline.
import VariantBanner from "@/components/stake/preview/lab/VariantBanner";
import VariantCompact from "@/components/stake/preview/lab/VariantCompact";
import VariantPoster from "@/components/stake/preview/lab/VariantPoster";
import VariantRoster from "@/components/stake/preview/lab/VariantRoster";
import { MICRO, MUTED } from "@/components/stake/preview/preview-config";
import { RiderSelect } from "@/components/stake/preview/RiderSelect";
import { cn } from "@/lib/utils";

const VARIANTS: { id: string; title: string; question: string; C: React.ComponentType }[] = [
  {
    id: "compact",
    title: "A · Compact split",
    question: "Does the current concept work if we just compress it?",
    C: VariantCompact,
  },
  {
    id: "poster",
    title: "B · Poster overlay",
    question: "Does full-bleed editorial beat the split?",
    C: VariantPoster,
  },
  {
    id: "banner",
    title: "C · Dense banner",
    question: "Do we need the big stage at all?",
    C: VariantBanner,
  },
  {
    id: "roster",
    title: "D · Roster as hero",
    question: "Is picking-from-a-lineup stronger than one-at-a-time?",
    C: VariantRoster,
  },
];

export function RiderSelectLab() {
  return (
    <div className="dark space-y-12 rounded-3xl bg-background px-4 py-8 text-foreground sm:px-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Rider select: design lab</h1>
        <p className={cn("max-w-2xl text-sm", MUTED)}>
          Four layouts of the same element, same data, same tokens. The brief: the current version
          strands its info in an empty column. Baseline at the bottom.
        </p>
      </header>

      {VARIANTS.map((v) => (
        <section key={v.id} id={v.id} className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/[0.08] pb-2">
            <h2 className="text-lg font-bold tracking-tight">{v.title}</h2>
            <p className={cn("text-xs", MICRO)}>{v.question}</p>
          </div>
          <v.C />
        </section>
      ))}

      <section id="baseline" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/[0.08] pb-2">
          <h2 className="text-lg font-bold tracking-tight">Baseline · current prototype</h2>
          <p className={cn("text-xs", MICRO)}>What the four above are trying to beat.</p>
        </div>
        <RiderSelect />
      </section>
    </div>
  );
}
