"use client";

// Dev chrome for /stake/preview. Each control is one open decision from the design
// review; flipping it re-renders the page in that configuration and updates the
// query string, so a reviewer can send back the exact variant they approve.
//
// Prototype-only — never rendered by the production /stake routes.
import Link from "next/link";
import { previewHref, type PreviewConfig } from "@/components/stake/preview/preview-config";
import { cn } from "@/lib/utils";

type Control<K extends keyof PreviewConfig> = {
  key: K;
  label: string;
  options: { value: PreviewConfig[K]; label: string }[];
};

// `theme` and `stats` are gone from this list on purpose: the spec commits both
// decisions (one surface, no numeric scores anywhere), so a control offering the
// alternative would ask for a verdict the page can no longer render. Both keys
// stay in PreviewConfig so existing review links keep parsing.
const CONTROLS: [Control<"header">, Control<"orbit">, Control<"demo">] = [
  {
    key: "header",
    label: "Header",
    options: [
      { value: "left", label: "Left" },
      { value: "center", label: "Center" },
    ],
  },
  {
    // Desktop-only by design: below `md` the social proof is always the ranked
    // list, because the pannable orbit is unreadable at phone width. The control
    // says so, otherwise flipping it on a narrow window looks broken.
    key: "orbit",
    label: "Social proof (desktop)",
    options: [
      { value: "graph", label: "Orbit graph" },
      { value: "list", label: "List" },
    ],
  },
  {
    key: "demo",
    label: "Positions",
    options: [
      { value: true, label: "Sample data" },
      { value: false, label: "Real wallet" },
    ],
  },
];

export function PreviewToolbar({ config }: { config: PreviewConfig }) {
  return (
    <div className="sticky top-16 z-30 -mx-4 mb-8 border-y border-border/60 bg-background/95 px-4 py-3 backdrop-blur">
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-500">
          prototype
        </span>
        <span className="text-xs text-muted-foreground">
          Nothing here is live. Flip a control to compare; the URL carries your choice.
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {CONTROLS.map((c) => (
          <div key={c.key} className="flex items-center gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {c.label}
            </span>
            <div className="flex overflow-hidden rounded-md border">
              {c.options.map((o) => {
                const active = config[c.key] === o.value;
                return (
                  <Link
                    key={String(o.value)}
                    href={previewHref(config, { [c.key]: o.value } as Partial<PreviewConfig>)}
                    scroll={false}
                    className={cn(
                      "px-2.5 py-1 text-xs font-medium transition-colors",
                      active
                        ? "bg-foreground text-background"
                        : "cursor-pointer text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {o.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
