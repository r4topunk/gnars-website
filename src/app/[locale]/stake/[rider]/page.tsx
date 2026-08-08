import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { StakePageContent } from "@/components/stake/StakePageContent";
import { BASE_URL } from "@/lib/config";
import { getRider, RIDER_LIST, type RiderId } from "@/lib/gnars-vaults";
import { STAKE_MINIAPP_EMBED_CONFIG } from "@/lib/miniapp-config";

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
  // Rider's cutout body dropped into the arcade "character select" scene.
  const image = `${BASE_URL}/stake/${rider}/miniapp-image`;
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
      images: [{ url: image, width: 1200, height: 800, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
    // Farcaster mini app embed — launch straight into this rider, with the
    // rider's own character-select image instead of the generic cover.
    other: {
      "fc:miniapp": JSON.stringify({
        ...STAKE_MINIAPP_EMBED_CONFIG,
        imageUrl: image,
        button: {
          ...STAKE_MINIAPP_EMBED_CONFIG.button,
          // Same translated CTA as the page title — a hardcoded English literal
          // here shipped "Stake with X" on the pt-BR route. Farcaster caps the
          // button label at 32 chars: the longest real case is pt-BR
          // "Fazer stake com Pamtech" (23), so both locales fit for every rider
          // in RIDER_LIST.
          title,
          action: {
            ...STAKE_MINIAPP_EMBED_CONFIG.button.action,
            url: `${BASE_URL}/stake/${rider}`,
          },
        },
      }),
    },
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

  return (
    <div className="py-10">
      {/* max-w-6xl matches the site shell (Treasury, Auctions). The narrow measure
          that reading text needs is applied by the paragraphs themselves. */}
      <div className="mx-auto max-w-6xl">
        <StakePageContent initialRider={rider as RiderId} />
      </div>
    </div>
  );
}
