"use client";

// The /base landing — the pitch page for Base ecosystem programs (Base Batches
// and friends). One job: show that Gnars is a COMPLETE onchain DAO living on
// Base — auctions, governance, treasury, droposals, swap, staking — with the
// Base-native plumbing (sponsored gas, social login, Farcaster mini-app)
// spelled out. Every feature card links to the live surface, because the pitch
// is that it all already works.
import { useTranslations } from "next-intl";
import { ArrowLeftRight, Disc3, Gavel, HandCoins, Landmark, PiggyBank } from "lucide-react";
import { CARD, CARD_PAD, MUTED } from "@/components/stake/stake-ui";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

// Base brand blue — the page's one accent, used the way /stake uses gold.
const BASE_BLUE = "#0052FF";

const FEATURES = [
  { key: "auctions", href: "/auctions", Icon: Gavel },
  { key: "governance", href: "/proposals", Icon: Landmark },
  { key: "treasury", href: "/treasury", Icon: PiggyBank },
  { key: "droposals", href: "/droposals", Icon: Disc3 },
  { key: "swap", href: "/swap", Icon: ArrowLeftRight },
  { key: "staking", href: "/stake", Icon: HandCoins },
] as const;

const UNDER_HOOD = ["aa", "login", "farcaster", "mobile"] as const;

export function BasePageContent() {
  const t = useTranslations("base");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 sm:px-6">
      {/* Hero */}
      <section className={`${CARD} ${CARD_PAD} sm:p-8`}>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white"
          style={{ backgroundColor: BASE_BLUE }}
        >
          {/* Base's mark is a plain circle — drawn, not an asset we redistribute. */}
          <span className="h-2.5 w-2.5 rounded-full bg-white" aria-hidden />
          {t("eyebrow")}
        </span>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">{t("title")}</h1>
        <p className={`mt-3 max-w-2xl text-sm sm:text-base ${MUTED}`}>{t("lede")}</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            asChild
            className="border-0 font-bold text-white hover:opacity-90"
            style={{ backgroundColor: BASE_BLUE }}
          >
            <Link href="/auctions">{t("ctaAuctions")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/proposals">{t("ctaGovernance")}</Link>
          </Button>
        </div>
      </section>

      {/* Feature grid — each card is a link to the live surface */}
      <section className={`${CARD} ${CARD_PAD} sm:p-8`}>
        <h2 className="text-lg font-bold tracking-tight">{t("featuresTitle")}</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ key, href, Icon }) => (
            <li key={key}>
              <Link
                href={href}
                className="group flex h-full flex-col rounded-2xl border border-border/60 bg-background/40 p-4 transition-colors hover:border-[#0052FF]/50"
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                  style={{ backgroundColor: BASE_BLUE }}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="mt-3 text-sm font-semibold group-hover:underline">
                  {t(`features.${key}.title`)}
                </span>
                <span className={`mt-1 text-xs leading-relaxed ${MUTED}`}>
                  {t(`features.${key}.desc`)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* The Base-native plumbing — the part reviewers actually ask about */}
      <section className={`${CARD} ${CARD_PAD}`}>
        <h2 className="text-lg font-bold tracking-tight">{t("underHoodTitle")}</h2>
        <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {UNDER_HOOD.map((k) => (
            <li key={k} className="flex items-start gap-2.5 text-sm">
              <span
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: BASE_BLUE }}
                aria-hidden
              />
              <span className={MUTED}>{t(`underHood.${k}`)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-5 max-w-3xl text-sm leading-relaxed">{t("culture")}</p>
      </section>
    </div>
  );
}
