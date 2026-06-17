import { getTranslations } from "next-intl/server";
import { RoundsIndexView } from "@/components/rounds/RoundsIndexView";
import type { Round } from "@/features/rounds/types";
import { listPublicRounds } from "@/services/rounds";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.rounds" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function RoundsPage() {
  let rounds: Round[] = [];
  let error: string | undefined;

  try {
    rounds = await listPublicRounds();
  } catch (loadError) {
    console.error("[rounds] unable to load rounds", loadError);
    error = "Rounds are not available right now.";
  }

  return <RoundsIndexView rounds={rounds} error={error} />;
}
