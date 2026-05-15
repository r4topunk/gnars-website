"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeftRight, Coins, FileImage, Send, Settings, Video } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { TransactionTypeCard } from "@/components/proposals/builder/TransactionTypeCard";
import { BuyCoinTransactionDetails } from "@/components/proposals/transaction/BuyCoinTransactionDetails";
import { CustomTransactionDetails } from "@/components/proposals/transaction/CustomTransactionDetails";
import { DroposalTransactionDetails } from "@/components/proposals/transaction/DroposalTransactionDetails";
import { SendEthTransactionDetails } from "@/components/proposals/transaction/SendEthTransactionDetails";
import { SendNftsTransactionDetails } from "@/components/proposals/transaction/SendNftsTransactionDetails";
import { SendTokensTransactionDetails } from "@/components/proposals/transaction/SendTokensTransactionDetails";
import { SendUsdcTransactionDetails } from "@/components/proposals/transaction/SendUsdcTransactionDetails";
import { TransactionCard } from "@/components/proposals/transaction/TransactionCard";
import { Separator } from "@/components/ui/separator";
import { type ProposalFormValues, type TransactionFormValues } from "../schema";
import { ActionForms } from "./ActionForms";

interface TransactionBuilderProps {
  onFormsVisibilityChange?: (visible: boolean) => void;
}

const transactionTypes = [
  { type: "send-eth", icon: Send },
  { type: "send-usdc", icon: Coins },
  { type: "send-tokens", icon: Coins },
  { type: "send-nfts", icon: FileImage },
  { type: "droposal", icon: Video },
  { type: "buy-coin", icon: ArrowLeftRight },
  { type: "custom", icon: Settings },
] as const;

export function TransactionBuilder({ onFormsVisibilityChange }: TransactionBuilderProps) {
  const t = useTranslations("propose");
  const { control, getValues, watch } = useFormContext<ProposalFormValues>();
  const {
    fields: transactions,
    append,
    update,
    remove,
  } = useFieldArray({
    control,
    name: "transactions",
  });

  const [showActionForms, setShowActionForms] = useState(false);
  const [selectedActionType, setSelectedActionType] = useState<string>("");
  const [editingTransactionIndex, setEditingTransactionIndex] = useState<number | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);

  // Always render list items from live watched values, not from `fields` snapshot
  const watchedTransactions = watch("transactions");

  const handleAddTransaction = (type: string) => {
    // Append a minimal stub so the form fields can bind to transactions[index].*
    const newIndex = transactions.length;
    append({ type } as unknown as TransactionFormValues);
    setSelectedActionType(type);
    setEditingTransactionIndex(newIndex);
    setShowActionForms(true);
    onFormsVisibilityChange?.(true);
    setIsCreatingNew(true);
  };

  const handleEditTransaction = (index: number) => {
    const transaction = transactions[index];
    setSelectedActionType(transaction.type);
    setEditingTransactionIndex(index);
    setShowActionForms(true);
    onFormsVisibilityChange?.(true);
    setIsCreatingNew(false);
  };

  const handleTransactionSubmit = () => {
    // Values are already bound to useFieldArray via nested registration
    // Parent callbacks can still be notified for external side-effects
    if (editingTransactionIndex !== null) {
      const currentValues = getValues();
      const updatedTx = currentValues.transactions[
        editingTransactionIndex
      ] as unknown as TransactionFormValues;
      update(editingTransactionIndex, updatedTx);
    }
    // For new items, onAddTransaction already handled on append
    setShowActionForms(false);
    setSelectedActionType("");
    setEditingTransactionIndex(null);
    onFormsVisibilityChange?.(false);
    setIsCreatingNew(false);
  };

  const handleCancel = () => {
    setShowActionForms(false);
    setSelectedActionType("");
    // If we were creating a new transaction and user cancels, remove the placeholder
    if (isCreatingNew && editingTransactionIndex !== null) {
      remove(editingTransactionIndex);
    }
    setEditingTransactionIndex(null);
    onFormsVisibilityChange?.(false);
    setIsCreatingNew(false);
  };

  const handleRemoveTransaction = (index: number) => {
    remove(index);
  };

  const txLabels: Record<string, string> = {
    "send-eth": t("transactions.types.sendEth"),
    "send-usdc": t("transactions.types.sendUsdc"),
    "send-tokens": t("transactions.types.sendTokens"),
    "send-nfts": t("transactions.types.sendNfts"),
    droposal: t("transactions.types.droposal"),
    "buy-coin": t("transactions.types.buyCoin"),
    custom: t("transactions.types.custom"),
  };
  const txDescs: Record<string, string> = {
    "send-eth": t("transactions.types.sendEthDesc"),
    "send-usdc": t("transactions.types.sendUsdcDesc"),
    "send-tokens": t("transactions.types.sendTokensDesc"),
    "send-nfts": t("transactions.types.sendNftsDesc"),
    droposal: t("transactions.types.droposalDesc"),
    "buy-coin": t("transactions.types.buyCoinDesc"),
    custom: t("transactions.types.customDesc"),
  };

  const getTransactionTypeInfo = (type: string) => {
    return transactionTypes.find((tx) => tx.type === type) || transactionTypes[5];
  };

  const renderTransactionDetails = (transaction: TransactionFormValues) => {
    switch (transaction.type) {
      case "send-eth":
        return <SendEthTransactionDetails transaction={transaction} />;
      case "send-usdc":
        return <SendUsdcTransactionDetails transaction={transaction} />;
      case "send-tokens":
        return <SendTokensTransactionDetails transaction={transaction} />;
      case "send-nfts":
        return <SendNftsTransactionDetails transaction={transaction} />;
      case "buy-coin":
        return <BuyCoinTransactionDetails transaction={transaction} />;
      case "custom":
        return <CustomTransactionDetails transaction={transaction} />;
      case "droposal":
        return <DroposalTransactionDetails transaction={transaction} />;
      default:
        return <CustomTransactionDetails transaction={transaction} />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{t("transactions.title")}</h2>
        <p className="text-muted-foreground">{t("transactions.description")}</p>
      </div>

      {!showActionForms ? (
        <>
          {/* Action Type Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {transactionTypes.map((actionType) => (
              <TransactionTypeCard
                key={actionType.type}
                icon={actionType.icon}
                label={txLabels[actionType.type] ?? actionType.type}
                description={txDescs[actionType.type] ?? ""}
                type={
                  actionType.type as
                    | "send-eth"
                    | "send-usdc"
                    | "send-tokens"
                    | "send-nfts"
                    | "droposal"
                    | "buy-coin"
                    | "custom"
                }
                onClick={() => handleAddTransaction(actionType.type)}
              />
            ))}
          </div>

          {/* Existing Transactions */}
          {(watchedTransactions?.length ?? 0) > 0 && (
            <div className="space-y-4">
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  {t("transactions.addedTransactions")}
                </h3>
                <div className="space-y-3">
                  {watchedTransactions?.map((transaction, index) => {
                    const typeInfo = getTransactionTypeInfo(transaction.type);
                    return (
                      <TransactionCard
                        key={transactions[index]?.id || transaction.id || index}
                        index={index}
                        transaction={transaction}
                        label={txLabels[typeInfo.type] ?? typeInfo.type}
                        icon={typeInfo.icon}
                        onEdit={() => handleEditTransaction(index)}
                        onRemove={() => handleRemoveTransaction(index)}
                      >
                        {renderTransactionDetails(transaction)}
                      </TransactionCard>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {(watchedTransactions?.length ?? 0) === 0 && null}
        </>
      ) : (
        <ActionForms
          index={editingTransactionIndex ?? 0}
          actionType={selectedActionType}
          onSubmit={handleTransactionSubmit}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
