"use client";

import Link from "next/link";
import { Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type TransactionFormValues } from "../schema";

interface TransactionCardProps {
  index: number;
  transaction: TransactionFormValues;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onEdit?: () => void;
  onRemove?: () => void;
  children?: React.ReactNode;
  variant?: "builder" | "detail";
}

const typeStyles: Record<
  TransactionFormValues["type"],
  { accent: string; bg: string; border: string; text: string }
> = {
  "send-eth": {
    accent: "blue",
    bg: "bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950/20 dark:to-sky-950/20",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-700 dark:text-blue-300",
  },
  "send-usdc": {
    accent: "emerald",
    bg: "bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20",
    border: "border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  "send-tokens": {
    accent: "violet",
    bg: "bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20",
    border: "border-violet-200 dark:border-violet-800",
    text: "text-violet-700 dark:text-violet-300",
  },
  "send-nfts": {
    accent: "fuchsia",
    bg: "bg-gradient-to-br from-fuchsia-50 to-pink-50 dark:from-fuchsia-950/20 dark:to-pink-950/20",
    border: "border-fuchsia-200 dark:border-fuchsia-800",
    text: "text-fuchsia-700 dark:text-fuchsia-300",
  },
  droposal: {
    accent: "amber",
    bg: "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-700 dark:text-amber-300",
  },
  "buy-coin": {
    accent: "cyan",
    bg: "bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/20 dark:to-blue-950/20",
    border: "border-cyan-200 dark:border-cyan-800",
    text: "text-cyan-700 dark:text-cyan-300",
  },
  custom: {
    accent: "slate",
    bg: "bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-950/20 dark:to-gray-950/20",
    border: "border-slate-200 dark:border-slate-800",
    text: "text-slate-700 dark:text-slate-300",
  },
} as const;

export function TransactionCard({
  index,
  transaction,
  label,
  icon: Icon,
  onEdit = () => undefined,
  onRemove = () => undefined,
  children,
  variant = "builder",
}: TransactionCardProps) {
  const styles = typeStyles[transaction.type] || typeStyles.custom;

  return (
    <Card className={cn("relative overflow-hidden", styles.border)}>
      {/* Subtle gradient background based on type */}
      <div className={cn("absolute inset-0 opacity-[0.03]", styles.bg)} />

      <CardHeader className="relative">
        <div className="flex items-start justify-between gap-4">
          {/* Left section with icon and main info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Type Icon with gradient background */}
            <div className={cn("p-2.5 rounded-xl", styles.bg, "border", styles.border)}>
              <Icon className={cn("h-5 w-5", styles.text)} />
            </div>

            {/* Transaction Info */}
            <div className="flex-1 space-y-2">
              {/* Header with number and type badge */}
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">Tx #{index + 1}</h3>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs font-medium px-2 py-0.5",
                    styles.text,
                    "bg-opacity-10 border-0",
                  )}
                >
                  {label}
                </Badge>
              </div>

              {/* Description */}
              {transaction.description && (
                <p className="text-sm text-muted-foreground leading-relaxed pr-4">
                  {transaction.description}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons - only show in builder variant */}
          {variant === "builder" && (
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={onEdit}
                className={cn(
                  "h-8 w-8 transition-all duration-200",
                  "hover:bg-blue-50 dark:hover:bg-blue-950/30",
                  "hover:text-blue-600 dark:hover:text-blue-400",
                )}
              >
                <Edit className="h-4 w-4" />
              </Button>

              <Button
                size="icon"
                variant="ghost"
                onClick={onRemove}
                className={cn(
                  "h-8 w-8 transition-all duration-200",
                  "hover:bg-red-50 dark:hover:bg-red-950/30",
                  "hover:text-red-600 dark:hover:text-red-400",
                )}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      {/* Transaction Details */}
      <CardContent className="relative pt-0">
        <div className="rounded-lg bg-muted/30 p-4 space-y-4">
          {children}

          {variant === "detail" && transaction.rawCalldata !== undefined && transaction.rawCalldata !== "0x" && (
            <div className="space-y-2 max-w-full">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Calldata</p>
              <div className="rounded-md bg-background border px-3 py-2 font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all max-h-20">
                <Link
                  href={`https://calldata.swiss-knife.xyz/decoder?calldata=${transaction.rawCalldata}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground hover:underline"
                >
                  {transaction.rawCalldata}
                </Link>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
