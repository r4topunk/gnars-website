import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NogglesRailsClosingBox } from "@/components/nogglesrails/NogglesRailsClosingBox";
import { NogglesRailsGrid } from "@/components/nogglesrails/NogglesRailsGrid";
import NogglesRailsHero from "@/components/nogglesrails/NogglesRailsHero";
import { NogglesRailsInterludeImage } from "@/components/nogglesrails/NogglesRailsInterludeImage";
import { NogglesRailsManifesto } from "@/components/nogglesrails/NogglesRailsManifesto";
import { NogglesRailsMapTabs } from "@/components/nogglesrails/NogglesRailsMapTabs";
import { NounstacleDefinition } from "@/components/nogglesrails/NounstacleDefinition";

const NOGGLES_RAILS_OG_IMAGE =
  "https://storage.googleapis.com/papyrus_images/b02b9fbd4c2d10074918450eb30464643516cfb55a5a51ed4dfa1e076749cc1c.gif";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.nogglesrails" });
  const path = "/nogglesrails";
  const canonical = locale === "en" ? path : `/pt-br${path}`;
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical,
      languages: {
        en: path,
        "pt-br": `/pt-br${path}`,
        "x-default": path,
      },
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      images: [
        {
          url: NOGGLES_RAILS_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: "NogglesRails — Community Skate Infrastructure",
        },
      ],
      locale: locale === "pt-br" ? "pt_BR" : "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: [NOGGLES_RAILS_OG_IMAGE],
    },
  };
}

export default function NogglesRailsPage() {
  return (
    <div className="flex flex-col gap-10 pb-8">
      <NogglesRailsHero />
      <NogglesRailsMapTabs />
      <NogglesRailsManifesto />
      <NogglesRailsGrid />
      <div className="pt-2">
        <NogglesRailsClosingBox />
      </div>
      <NogglesRailsInterludeImage />
      <NounstacleDefinition />
    </div>
  );
}
