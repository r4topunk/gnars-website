import { getTranslations } from "next-intl/server";
import { Map, TrendingUp, Trophy, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { HeroTagline } from "./HeroTagline";
import { SHELL } from "./primitives";

export interface HeroStat {
  value: string;
  label: string;
  icon: "gnars" | "members" | "treasury" | "rails";
}

const ICONS = {
  gnars: { Icon: Trophy, bg: "bg-purple-900/30", fg: "text-purple-400" },
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
      <div className={`${SHELL} flex flex-col items-center gap-3.5 pb-18 pt-12 text-center`}>
        <h1 className="bg-[linear-gradient(90deg,#fafafa,rgba(250,250,250,.8))] bg-clip-text text-[clamp(2.75rem,7vw,6.75rem)] font-extrabold leading-[0.94] tracking-[-0.03em] text-transparent">
          {t("title")}
        </h1>

        <p className="max-w-[32em] text-pretty text-lg leading-[1.55] text-neutral-400">
          {t("leadPrefix")} <HeroTagline />
        </p>

        <div className="mt-1.5 flex flex-wrap justify-center gap-2.5">
          <Link
            href="/stake"
            className="whitespace-nowrap rounded-lg bg-neutral-50 px-5 py-3 text-[14.5px] font-semibold text-neutral-900 hover:opacity-90"
          >
            {t("ctaStake")}
          </Link>
          <Link
            href="/community/bounties"
            className="whitespace-nowrap rounded-lg border border-white/10 bg-white/[0.04] px-5 py-3 text-[14.5px] font-medium text-neutral-50 hover:bg-neutral-800"
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
                  <span className="text-[15px] font-semibold text-neutral-50">{s.value}</span>
                  <span className="text-xs text-neutral-400">{s.label}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
