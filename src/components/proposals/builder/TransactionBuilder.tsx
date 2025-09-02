"use client";

import { useState } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import { Coins, Image, Send, Settings, Zap } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ActionForms } from "./ActionForms";
import { type ProposalFormValues, type TransactionFormValues } from "../schema";
import { TransactionTypeCard } from "@/components/proposals/builder/TransactionTypeCard";
import { TransactionListItem } from "@/components/proposals/builder/TransactionListItem";

interface TransactionBuilderProps {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onAddTransaction: (transaction: TransactionFormValues) => void;
  onUpdateTransaction: (index: number, transaction: TransactionFormValues) => void;
  onRemoveTransaction: (index: number) => void;
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
    icon: Image,
  },
  {
    type: "droposal",
    label: "Create Droposal",
    description: "Create a Zora NFT drop",
    icon: Zap,
  },
  {
    type: "custom",
    label: "Custom Transaction",
    description: "Contract interaction",
    icon: Settings,
  },
] as const;

export function TransactionBuilder({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onAddTransaction,
  onUpdateTransaction,
  onRemoveTransaction,
  onFormsVisibilityChange,
}: TransactionBuilderProps) {
  const { control, getValues, watch } = useFormContext<ProposalFormValues>();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { fields: transactions, append, update, remove } = useFieldArray({
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
      const updatedTx = currentValues.transactions[editingTransactionIndex] as unknown as TransactionFormValues;
      onUpdateTransaction(editingTransactionIndex, updatedTx);
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
      onRemoveTransaction(editingTransactionIndex);
    }
    setEditingTransactionIndex(null);
    onFormsVisibilityChange?.(false);
    setIsCreatingNew(false);
  };

  const handleRemoveTransaction = (index: number) => {
    remove(index);
    onRemoveTransaction(index);
  };

  const getTransactionTypeInfo = (type: string) => {
    return transactionTypes.find((t) => t.type === type) || transactionTypes[4];
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
                type={actionType.type as "send-eth" | "send-usdc" | "send-tokens" | "send-nfts" | "droposal" | "custom"}
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
                      <TransactionListItem
                        key={transactions[index]?.id || transaction.id || index}
                        index={index}
                        transaction={transaction}
                        label={typeInfo.label}
                        icon={typeInfo.icon}
                        onEdit={() => handleEditTransaction(index)}
                        onRemove={() => handleRemoveTransaction(index)}
                      />
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
