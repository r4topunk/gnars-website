import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type ProposalFormValues } from "../../schema";

interface Props { index: number }

export function SendNFTsForm({ index }: Props) {
  const { register, formState: { errors } } = useFormContext<ProposalFormValues>();

  return (
    <div className="space-y-4">
      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="contractAddress">NFT Contract Address *</Label>
        <Input
          id="contractAddress"
          placeholder="0x..."
          {...register(`transactions.${index}.contractAddress` as const)}
        />
        {errors.transactions?.[index]?.contractAddress && (
          <p className="text-xs text-red-500">{String(errors.transactions?.[index]?.contractAddress?.message)}</p>
        )}
      </div>

      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="tokenId">Token ID *</Label>
        <Input
          id="tokenId"
          placeholder="1"
          {...register(`transactions.${index}.tokenId` as const)}
        />
        {errors.transactions?.[index]?.tokenId && (
          <p className="text-xs text-red-500">{String(errors.transactions?.[index]?.tokenId?.message)}</p>
        )}
      </div>

      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="from">From Address *</Label>
        <Input
          id="from"
          placeholder="0x... (typically treasury address)"
          {...register(`transactions.${index}.from` as const)}
        />
        {errors.transactions?.[index]?.from && (
          <p className="text-xs text-red-500">{String(errors.transactions?.[index]?.from?.message)}</p>
        )}
      </div>

      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="to">To Address *</Label>
        <Input
          id="to"
          placeholder="0x... or ENS name"
          {...register(`transactions.${index}.to` as const)}
        />
        {errors.transactions?.[index]?.to && (
          <p className="text-xs text-red-500">{String(errors.transactions?.[index]?.to?.message)}</p>
        )}
      </div>

      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe the purpose of this NFT transfer..."
          {...register(`transactions.${index}.description` as const)}
        />
      </div>
    </div>
  );
}
