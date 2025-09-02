import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TREASURY_TOKEN_ALLOWLIST } from "@/lib/config";

export interface FormData {
  description?: string;
  recipient?: string;
  amount?: string;
}

export interface FormComponentProps {
  data: FormData;
  onChange: (updates: Partial<FormData>) => void;
}

export function SendUsdcForm({ data, onChange }: FormComponentProps) {
  return (
    <div className="space-y-4">
      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="tokenAddress">Token (fixed)</Label>
        <Input id="tokenAddress" value={TREASURY_TOKEN_ALLOWLIST.USDC} disabled />
      </div>

      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="recipient">Recipient Address *</Label>
        <Input
          id="recipient"
          placeholder="0x... or ENS name"
          value={data.recipient || ""}
          onChange={(e) => onChange({ recipient: e.target.value })}
        />
      </div>

      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="amount">Amount (USDC) *</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          placeholder="0.00"
          value={data.amount || ""}
          onChange={(e) => onChange({ amount: e.target.value })}
        />
      </div>

      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe the purpose of this USDC transfer..."
          value={data.description || ""}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </div>
    </div>
  );
}


