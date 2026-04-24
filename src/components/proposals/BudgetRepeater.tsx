"use client";

import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BudgetRow } from "@/lib/proposal-template-schemas";

export interface BudgetRepeaterProps {
  /** Dotted path within the form state, e.g. "budget" or "templateFields.budget". */
  name: string;
  /** Per-row error accessor. */
  getRowError?: (index: number) => { label?: string; amount?: string } | undefined;
  /** Top-level error (e.g. "add at least one line"). */
  topLevelError?: string;
}

const CURRENCIES = ["ETH", "USDC"] as const;

export function BudgetRepeater({ name, getRowError, topLevelError }: BudgetRepeaterProps) {
  const { control, register } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });
  const rows = (useWatch({ control, name }) as BudgetRow[] | undefined) ?? [];

  const totals = new Map<"ETH" | "USDC", number>();
  for (const r of rows) {
    if (!r || typeof r.amount !== "number" || r.amount <= 0) continue;
    if (!r.label?.trim?.()) continue;
    const cur = (r.currency ?? "ETH") as "ETH" | "USDC";
    totals.set(cur, (totals.get(cur) ?? 0) + r.amount);
  }
  const totalsStr =
    totals.size === 0
      ? "—"
      : [...totals.entries()]
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .map(([cur, sum]) => `${Number(sum.toFixed(6))} ${cur}`)
          .join(" · ");

  return (
    <div className="space-y-3">
      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          No budget lines yet. Add one to request funding.
        </p>
      ) : (
        <div className="space-y-2">
          {fields.map((field, index) => {
            const rowErr = getRowError?.(index);
            return (
              <div
                key={field.id}
                className="grid grid-cols-[1fr_140px_110px_auto] gap-2 items-start"
              >
                <div>
                  <Input
                    placeholder="Line item (e.g. Sponsorship fee)"
                    aria-label={`Budget line ${index + 1} label`}
                    {...register(`${name}.${index}.label` as const)}
                  />
                  {rowErr?.label ? (
                    <p className="text-xs text-red-500 mt-1">{rowErr.label}</p>
                  ) : null}
                </div>
                <div>
                  <Input
                    type="number"
                    step="any"
                    min={0}
                    placeholder="Amount"
                    aria-label={`Budget line ${index + 1} amount`}
                    {...register(`${name}.${index}.amount` as const, { valueAsNumber: true })}
                  />
                  {rowErr?.amount ? (
                    <p className="text-xs text-red-500 mt-1">{rowErr.amount}</p>
                  ) : null}
                </div>
                <CurrencySelect name={`${name}.${index}.currency` as const} />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={`Remove budget line ${index + 1}`}
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => append({ label: "", amount: 0, currency: "ETH" })}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add line
        </Button>
        <div className="text-sm">
          <span className="text-muted-foreground mr-1">Total:</span>
          <span className="font-semibold tabular-nums">{totalsStr}</span>
        </div>
      </div>

      {topLevelError ? <p className="text-xs text-red-500">{topLevelError}</p> : null}
    </div>
  );
}

function CurrencySelect({ name }: { name: string }) {
  const { setValue, control } = useFormContext();
  const value = useWatch({ control, name }) as string | undefined;
  return (
    <div>
      <Label className="sr-only" htmlFor={name}>
        Currency
      </Label>
      <Select
        value={value ?? "ETH"}
        onValueChange={(v) => setValue(name, v, { shouldDirty: true })}
      >
        <SelectTrigger id={name}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CURRENCIES.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
