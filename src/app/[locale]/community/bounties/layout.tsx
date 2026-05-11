import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.bounties" });
  const path = "/community/bounties";
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
      type: "website",
      url: `https://gnars.com${path}`,
      locale: locale === "pt-br" ? "pt_BR" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
    other: {
      "fc:frame": JSON.stringify({
        version: "next",
        imageUrl: "https://gnars.com/community/bounties/opengraph-image",
        button: {
          title: "View Challenges",
          action: {
            type: "launch_frame",
            name: "Gnars Challenges",
            url: "https://gnars.com/community/bounties",
            splashImageUrl: "https://gnars.com/community/bounties/opengraph-image",
          },
        },
      }),
    },
  };
}

export default function BountiesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
