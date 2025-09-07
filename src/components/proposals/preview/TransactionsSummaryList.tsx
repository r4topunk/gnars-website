"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SimpleAddressDisplay } from "@/components/ui/address-display";
import { Coins, Image as ImageIcon, Send, Settings, Zap } from "lucide-react";
import { type TransactionFormValues } from "../schema";
import { TREASURY_TOKEN_ALLOWLIST } from "@/lib/config";

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

function resolveTargetAddress(tx: TransactionFormValues): string {
  switch (tx.type) {
    case "send-usdc":
      return TREASURY_TOKEN_ALLOWLIST.USDC;
    case "send-eth":
    case "custom":
      return tx.target || "";
    case "send-tokens":
      return tx.tokenAddress || "";
    case "send-nfts":
      return tx.contractAddress || "";
    case "droposal":
      return "";
  }
}

function resolveValue(tx: TransactionFormValues): string {
  switch (tx.type) {
    case "send-eth":
      return tx.value || "0";
    case "send-usdc":
    case "send-tokens":
      return tx.amount || "0";
    case "custom":
      return tx.value || "0";
    case "send-nfts":
    case "droposal":
      return "0";
  }
}

function resolveUnit(tx: TransactionFormValues): string {
  switch (tx.type) {
    case "send-usdc":
      return "USDC";
    default:
      return "ETH";
  }
}

function resolveCalldata(tx: TransactionFormValues): string {
  switch (tx.type) {
    case "custom":
      return tx.calldata || "0x";
    default:
      return "0x";
  }
}

export function TransactionsSummaryList({ transactions }: { transactions: TransactionFormValues[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transactions ({transactions.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {transactions.map((transaction, index) => {
          const Icon = getTransactionIcon(transaction.type);
          return (
            <div key={transaction.id || `${transaction.type}-${index}` } className="flex items-start space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium">Transaction {index + 1}</span>
                  <Badge variant="secondary">{getTransactionLabel(transaction.type)}</Badge>
                </div>
                <div className="text-xs font-mono bg-muted p-2 rounded mt-2">
                  <div>
                    Target: <SimpleAddressDisplay address={resolveTargetAddress(transaction)} />
                  </div>
                  <div>Value: {resolveValue(transaction)} {resolveUnit(transaction)}</div>
                  <div>Calldata: {(() => { const cd = resolveCalldata(transaction); return cd ? (cd.length > 22 ? cd.slice(0, 20) + "..." : cd) : "0x"; })()}</div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}


