"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { createTradeCall, setApiKey, type TradeParameters } from "@zoralabs/coins-sdk";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { Address, formatEther, parseEther } from "viem";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useSplitCreation } from "@/hooks/use-split-creation";
import { DAO_ADDRESSES } from "@/lib/config";
import {
  IMMUTABLE_CONTROLLER,
  prepareSplitConfigForSDK,
  validateSplitRecipients,
} from "@/lib/splits-utils";
import { type ProposalFormValues, type TransactionFormValues } from "../schema";

const CustomTransactionForm = dynamic(() =>
  import("@/components/proposals/builder/forms/custom-transaction-form").then((mod) => ({
    default: mod.CustomTransactionForm,
  })),
);
const DroposalForm = dynamic(() =>
  import("@/components/proposals/builder/forms/droposal-form").then((mod) => ({
    default: mod.DroposalForm,
  })),
);
const SendEthForm = dynamic(() =>
  import("@/components/proposals/builder/forms/send-eth-form").then((mod) => ({
    default: mod.SendEthForm,
  })),
);
const SendNFTsForm = dynamic(() =>
  import("@/components/proposals/builder/forms/send-nfts-form").then((mod) => ({
    default: mod.SendNFTsForm,
  })),
);
const SendTokensForm = dynamic(() =>
  import("@/components/proposals/builder/forms/send-tokens-form").then((mod) => ({
    default: mod.SendTokensForm,
  })),
);
const SendUsdcForm = dynamic(() =>
  import("@/components/proposals/builder/forms/send-usdc-form").then((mod) => ({
    default: mod.SendUsdcForm,
  })),
);
const BuyCoinForm = dynamic(() =>
  import("@/components/proposals/builder/forms/buy-coin-form").then((mod) => ({
    default: mod.BuyCoinForm,
  })),
);

interface ActionFormsProps {
  index: number;
  actionType: string;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ActionForms({ index, actionType, onSubmit, onCancel }: ActionFormsProps) {
  const t = useTranslations("propose");
  const { handleSubmit, setValue, getValues } = useFormContext<ProposalFormValues>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [sdkError, setSDKError] = useState<string | null>(null);

  // Add split creation hook
  const { createSplit } = useSplitCreation();

  // Ensure type is set for this transaction index
  useEffect(() => {
    setValue(`transactions.${index}.type` as const, actionType as TransactionFormValues["type"]);
  }, [actionType, index, setValue]);

  // Handle form validation errors
  const onError = (errors: Record<string, unknown>) => {
    console.error("Form validation errors:", errors);
    if (
      errors.transactions &&
      typeof errors.transactions === "object" &&
      errors.transactions !== null
    ) {
      const transactions = errors.transactions as Record<number, Record<string, unknown>>;
      const txErrors = transactions[index];
      if (txErrors) {
        const errorMessages = Object.entries(txErrors)
          .map(([field, error]: [string, unknown]) => {
            if (error && typeof error === "object" && error !== null && "message" in error) {
              return `${field}: ${(error as { message: string }).message}`;
            }
            return `${field}: Unknown error`;
          })
          .join(", ");
        setSDKError(t("transactions.validationErrors", { errors: errorMessages }));
      }
    }
  };

  // Generate SDK calldata for buy-coin transactions
  const handleBuyCoinSubmit = async () => {
    const tx = getValues(`transactions.${index}`);

    if (tx.type !== "buy-coin") {
      onSubmit();
      return;
    }

    setIsGenerating(true);
    setSDKError(null);

    try {
      // Validate required fields
      if (!tx.coinAddress) throw new Error("Coin address is required");
      if (!tx.ethAmount) throw new Error("ETH amount is required");
      if (!tx.slippage) throw new Error("Slippage is required");

      // Set Zora API key
      const apiKey = process.env.NEXT_PUBLIC_ZORA_API_KEY;
      if (apiKey) {
        setApiKey(apiKey);
      }

      // Build trade parameters
      const tradeParameters: TradeParameters = {
        sell: { type: "eth" },
        buy: { type: "erc20", address: tx.coinAddress as Address },
        amountIn: parseEther(tx.ethAmount),
        slippage: parseFloat(tx.slippage) / 100,
        sender: DAO_ADDRESSES.treasury,
        recipient: DAO_ADDRESSES.treasury,
      };

      // Generate trade call
      const quote = await createTradeCall(tradeParameters);

      if (!quote?.call) {
        throw new Error("Failed to generate trade call from SDK");
      }

      // Store SDK-generated data in form
      setValue(`transactions.${index}.target`, quote.call.target as Address);
      setValue(`transactions.${index}.calldata`, quote.call.data as `0x${string}`);
      setValue(`transactions.${index}.value`, formatEther(BigInt(quote.call.value)));

      // Proceed with submit
      onSubmit();
    } catch (error) {
      console.error("Error generating SDK calldata:", error);
      setSDKError(error instanceof Error ? error.message : "Failed to generate transaction");
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle split creation for droposals
  const handleDroposalSubmit = async () => {
    const tx = getValues(`transactions.${index}`);

    if (tx.type !== "droposal") {
      onSubmit();
      return;
    }

    // Check if using split
    const useSplit = tx.useSplit;
    const splitRecipients = tx.splitRecipients;
    const splitDistributorFee = tx.splitDistributorFee || 0;

    if (!useSplit || !splitRecipients || splitRecipients.length === 0) {
      // Not using split, proceed normally
      onSubmit();
      return;
    }

    // Validate split configuration
    const validationErrors = validateSplitRecipients(splitRecipients);
    if (validationErrors.length > 0) {
      setSDKError(
        `Split configuration invalid: ${validationErrors.map((e) => e.message).join(", ")}`,
      );
      return;
    }

    setIsGenerating(true);
    setSDKError(null);

    try {
      console.log("🔄 Creating split contract...");

      // Create split contract
      const splitConfig = {
        recipients: splitRecipients,
        distributorFeePercent: splitDistributorFee,
        controller: IMMUTABLE_CONTROLLER,
      };

      const sdkConfig = prepareSplitConfigForSDK(splitConfig);
      const splitAddress = await createSplit(sdkConfig);

      if (!splitAddress) {
        throw new Error("Failed to create split contract - no address returned");
      }

      // Save split address to form
      setValue(`transactions.${index}.createdSplitAddress`, splitAddress);
      setValue(`transactions.${index}.payoutAddress`, splitAddress);

      console.log(`✅ Split created: ${splitAddress}`);

      // Proceed with submit
      onSubmit();
    } catch (error) {
      console.error("Error creating split:", error);
      setSDKError(error instanceof Error ? error.message : "Failed to create split contract");
    } finally {
      setIsGenerating(false);
    }
  };

  const renderForm = () => {
    switch (actionType) {
      case "send-eth":
        return <SendEthForm index={index} />;
      case "send-usdc":
        return <SendUsdcForm index={index} />;
      case "send-tokens":
        return <SendTokensForm index={index} />;
      case "send-nfts":
        return <SendNFTsForm index={index} />;
      case "droposal":
        return <DroposalForm index={index} />;
      case "buy-coin":
        return <BuyCoinForm index={index} />;
      case "custom":
        return <CustomTransactionForm index={index} />;
      default:
        return <div>{t("transactions.unknownType")}</div>;
    }
  };

  const titleKeys: Record<string, Parameters<typeof t>[0]> = {
    "send-eth": "transactions.types.sendEth",
    "send-usdc": "transactions.types.sendUsdc",
    "send-tokens": "transactions.types.sendTokens",
    "send-nfts": "transactions.types.sendNfts",
    droposal: "transactions.types.droposal",
    "buy-coin": "transactions.types.buyCoin",
    custom: "transactions.types.custom",
  };

  const getTitle = () => t(titleKeys[actionType] ?? "transactions.types.custom");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-4">
          <Button size="sm" variant="outline" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <CardTitle>{getTitle()}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {t("transactions.configureDetails")}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderForm()}

        {sdkError && (
          <Alert variant="destructive">
            <AlertDescription>{sdkError}</AlertDescription>
          </Alert>
        )}

        <Separator />

        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={onCancel} disabled={isGenerating}>
            {t("transactions.cancel")}
          </Button>
          <Button
            onClick={handleSubmit(
              actionType === "droposal"
                ? handleDroposalSubmit
                : actionType === "buy-coin"
                  ? handleBuyCoinSubmit
                  : onSubmit,
              onError,
            )}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {actionType === "droposal"
                  ? t("transactions.creatingSplit")
                  : actionType === "buy-coin"
                    ? t("transactions.generating")
                    : t("transactions.saving")}
              </>
            ) : (
              t("transactions.saveTransaction")
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
