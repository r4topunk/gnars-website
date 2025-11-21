"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { GNARS_ADDRESSES } from "@/lib/config";

interface CoinPurchasePreviewProps {
  purchaseData: {
    coinAddress: string;
    coinName: string;
    ethAmount: string;
    slippage: string;
  };
}

export function CoinPurchasePreview({ purchaseData }: CoinPurchasePreviewProps) {
  const displayName = purchaseData.coinName || purchaseData.coinAddress;

  return (
    <div className="space-y-4 mb-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <p className="font-semibold mb-2">Coin Purchase Summary</p>
          <p className="text-sm">
            This proposal will purchase <strong>{displayName}</strong> using{" "}
            <strong>{purchaseData.ethAmount} ETH</strong> from the treasury with a maximum slippage
            of <strong>{purchaseData.slippage}%</strong>.
          </p>
        </AlertDescription>
      </Alert>

      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Trade Details</h3>
        <dl className="grid grid-cols-1 gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Coin Address:</dt>
            <dd className="font-mono text-xs">{purchaseData.coinAddress}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">ETH to Spend:</dt>
            <dd>{purchaseData.ethAmount} ETH</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Max Slippage:</dt>
            <dd>{purchaseData.slippage}%</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Sender (Treasury):</dt>
            <dd className="font-mono text-xs">{GNARS_ADDRESSES.treasury}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Recipient (Treasury):</dt>
            <dd className="font-mono text-xs">{GNARS_ADDRESSES.treasury}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
