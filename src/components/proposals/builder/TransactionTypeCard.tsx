"use client";

import { Card, CardContent } from "@/components/ui/card";

interface TransactionTypeCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  type: "send-eth" | "send-usdc" | "send-tokens" | "send-nfts" | "droposal" | "custom";
  onClick: () => void;
}

export function TransactionTypeCard({ icon: Icon, label, description, type, onClick }: TransactionTypeCardProps) {
  const typeStyles: Record<TransactionTypeCardProps["type"], { iconBg: string; iconText: string }> = {
    "send-eth": { iconBg: "bg-blue-100 dark:bg-blue-900/30", iconText: "text-blue-600 dark:text-blue-400" },
    "send-usdc": { iconBg: "bg-emerald-100 dark:bg-emerald-900/30", iconText: "text-emerald-600 dark:text-emerald-400" },
    "send-tokens": { iconBg: "bg-violet-100 dark:bg-violet-900/30", iconText: "text-violet-600 dark:text-violet-400" },
    "send-nfts": { iconBg: "bg-fuchsia-100 dark:bg-fuchsia-900/30", iconText: "text-fuchsia-600 dark:text-fuchsia-400" },
    droposal: { iconBg: "bg-amber-100 dark:bg-amber-900/30", iconText: "text-amber-600 dark:text-amber-400" },
    custom: { iconBg: "bg-slate-100 dark:bg-slate-900/30", iconText: "text-slate-600 dark:text-slate-300" },
  };
  const styles = typeStyles[type] || typeStyles.custom;
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${styles.iconBg}`}>
            <Icon className={`h-5 w-5 ${styles.iconText}`} />
          </div>
          <div>
            <h3 className="font-medium">{label}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


