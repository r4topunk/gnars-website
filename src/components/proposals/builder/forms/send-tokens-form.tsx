"use client";

import { useTranslations } from "next-intl";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type ProposalFormValues } from "../../schema";

interface Props {
  index: number;
}

export function SendTokensForm({ index }: Props) {
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
      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="tokenAddress">{t("sendTokens.tokenAddressLabel")}</Label>
        <Input
          id="tokenAddress"
          placeholder={t("sendTokens.tokenAddressPlaceholder")}
          {...register(`transactions.${index}.tokenAddress` as const)}
        />
        {getErrorMessage("tokenAddress") && (
          <p className="text-xs text-red-500">{String(getErrorMessage("tokenAddress"))}</p>
        )}
      </div>

      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="recipient">{t("sendTokens.recipientLabel")}</Label>
        <Input
          id="recipient"
          placeholder={t("sendTokens.recipientPlaceholder")}
          {...register(`transactions.${index}.recipient` as const)}
        />
        {getErrorMessage("recipient") && (
          <p className="text-xs text-red-500">{String(getErrorMessage("recipient"))}</p>
        )}
      </div>

      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="amount">{t("sendTokens.amountLabel")}</Label>
        <Input
          id="amount"
          type="number"
          step="0.001"
          placeholder={t("sendTokens.amountPlaceholder")}
          {...register(`transactions.${index}.amount` as const)}
        />
        {getErrorMessage("amount") && (
          <p className="text-xs text-red-500">{String(getErrorMessage("amount"))}</p>
        )}
      </div>

      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="description">{t("sendTokens.descriptionLabel")}</Label>
        <Textarea
          id="description"
          placeholder={t("sendTokens.descriptionPlaceholder")}
          {...register(`transactions.${index}.description` as const)}
        />
      </div>
    </div>
  );
}
