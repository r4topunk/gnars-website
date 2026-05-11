import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GnarsTVFeed } from "@/components/tv/GnarsTVFeed";

export const revalidate = 120;

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function TVPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("tv");

  return (
    <>
      <h1 className="sr-only">{t("srOnly.feed")}</h1>
      <Suspense>
        <GnarsTVFeed />
      </Suspense>
    </>
  );
}
