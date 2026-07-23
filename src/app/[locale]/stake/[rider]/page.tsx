import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CharacterSelector } from "@/components/stake/CharacterSelector";
import { StakeAdminPanel } from "@/components/stake/StakeAdminPanel";
import { RIDER_LIST, getRider } from "@/lib/gnars-vaults";

// Shareable per-rider entry point: /stake/vlad opens the roster on that rider,
// so a supporter can link straight to the athlete they're backing.

export function generateStaticParams() {
  return RIDER_LIST.map((r) => ({ rider: r.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; rider: string }>;
}): Promise<Metadata> {
  const { locale, rider } = await params;
  if (!getRider(rider)) return {};

  const t = await getTranslations({ locale, namespace: "stake" });
  const name = t(`characters.${rider}.name`);
  const title = t("stakeCta", { name });
  const description = t(`characters.${rider}.tagline`);

  const path = `/stake/${rider}`;
  const canonical = locale === "en" ? path : `/pt-br${path}`;
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: { en: path, "pt-br": `/pt-br${path}`, "x-default": path },
    },
    openGraph: {
      title,
      description,
      locale: locale === "pt-br" ? "pt_BR" : "en_US",
      type: "website",
      images: [{ url: `/stake/cutout/${rider}.png` }],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function StakeRiderPage({
  params,
}: {
  params: Promise<{ locale: string; rider: string }>;
}) {
  const { locale, rider } = await params;
  setRequestLocale(locale);
  if (!getRider(rider)) notFound();

  const t = await getTranslations("stake");

  return (
    <div className="py-10">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="space-y-2 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            {t("subtitle")}
          </p>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{t("title")}</h1>
          <p className="mx-auto max-w-xl text-muted-foreground">{t("intro")}</p>
        </div>

        <CharacterSelector initialRider={rider} />
        <StakeAdminPanel />
      </div>
    </div>
  );
}
