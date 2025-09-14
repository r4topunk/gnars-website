import React from "react";
import { Info } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type ProposalFormValues } from "../../schema";

interface Props {
  index: number;
}

export function CustomTransactionForm({ index }: Props) {
  const {
    register,
    formState: { errors },
  } = useFormContext<ProposalFormValues>();

  const getErrorMessage = (key: string): string | undefined => {
    const txErrors = errors.transactions?.[index] as unknown as
      | Record<string, { message?: string }>
      | undefined;
    return txErrors?.[key]?.message;
  };

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Custom transactions require technical knowledge. Make sure you understand the contract
          interaction.
        </AlertDescription>
      </Alert>

      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="target">Contract Address *</Label>
        <Input
          id="target"
          placeholder="0x..."
          {...register(`transactions.${index}.target` as const)}
        />
        {getErrorMessage("target") && (
          <p className="text-xs text-red-500">{String(getErrorMessage("target"))}</p>
        )}
      </div>

      <div className="grid w/full max-w-sm items-center gap-2">
        <Label htmlFor="value">Value (ETH)</Label>
        <Input
          id="value"
          type="number"
          step="0.001"
          placeholder="0.0"
          {...register(`transactions.${index}.value` as const)}
        />
        {getErrorMessage("value") && (
          <p className="text-xs text-red-500">{String(getErrorMessage("value"))}</p>
        )}
      </div>

      <div className="grid w/full max-w-sm items-center gap-2">
        <Label htmlFor="calldata">Calldata</Label>
        <Textarea
          id="calldata"
          placeholder="0x... - Transaction calldata"
          {...register(`transactions.${index}.calldata` as const)}
          rows={2}
        />
        {getErrorMessage("calldata") && (
          <p className="text-xs text-red-500">{String(getErrorMessage("calldata"))}</p>
        )}
      </div>

      <div className="grid w/full max-w-sm items-center gap-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          placeholder="Clearly describe what this transaction does..."
          {...register(`transactions.${index}.description` as const)}
        />
        {getErrorMessage("description") && (
          <p className="text-xs text-red-500">{String(getErrorMessage("description"))}</p>
        )}
      </div>
    </div>
  );
}
