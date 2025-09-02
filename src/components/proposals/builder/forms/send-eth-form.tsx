import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type ProposalFormValues } from "../../schema";

interface Props { index: number }

export function SendEthForm({ index }: Props) {
  const { register, formState: { errors } } = useFormContext<ProposalFormValues>();

  return (
    <div className="space-y-4">
      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="target">Recipient Address *</Label>
        <Input
          id="target"
          placeholder="0x... or ENS name"
          {...register(`transactions.${index}.target` as const)}
        />
        {errors.transactions?.[index]?.target && (
          <p className="text-xs text-red-500">{String(errors.transactions?.[index]?.target?.message)}</p>
        )}
      </div>

      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="value">Amount (ETH) *</Label>
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
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe the purpose of this payment..."
          {...register(`transactions.${index}.description` as const)}
        />
      </div>
    </div>
  );
}
