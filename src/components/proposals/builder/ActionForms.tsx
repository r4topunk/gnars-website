"use client";

import { useEffect, useState } from "react";
import { Address, formatEther, parseEther } from "viem";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { createTradeCall, setApiKey, type TradeParameters } from "@zoralabs/coins-sdk";
import { GNARS_ADDRESSES } from "@/lib/config";
import { CustomTransactionForm } from "@/components/proposals/builder/forms/custom-transaction-form";
import { DroposalForm } from "@/components/proposals/builder/forms/droposal-form";
import { SendEthForm } from "@/components/proposals/builder/forms/send-eth-form";
import { SendNFTsForm } from "@/components/proposals/builder/forms/send-nfts-form";
import { SendTokensForm } from "@/components/proposals/builder/forms/send-tokens-form";
import { SendUsdcForm } from "@/components/proposals/builder/forms/send-usdc-form";
import { BuyCoinForm } from "@/components/proposals/builder/forms/buy-coin-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { type ProposalFormValues, type TransactionFormValues } from "../schema";

interface ActionFormsProps {
  index: number;
  actionType: string;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ActionForms({ index, actionType, onSubmit, onCancel }: ActionFormsProps) {
  const { handleSubmit, setValue, getValues } = useFormContext<ProposalFormValues>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [sdkError, setSDKError] = useState<string | null>(null);

  // Ensure type is set for this transaction index
  useEffect(() => {
    setValue(`transactions.${index}.type` as const, actionType as TransactionFormValues["type"]);
  }, [actionType, index, setValue]);

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
        sender: GNARS_ADDRESSES.treasury,
        recipient: GNARS_ADDRESSES.treasury,
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
        return <div>Unknown action type</div>;
    }
  };

  const getTitle = () => {
    const titles = {
      "send-eth": "Send ETH",
      "send-usdc": "Send USDC",
      "send-tokens": "Send Tokens",
      "send-nfts": "Send NFTs",
      droposal: "Create Droposal",
      "buy-coin": "Buy Coin",
      custom: "Custom Transaction",
    } as const;
    return titles[actionType as keyof typeof titles] || "Transaction";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-4">
          <Button size="sm" variant="outline" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <CardTitle>{getTitle()}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Configure transaction details</p>
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
            Cancel
          </Button>
          <Button
            onClick={handleSubmit(handleBuyCoinSubmit)}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Save Transaction"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
