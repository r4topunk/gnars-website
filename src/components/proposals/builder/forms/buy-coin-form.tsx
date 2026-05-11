"use client";

import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type ProposalFormValues } from "../../schema";

interface Props {
  index: number;
}

export function BuyCoinForm({ index }: Props) {
  const t = useTranslations("propose");
  const {
    register,
    formState: { errors },
  } = useFormContext<ProposalFormValues>();

  const getErrorMessage = (key: string): string | undefined => {
    const txErrors = errors.transactions?.[index] as unknown as
      | Record<string, { message?: string }>
      | undefined;
    return txErrors?.[key]?.message;
  };

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <p className="text-sm">{t("buyCoin.infoDesc")}</p>
        </AlertDescription>
      </Alert>

      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="coinAddress">{t("buyCoin.coinAddressLabel")}</Label>
        <Input
          id="coinAddress"
          placeholder={t("buyCoin.coinAddressPlaceholder")}
          {...register(`transactions.${index}.coinAddress` as const)}
        />
        {getErrorMessage("coinAddress") && (
          <p className="text-xs text-red-500">{String(getErrorMessage("coinAddress"))}</p>
        )}
        <p className="text-xs text-muted-foreground">{t("buyCoin.coinAddressHelper")}</p>
      </div>

      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="ethAmount">{t("buyCoin.ethAmountLabel")}</Label>
        <Input
          id="ethAmount"
          type="number"
          step="0.01"
          min="0"
          placeholder={t("buyCoin.ethAmountPlaceholder")}
          {...register(`transactions.${index}.ethAmount` as const)}
        />
        {getErrorMessage("ethAmount") && (
          <p className="text-xs text-red-500">{String(getErrorMessage("ethAmount"))}</p>
        )}
        <p className="text-xs text-muted-foreground">{t("buyCoin.ethAmountHelper")}</p>
      </div>

      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="slippage">{t("buyCoin.slippageLabel")}</Label>
        <Input
          id="slippage"
          type="number"
          step="0.1"
          min="0"
          max="100"
          placeholder={t("buyCoin.slippagePlaceholder")}
          defaultValue="5"
          {...register(`transactions.${index}.slippage` as const)}
        />
        {getErrorMessage("slippage") && (
          <p className="text-xs text-red-500">{String(getErrorMessage("slippage"))}</p>
        )}
        <p className="text-xs text-muted-foreground">{t("buyCoin.slippageHelper")}</p>
      </div>
    </div>
  );
}
