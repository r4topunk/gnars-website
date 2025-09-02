import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface FormData {
  description?: string;
  recipient?: string;
  amount?: string;
  tokenAddress?: string;
}

export interface FormComponentProps {
  data: FormData;
  onChange: (updates: Partial<FormData>) => void;
}

export function SendTokensForm({ data, onChange }: FormComponentProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="tokenAddress">Token Contract Address *</Label>
        <Input
          id="tokenAddress"
          placeholder="0x..."
          value={data.tokenAddress || ""}
          onChange={(e) => onChange({ tokenAddress: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="recipient">Recipient Address *</Label>
        <Input
          id="recipient"
          placeholder="0x... or ENS name"
          value={data.recipient || ""}
          onChange={(e) => onChange({ recipient: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="amount">Amount *</Label>
        <Input
          id="amount"
          type="number"
          step="0.001"
          placeholder="0.0"
          value={data.amount || ""}
          onChange={(e) => onChange({ amount: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe the purpose of this token transfer..."
          value={data.description || ""}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </div>
    </div>
  );
}
