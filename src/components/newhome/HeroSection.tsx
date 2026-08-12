import { getTranslations } from "next-intl/server";
import { Map, TrendingUp, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { HeroTagline } from "./HeroTagline";
import { SHELL } from "./primitives";

export interface HeroStat {
  value: string;
  label: string;
  icon: "members" | "treasury" | "rails";
}

const ICONS = {
  members: { Icon: Users, bg: "bg-blue-900/30", fg: "text-blue-400" },
  treasury: { Icon: TrendingUp, bg: "bg-green-900/30", fg: "text-green-400" },
  rails: { Icon: Map, bg: "bg-red-900/30", fg: "text-red-400" },
} as const;

export async function HeroSection({ stats }: { stats: HeroStat[] }) {
  const t = await getTranslations("newhome.hero");

  return (
    <section
      id="top"
      className="relative bg-[radial-gradient(90%_55%_at_50%_10%,rgba(217,70,239,.1)_0%,rgba(217,70,239,0)_60%)]"
    >
      <div
        className={`${SHELL} flex flex-col items-center gap-3.5 pb-10 pt-7 text-center sm:pb-18 sm:pt-12`}
      >
        {/* Sized down from the display setting the shorter headline used: this
            sentence is twice the length, and at the old clamp it ran to five
            lines before the fold. `text-balance` keeps the wrap even. */}
        <h1
          className="text-balance bg-clip-text text-[clamp(2.25rem,5.5vw,4.75rem)] font-extrabold leading-[1] tracking-[-0.03em] text-transparent"
          // Driven off the foreground token, not a literal near-white: clipped
          // to the text, a hardcoded white gradient is invisible on a light
          // ground.
          style={{
            backgroundImage:
              "linear-gradient(90deg,var(--foreground),color-mix(in oklab,var(--foreground) 78%,transparent))",
          }}
        >
          {t("title")}
        </h1>

        {/* HeroTagline reserves its own height against layout shift. */}
        <p className="max-w-[32em] text-pretty text-[clamp(1.0625rem,2.2vw,1.5rem)] leading-[1.45] text-muted-foreground">
          <HeroTagline />
        </p>

        <div className="mt-1.5 flex flex-wrap justify-center gap-2.5">
          <Link
            href="/stake"
            className="whitespace-nowrap rounded-lg bg-foreground px-5 py-3 text-[14.5px] font-semibold text-background hover:opacity-90"
          >
            {t("ctaStake")}
          </Link>
          <Link
            href="/community/bounties"
            className="whitespace-nowrap rounded-lg border border-border bg-muted/40 px-5 py-3 text-[14.5px] font-medium text-foreground hover:bg-accent"
          >
            {t("ctaBounties")}
          </Link>
        </div>

        <div className="flex flex-wrap justify-center gap-5 pt-5">
          {stats.map((s) => {
            const { Icon, bg, fg } = ICONS[s.icon];
            return (
              <div key={s.label} className="flex items-center gap-2.5">
                <span
                  className={`flex size-8 items-center justify-center rounded-full ${bg} ${fg}`}
                >
                  <Icon className="size-4" />
                </span>
                <span className="flex flex-col whitespace-nowrap text-left">
                  <span className="text-[15px] font-semibold text-foreground">{s.value}</span>
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
