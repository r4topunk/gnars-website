"use client";

import { useTranslations } from "next-intl";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TREASURY_TOKEN_ALLOWLIST } from "@/lib/config";
import { type ProposalFormValues } from "../../schema";

interface Props {
  index: number;
}

export function SendUsdcForm({ index }: Props) {
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
        <Label htmlFor="tokenAddress">{t("sendUsdc.tokenLabel")}</Label>
        <Input id="tokenAddress" value={TREASURY_TOKEN_ALLOWLIST.USDC} disabled />
      </div>

      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="recipient">{t("sendUsdc.recipientLabel")}</Label>
        <Input
          id="recipient"
          placeholder={t("sendUsdc.recipientPlaceholder")}
          {...register(`transactions.${index}.recipient` as const)}
        />
        {getErrorMessage("recipient") && (
          <p className="text-xs text-red-500">{String(getErrorMessage("recipient"))}</p>
        )}
      </div>

      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="amount">{t("sendUsdc.amountLabel")}</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          placeholder={t("sendUsdc.amountPlaceholder")}
          {...register(`transactions.${index}.amount` as const)}
        />
        {getErrorMessage("amount") && (
          <p className="text-xs text-red-500">{String(getErrorMessage("amount"))}</p>
        )}
      </div>

      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="description">{t("sendUsdc.descriptionLabel")}</Label>
        <Textarea
          id="description"
          placeholder={t("sendUsdc.descriptionPlaceholder")}
          {...register(`transactions.${index}.description` as const)}
        />
      </div>
    </div>
  );
}
