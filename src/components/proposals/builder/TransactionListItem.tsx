"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { type Transaction } from "@/components/proposals/ProposalWizard";

interface TransactionListItemProps {
  index: number;
  transaction: Transaction;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onEdit: (transaction: Transaction) => void;
  onRemove: (id: string) => void;
}

export function TransactionListItem({ index, transaction, label, icon: Icon, onEdit, onRemove }: TransactionListItemProps) {
  const typeStyles: Record<Transaction["type"], { iconBg: string; iconText: string; cardBorder: string; badgeText: string; badgeBorder: string }> = {
    "send-eth": {
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      iconText: "text-blue-600 dark:text-blue-400",
      cardBorder: "border-l-4 border-blue-500/60 dark:border-blue-500/50",
      badgeText: "text-blue-700 dark:text-blue-300",
      badgeBorder: "border-blue-300 dark:border-blue-700",
    },
    "send-usdc": {
      iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
      iconText: "text-emerald-600 dark:text-emerald-400",
      cardBorder: "border-l-4 border-emerald-500/60 dark:border-emerald-500/50",
      badgeText: "text-emerald-700 dark:text-emerald-300",
      badgeBorder: "border-emerald-300 dark:border-emerald-700",
    },
    "send-tokens": {
      iconBg: "bg-violet-100 dark:bg-violet-900/30",
      iconText: "text-violet-600 dark:text-violet-400",
      cardBorder: "border-l-4 border-violet-500/60 dark:border-violet-500/50",
      badgeText: "text-violet-700 dark:text-violet-300",
      badgeBorder: "border-violet-300 dark:border-violet-700",
    },
    "send-nfts": {
      iconBg: "bg-fuchsia-100 dark:bg-fuchsia-900/30",
      iconText: "text-fuchsia-600 dark:text-fuchsia-400",
      cardBorder: "border-l-4 border-fuchsia-500/60 dark:border-fuchsia-500/50",
      badgeText: "text-fuchsia-700 dark:text-fuchsia-300",
      badgeBorder: "border-fuchsia-300 dark:border-fuchsia-700",
    },
    droposal: {
      iconBg: "bg-amber-100 dark:bg-amber-900/30",
      iconText: "text-amber-600 dark:text-amber-400",
      cardBorder: "border-l-4 border-amber-500/60 dark:border-amber-500/50",
      badgeText: "text-amber-700 dark:text-amber-300",
      badgeBorder: "border-amber-300 dark:border-amber-700",
    },
    custom: {
      iconBg: "bg-slate-100 dark:bg-slate-900/30",
      iconText: "text-slate-600 dark:text-slate-300",
      cardBorder: "border-l-4 border-slate-500/60 dark:border-slate-500/50",
      badgeText: "text-slate-700 dark:text-slate-300",
      badgeBorder: "border-slate-300 dark:border-slate-700",
    },
  };

  const styles = typeStyles[transaction.type] || typeStyles.custom;
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className={`p-2 rounded-lg ${styles.iconBg}`}>
              <Icon className={`h-4 w-4 ${styles.iconText}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-sm font-medium">Transaction {index + 1}</span>
                <Badge variant="outline" className={`text-xs ${styles.badgeText} ${styles.badgeBorder}`}>
                  {label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {transaction.description || "No description provided"}
              </p>
              <div className="text-xs font-mono bg-muted p-2 rounded">
                <div>Target: {transaction.target || "Not set"}</div>
                {transaction.value && <div>Value: {transaction.value.toString()} ETH</div>}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <Button size="sm" variant="outline" onClick={() => onEdit(transaction)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => onRemove(transaction.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


