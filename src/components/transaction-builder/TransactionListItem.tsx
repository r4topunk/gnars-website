"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { type Transaction } from "@/components/proposal-wizard";

interface TransactionListItemProps {
  index: number;
  transaction: Transaction;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onEdit: (transaction: Transaction) => void;
  onRemove: (id: string) => void;
}

export function TransactionListItem({ index, transaction, label, icon: Icon, onEdit, onRemove }: TransactionListItemProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-sm font-medium">Transaction {index + 1}</span>
                <Badge variant="secondary" className="text-xs">
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


