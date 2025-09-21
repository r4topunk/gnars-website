"use client";

import { Coins, Image as ImageIcon, Send, Settings, Zap } from "lucide-react";
import { TransactionVisualization } from "@/components/proposals/transaction/TransactionVisualization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type TransactionFormValues } from "../schema";

function getTransactionIcon(type: string | undefined) {
  switch (type) {
    case "send-eth":
      return Send;
    case "send-usdc":
      return Coins;
    case "send-tokens":
      return Coins;
    case "send-nfts":
      return ImageIcon;
    case "droposal":
      return Zap;
    case "custom":
      return Settings;
    default:
      return Settings;
  }
}

function getTransactionLabel(type: string | undefined) {
  switch (type) {
    case "send-eth":
      return "Send ETH";
    case "send-usdc":
      return "Send USDC";
    case "send-tokens":
      return "Send Tokens";
    case "send-nfts":
      return "Send NFTs";
    case "droposal":
      return "Create Droposal";
    case "custom":
      return "Custom Transaction";
    default:
      return "Unknown";
  }
}


export function TransactionsSummaryList({
  transactions,
}: {
  transactions: TransactionFormValues[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transactions ({transactions.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {transactions.map((transaction, index) => {
          const Icon = getTransactionIcon(transaction.type);
          return (
            <TransactionVisualization
              key={transaction.id || `${transaction.type}-${index}`}
              index={index}
              transaction={transaction}
              label={getTransactionLabel(transaction.type)}
              icon={Icon}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}
