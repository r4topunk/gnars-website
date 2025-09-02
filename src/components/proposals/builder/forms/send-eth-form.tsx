import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface FormData {
  target?: string;
  description?: string;
  value?: string;
}

export interface FormComponentProps {
  data: FormData;
  onChange: (updates: Partial<FormData>) => void;
}

export function SendEthForm({ data, onChange }: FormComponentProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="recipient">Recipient Address *</Label>
        <Input
          id="recipient"
          placeholder="0x... or ENS name"
          value={data.target || ""}
          onChange={(e) => onChange({ target: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="amount">Amount (ETH) *</Label>
        <Input
          id="amount"
          type="number"
          step="0.001"
          placeholder="0.0"
          value={data.value || ""}
          onChange={(e) => onChange({ value: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe the purpose of this payment..."
          value={data.description || ""}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </div>
    </div>
  );
}
