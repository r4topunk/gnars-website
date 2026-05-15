"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Info, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CoinPurchaseFormProps {
  onGenerate: (data: {
    coinAddress: string;
    coinName: string;
    ethAmount: string;
    slippage: string;
  }) => Promise<void>;
  isGenerating: boolean;
  error: string | null;
}

export function CoinPurchaseForm({ onGenerate, isGenerating, error }: CoinPurchaseFormProps) {
  const t = useTranslations("coinProposal");
  const [coinAddress, setCoinAddress] = useState("");
  const [coinName, setCoinName] = useState("");
  const [ethAmount, setEthAmount] = useState("0.1");
  const [slippage, setSlippage] = useState("5");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onGenerate({
      coinAddress,
      coinName,
      ethAmount,
      slippage,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-semibold">{t("form.infoTitle")}</p>
            <p>{t("form.infoBody")}</p>
          </div>
        </AlertDescription>
      </Alert>

      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="coinAddress">{t("form.coinAddress")}</Label>
        <Input
          id="coinAddress"
          placeholder="0x..."
          value={coinAddress}
          onChange={(e) => setCoinAddress(e.target.value)}
          disabled={isGenerating}
          required
        />
        <p className="text-xs text-muted-foreground">{t("form.coinAddressHelp")}</p>
      </div>

      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="coinName">{t("form.coinName")}</Label>
        <Input
          id="coinName"
          placeholder="e.g., Skateboarding Coin"
          value={coinName}
          onChange={(e) => setCoinName(e.target.value)}
          disabled={isGenerating}
        />
        <p className="text-xs text-muted-foreground">{t("form.coinNameHelp")}</p>
      </div>

      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="ethAmount">{t("form.ethAmount")}</Label>
        <Input
          id="ethAmount"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.1"
          value={ethAmount}
          onChange={(e) => setEthAmount(e.target.value)}
          disabled={isGenerating}
          required
        />
        <p className="text-xs text-muted-foreground">{t("form.ethAmountHelp")}</p>
      </div>

      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="slippage">{t("form.slippage")}</Label>
        <Input
          id="slippage"
          type="number"
          step="0.1"
          min="0"
          max="100"
          placeholder="5"
          value={slippage}
          onChange={(e) => setSlippage(e.target.value)}
          disabled={isGenerating}
          required
        />
        <p className="text-xs text-muted-foreground">{t("form.slippageHelp")}</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={isGenerating} className="w-full max-w-sm">
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("form.generating")}
          </>
        ) : (
          t("form.generate")
        )}
      </Button>
    </form>
  );
}
