import { useFormContext } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Info } from "lucide-react";
import { type ProposalFormValues } from "../../schema";

interface Props {
  index: number;
}

export function BuyCoinForm({ index }: Props) {
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
          <p className="text-sm">
            This transaction will use the Zora Coins SDK to purchase a content or creator coin
            from the treasury. The swap executes through Uniswap v4 with Zora hooks.
          </p>
        </AlertDescription>
      </Alert>

      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="coinAddress">Coin Address *</Label>
        <Input
          id="coinAddress"
          placeholder="0x..."
          {...register(`transactions.${index}.coinAddress` as const)}
        />
        {getErrorMessage("coinAddress") && (
          <p className="text-xs text-red-500">{String(getErrorMessage("coinAddress"))}</p>
        )}
        <p className="text-xs text-muted-foreground">
          ERC-20 address of the content or creator coin
        </p>
      </div>

      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="ethAmount">ETH Amount *</Label>
        <Input
          id="ethAmount"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.1"
          {...register(`transactions.${index}.ethAmount` as const)}
        />
        {getErrorMessage("ethAmount") && (
          <p className="text-xs text-red-500">{String(getErrorMessage("ethAmount"))}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Amount of ETH to spend from treasury
        </p>
      </div>

      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="slippage">Slippage Tolerance (%) *</Label>
        <Input
          id="slippage"
          type="number"
          step="0.1"
          min="0"
          max="100"
          placeholder="5"
          defaultValue="5"
          {...register(`transactions.${index}.slippage` as const)}
        />
        {getErrorMessage("slippage") && (
          <p className="text-xs text-red-500">{String(getErrorMessage("slippage"))}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Maximum acceptable slippage (recommended: 5%)
        </p>
      </div>
    </div>
  );
}
