import React, { useState } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Info } from "lucide-react";
import { type ProposalFormValues } from "../../schema";

export interface AbiFunction {
  name: string;
  type: string;
  inputs?: Array<{ name: string; type: string }>;
}

interface Props { index: number }

export function CustomTransactionForm({ index }: Props) {
  const { register, control, watch, formState: { errors } } = useFormContext<ProposalFormValues>();
  const [selectedFunction, setSelectedFunction] = useState("");
  const [parsedAbi, setParsedAbi] = useState<AbiFunction[]>([]);

  const watchedAbi = watch(`transactions.${index}.abi`);

  // Parse ABI when it changes
  React.useEffect(() => {
    if (watchedAbi) {
      try {
        const abi = JSON.parse(watchedAbi);
        setParsedAbi(abi.filter((item: AbiFunction) => item.type === "function"));
      } catch {
        setParsedAbi([]);
      }
    } else {
      setParsedAbi([]);
    }
  }, [watchedAbi]);

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
        {errors.transactions?.[index]?.target && (
          <p className="text-xs text-red-500">{String(errors.transactions?.[index]?.target?.message)}</p>
        )}
      </div>

      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="value">Value (ETH)</Label>
        <Input
          id="value"
          type="number"
          step="0.001"
          placeholder="0.0"
          {...register(`transactions.${index}.value` as const)}
        />
        {errors.transactions?.[index]?.value && (
          <p className="text-xs text-red-500">{String(errors.transactions?.[index]?.value?.message)}</p>
        )}
      </div>

      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="abi">Contract ABI *</Label>
        <Controller
          name={`transactions.${index}.abi` as const}
          control={control}
          render={({ field }) => (
            <Textarea
              id="abi"
              placeholder="[{...}] - Paste the contract ABI JSON"
              {...field}
              rows={4}
            />
          )}
        />
        {errors.transactions?.[index]?.abi && (
          <p className="text-xs text-red-500">{String(errors.transactions?.[index]?.abi?.message)}</p>
        )}
      </div>

      {parsedAbi.length > 0 && (
        <div className="grid w-full max-w-sm items-center gap-2">
          <Label id="function-label">Function</Label>
          <Select value={selectedFunction} onValueChange={setSelectedFunction}>
            <SelectTrigger id="function" aria-labelledby="function-label">
              <SelectValue placeholder="Select a function" />
            </SelectTrigger>
            <SelectContent>
              {parsedAbi.map((func, i) => (
                <SelectItem key={i} value={func.name}>
                  {func.name}({func.inputs?.map((input) => input.type).join(", ")})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="calldata">Calldata</Label>
        <Textarea
          id="calldata"
          placeholder="0x... - Transaction calldata"
          {...register(`transactions.${index}.calldata` as const)}
          rows={2}
        />
        {errors.transactions?.[index]?.calldata && (
          <p className="text-xs text-red-500">{String(errors.transactions?.[index]?.calldata?.message)}</p>
        )}
      </div>

      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          placeholder="Clearly describe what this transaction does..."
          {...register(`transactions.${index}.description` as const)}
        />
        {errors.transactions?.[index]?.description && (
          <p className="text-xs text-red-500">{String(errors.transactions?.[index]?.description?.message)}</p>
        )}
      </div>
    </div>
  );
}
