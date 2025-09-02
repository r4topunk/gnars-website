"use client";

import { useState } from "react";
import { Coins, Image, Plus, Send, Settings, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ActionForms } from "./ActionForms";
import { Transaction } from "@/components/proposals/ProposalWizard";
import { TransactionTypeCard } from "@/components/proposals/builder/TransactionTypeCard";
import { TransactionListItem } from "@/components/proposals/builder/TransactionListItem";

interface TransactionBuilderProps {
  transactions: Transaction[];
  onAddTransaction: (transaction: Transaction) => void;
  onUpdateTransaction: (id: string, updates: Partial<Transaction>) => void;
  onRemoveTransaction: (id: string) => void;
}

const transactionTypes = [
  {
    type: "send-eth",
    label: "Send ETH",
    description: "Send ETH from treasury",
    icon: Send,
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
    description: "Advanced contract interaction",
    icon: Settings,
  },
] as const;

export function TransactionBuilder({
  transactions,
  onAddTransaction,
  onUpdateTransaction,
  onRemoveTransaction,
}: TransactionBuilderProps) {
  const [showActionForms, setShowActionForms] = useState(false);
  const [selectedActionType, setSelectedActionType] = useState<string>("");
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);

  const handleAddTransaction = (type: string) => {
    setSelectedActionType(type);
    setEditingTransaction(null);
    setShowActionForms(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setSelectedActionType(transaction.type);
    setEditingTransaction(transaction.id);
    setShowActionForms(true);
  };

  const handleTransactionSubmit = (transactionData: Partial<Transaction>) => {
    if (editingTransaction) {
      onUpdateTransaction(editingTransaction, transactionData);
    } else {
      const newTransaction: Transaction = {
        id: `tx-${Date.now()}`,
        type: selectedActionType as Transaction["type"],
        target: "",
        calldata: "0x",
        description: "",
        ...transactionData,
      };
      onAddTransaction(newTransaction);
    }
    setShowActionForms(false);
    setSelectedActionType("");
    setEditingTransaction(null);
  };

  const handleCancel = () => {
    setShowActionForms(false);
    setSelectedActionType("");
    setEditingTransaction(null);
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
                onClick={() => handleAddTransaction(actionType.type)}
              />
            ))}
          </div>

          {/* Existing Transactions */}
          {transactions.length > 0 && (
            <div className="space-y-4">
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-4">Added Transactions</h3>
                <div className="space-y-3">
                  {transactions.map((transaction, index) => {
                    const typeInfo = getTransactionTypeInfo(transaction.type);
                    return (
                      <TransactionListItem
                        key={transaction.id}
                        index={index}
                        transaction={transaction}
                        label={typeInfo.label}
                        icon={typeInfo.icon}
                        onEdit={handleEditTransaction}
                        onRemove={onRemoveTransaction}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {transactions.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <Plus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No transactions added yet. Choose an action type above to get started.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <ActionForms
          actionType={selectedActionType}
          existingData={
            editingTransaction ? transactions.find((t) => t.id === editingTransaction) : undefined
          }
          onSubmit={handleTransactionSubmit}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
