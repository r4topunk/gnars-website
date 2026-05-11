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

export function SendEthForm({ index }: Props) {
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
        <Label htmlFor="target">{t("sendEth.recipientLabel")}</Label>
        <Input
          id="target"
          placeholder={t("sendEth.recipientPlaceholder")}
          {...register(`transactions.${index}.target` as const)}
        />
        {getErrorMessage("target") && (
          <p className="text-xs text-red-500">{String(getErrorMessage("target"))}</p>
        )}
      </div>

      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="value">{t("sendEth.amountLabel")}</Label>
        <Input
          id="value"
          type="number"
          step="0.001"
          placeholder={t("sendEth.amountPlaceholder")}
          {...register(`transactions.${index}.value` as const)}
        />
        {getErrorMessage("value") && (
          <p className="text-xs text-red-500">{String(getErrorMessage("value"))}</p>
        )}
      </div>

      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="description">{t("sendEth.descriptionLabel")}</Label>
        <Textarea
          id="description"
          placeholder={t("sendEth.descriptionPlaceholder")}
          {...register(`transactions.${index}.description` as const)}
        />
      </div>
    </div>
  );
}
