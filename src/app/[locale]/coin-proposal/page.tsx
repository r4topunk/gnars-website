import { getTranslations, setRequestLocale } from "next-intl/server";
import { CoinProposalWizard } from "@/components/coin-proposal/CoinProposalWizard";

export default async function CoinProposalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("coinProposal");

  return (
    <div className="py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t("page.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("page.description")}</p>
      </div>

      <CoinProposalWizard />
    </div>
  );
}
