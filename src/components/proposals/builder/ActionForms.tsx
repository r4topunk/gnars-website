"use client";

import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DroposalForm } from "@/components/common/DroposalForm";
import { type ProposalFormValues, type TransactionFormValues } from "../schema";
import { SendEthForm } from "@/components/proposals/builder/forms/send-eth-form";
import { SendTokensForm } from "@/components/proposals/builder/forms/send-tokens-form";
import { SendNFTsForm } from "@/components/proposals/builder/forms/send-nfts-form";
import { CustomTransactionForm } from "@/components/proposals/builder/forms/custom-transaction-form";
import { SendUsdcForm } from "@/components/proposals/builder/forms/send-usdc-form";

interface ActionFormsProps {
  index: number;
  actionType: string;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ActionForms({ index, actionType, onSubmit, onCancel }: ActionFormsProps) {
  const { handleSubmit, setValue } = useFormContext<ProposalFormValues>();

  // Ensure type is set for this transaction index
  useEffect(() => {
    setValue(`transactions.${index}.type` as const, actionType as TransactionFormValues["type"]);
  }, [actionType, index, setValue]);

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
            <p className="text-sm text-muted-foreground mt-1">
              Configure transaction details
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderForm()}

        <Separator />

        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)}>
            Save Transaction
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
