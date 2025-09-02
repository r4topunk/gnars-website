import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type ProposalFormValues } from "../../schema";

interface Props { index: number }

export function SendTokensForm({ index }: Props) {
  const { register, formState: { errors } } = useFormContext<ProposalFormValues>();

  return (
    <div className="space-y-4">
      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="tokenAddress">Token Contract Address *</Label>
        <Input
          id="tokenAddress"
          placeholder="0x..."
          {...register(`transactions.${index}.tokenAddress` as const)}
        />
        {errors.transactions?.[index]?.tokenAddress && (
          <p className="text-xs text-red-500">{String(errors.transactions?.[index]?.tokenAddress?.message)}</p>
        )}
      </div>

      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="recipient">Recipient Address *</Label>
        <Input
          id="recipient"
          placeholder="0x... or ENS name"
          {...register(`transactions.${index}.recipient` as const)}
        />
        {errors.transactions?.[index]?.recipient && (
          <p className="text-xs text-red-500">{String(errors.transactions?.[index]?.recipient?.message)}</p>
        )}
      </div>

      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="amount">Amount *</Label>
        <Input
          id="amount"
          type="number"
          step="0.001"
          placeholder="0.0"
          {...register(`transactions.${index}.amount` as const)}
        />
        {errors.transactions?.[index]?.amount && (
          <p className="text-xs text-red-500">{String(errors.transactions?.[index]?.amount?.message)}</p>
        )}
      </div>

      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe the purpose of this token transfer..."
          {...register(`transactions.${index}.description` as const)}
        />
      </div>
    </div>
  );
}
