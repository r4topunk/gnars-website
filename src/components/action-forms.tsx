"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { encodeFunctionData, formatEther, parseEther } from "viem";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { DroposalForm } from "./droposal-form";
import { Transaction } from "./proposal-wizard";
import { SendEthForm } from "@/components/action-forms/send-eth-form";
import { SendTokensForm } from "@/components/action-forms/send-tokens-form";
import { SendNFTsForm } from "@/components/action-forms/send-nfts-form";
import { CustomTransactionForm } from "@/components/action-forms/custom-transaction-form";

interface ActionFormsProps {
  actionType: string;
  existingData?: Transaction;
  onSubmit: (data: Partial<Transaction>) => void;
  onCancel: () => void;
}

interface FormData {
  target?: string;
  description?: string;
  value?: string;
  recipient?: string;
  amount?: string;
  tokenAddress?: string;
  contractAddress?: string;
  tokenId?: string;
  from?: string;
  to?: string;
  calldata?: string;
  abi?: string;
  [key: string]: string | undefined;
}

export function ActionForms({ actionType, existingData, onSubmit, onCancel }: ActionFormsProps) {
  const [formData, setFormData] = useState<FormData>({
    target: existingData?.target || "",
    description: existingData?.description || "",
    value: existingData?.value ? formatEther(existingData.value) : "0",
    recipient: (existingData?.recipient as string) || "",
    amount: (existingData?.amount as string) || "",
    tokenAddress: (existingData?.tokenAddress as string) || "",
    contractAddress: (existingData?.contractAddress as string) || "",
    tokenId: (existingData?.tokenId as string) || "",
    from: (existingData?.from as string) || "",
    to: (existingData?.to as string) || "",
    calldata: existingData?.calldata || "",
    abi: (existingData?.abi as string) || "",
  });

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData((prev: FormData) => ({ ...prev, ...updates }));
  };

  const handleSubmit = () => {
    let calldata = "0x";
    let value = BigInt(0);
    let target = formData.target;

    try {
      if (actionType === "send-eth") {
        value = parseEther(formData.value || "0");
      } else if (actionType === "send-tokens") {
        const transferCalldata = encodeFunctionData({
          abi: [
            {
              name: "transfer",
              type: "function",
              inputs: [
                { name: "to", type: "address" },
                { name: "amount", type: "uint256" },
              ],
            },
          ],
          functionName: "transfer",
          args: [formData.recipient, parseEther(formData.amount || "0")],
        });
        calldata = transferCalldata;
        target = formData.tokenAddress;
      } else if (actionType === "send-nfts") {
        const transferFromCalldata = encodeFunctionData({
          abi: [
            {
              name: "transferFrom",
              type: "function",
              inputs: [
                { name: "from", type: "address" },
                { name: "to", type: "address" },
                { name: "tokenId", type: "uint256" },
              ],
            },
          ],
          functionName: "transferFrom",
          args: [formData.from || "0x", formData.to, BigInt(formData.tokenId || "0")],
        });
        calldata = transferFromCalldata;
        target = formData.contractAddress;
      } else if (actionType === "custom") {
        calldata = formData.calldata || "0x";
        if (formData.value) {
          value = parseEther(formData.value);
        }
      }
    } catch (error) {
      console.error("Error encoding transaction:", error);
      return;
    }

    onSubmit({
      target,
      calldata,
      value,
      description: formData.description,
      type: actionType as Transaction["type"],
      id: Math.random().toString(36).substr(2, 9),
    });
  };

  const renderForm = () => {
    switch (actionType) {
      case "send-eth":
        return <SendEthForm data={formData} onChange={updateFormData} />;
      case "send-tokens":
        return <SendTokensForm data={formData} onChange={updateFormData} />;
      case "send-nfts":
        return <SendNFTsForm data={formData} onChange={updateFormData} />;
      case "droposal":
        return <DroposalForm data={formData} onChange={updateFormData} />;
      case "custom":
        return <CustomTransactionForm data={formData} onChange={updateFormData} />;
      default:
        return <div>Unknown action type</div>;
    }
  };

  const getTitle = () => {
    const titles = {
      "send-eth": "Send ETH",
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
              {existingData ? "Edit transaction details" : "Configure transaction details"}
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
          <Button onClick={handleSubmit}>
            {existingData ? "Update Transaction" : "Add Transaction"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
