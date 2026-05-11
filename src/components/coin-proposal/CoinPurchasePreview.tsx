"use client";

import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DAO_ADDRESSES } from "@/lib/config";

interface CoinPurchasePreviewProps {
  purchaseData: {
    coinAddress: string;
    coinName: string;
    ethAmount: string;
    slippage: string;
  };
}

export function CoinPurchasePreview({ purchaseData }: CoinPurchasePreviewProps) {
  const t = useTranslations("coinProposal");
  const displayName = purchaseData.coinName || purchaseData.coinAddress;

  return (
    <div className="space-y-4 mb-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <p className="font-semibold mb-2">{t("preview.summaryTitle")}</p>
          <p className="text-sm">
            {t.rich("preview.summaryBody", {
              name: displayName,
              amount: purchaseData.ethAmount,
              slippage: purchaseData.slippage,
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
        </AlertDescription>
      </Alert>

      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">{t("preview.tradeDetails")}</h3>
        <dl className="grid grid-cols-1 gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t("preview.coinAddress")}</dt>
            <dd className="font-mono text-xs">{purchaseData.coinAddress}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t("preview.ethToSpend")}</dt>
            <dd>{purchaseData.ethAmount} ETH</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t("preview.maxSlippage")}</dt>
            <dd>{purchaseData.slippage}%</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t("preview.senderTreasury")}</dt>
            <dd className="font-mono text-xs">{DAO_ADDRESSES.treasury}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t("preview.recipientTreasury")}</dt>
            <dd className="font-mono text-xs">{DAO_ADDRESSES.treasury}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
