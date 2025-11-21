"use client";

import { useState } from "react";
import { Coins, FileImage, Send, Settings, Video, ArrowLeftRight } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { TransactionCard } from "@/components/proposals/transaction/TransactionCard";
import { SendEthTransactionDetails } from "@/components/proposals/transaction/SendEthTransactionDetails";
import { SendUsdcTransactionDetails } from "@/components/proposals/transaction/SendUsdcTransactionDetails";
import { SendTokensTransactionDetails } from "@/components/proposals/transaction/SendTokensTransactionDetails";
import { SendNftsTransactionDetails } from "@/components/proposals/transaction/SendNftsTransactionDetails";
import { CustomTransactionDetails } from "@/components/proposals/transaction/CustomTransactionDetails";
import { DroposalTransactionDetails } from "@/components/proposals/transaction/DroposalTransactionDetails";
import { BuyCoinTransactionDetails } from "@/components/proposals/transaction/BuyCoinTransactionDetails";
import { TransactionTypeCard } from "@/components/proposals/builder/TransactionTypeCard";
import { Separator } from "@/components/ui/separator";
import { type ProposalFormValues, type TransactionFormValues } from "../schema";
import { ActionForms } from "./ActionForms";

interface TransactionBuilderProps {
  onFormsVisibilityChange?: (visible: boolean) => void;
}

const transactionTypes = [
  {
    type: "send-eth",
    label: "Send ETH",
    description: "Send ETH from treasury",
    icon: Send,
  },
  {
    type: "send-usdc",
    label: "Send USDC",
    description: "Send USDC",
    icon: Coins,
  },
  {
    type: "send-tokens",
    label: "Send Tokens",
    description: "Send ERC-20 tokens",
    icon: Coins,
  },
  {
    type: "send-nfts",
    label: "Send NFTs",
    description: "Transfer NFTs",
    icon: FileImage,
  },
  {
    type: "droposal",
    label: "Create Droposal",
    description: "Create a Zora NFT drop",
    icon: Video,
  },
  {
    type: "buy-coin",
    label: "Buy Coin",
    description: "Purchase content coin",
    icon: ArrowLeftRight,
  },
  {
    type: "custom",
    label: "Custom Transaction",
    description: "Contract interaction",
    icon: Settings,
  },
] as const;

export function TransactionBuilder({ onFormsVisibilityChange }: TransactionBuilderProps) {
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

  const getTransactionTypeInfo = (type: string) => {
    return transactionTypes.find((t) => t.type === type) || transactionTypes[5];
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
        <h2 className="text-2xl font-bold mb-2">Proposal Transactions</h2>
        <p className="text-muted-foreground">
          Add one or more transactions that will be executed if this proposal passes
        </p>
      </div>

      {!showActionForms ? (
        <>
          {/* Action Type Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {transactionTypes.map((actionType) => (
              <TransactionTypeCard
                key={actionType.type}
                icon={actionType.icon}
                label={actionType.label}
                description={actionType.description}
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
                <h3 className="text-lg font-semibold mb-4">Added Transactions</h3>
                <div className="space-y-3">
                  {watchedTransactions?.map((transaction, index) => {
                    const typeInfo = getTransactionTypeInfo(transaction.type);
                    return (
                      <TransactionCard
                        key={transactions[index]?.id || transaction.id || index}
                        index={index}
                        transaction={transaction}
                        label={typeInfo.label}
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
