import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Info } from "lucide-react";

export interface AbiFunction {
  name: string;
  type: string;
  inputs?: Array<{ name: string; type: string }>;
}

export interface FormData {
  target?: string;
  description?: string;
  value?: string;
  calldata?: string;
  abi?: string;
}

export interface FormComponentProps {
  data: FormData;
  onChange: (updates: Partial<FormData>) => void;
}

export function CustomTransactionForm({ data, onChange }: FormComponentProps) {
  const [selectedFunction, setSelectedFunction] = useState("");
  const [parsedAbi, setParsedAbi] = useState<AbiFunction[]>([]);

  const handleAbiChange = (abiString: string) => {
    onChange({ abi: abiString });
    try {
      const abi = JSON.parse(abiString);
      setParsedAbi(abi.filter((item: AbiFunction) => item.type === "function"));
    } catch {
      setParsedAbi([]);
    }
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

      <div>
        <Label htmlFor="target">Contract Address *</Label>
        <Input
          id="target"
          placeholder="0x..."
          value={data.target || ""}
          onChange={(e) => onChange({ target: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="value">Value (ETH)</Label>
        <Input
          id="value"
          type="number"
          step="0.001"
          placeholder="0.0"
          value={data.value || "0"}
          onChange={(e) => onChange({ value: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="abi">Contract ABI *</Label>
        <Textarea
          id="abi"
          placeholder="[{...}] - Paste the contract ABI JSON"
          value={data.abi || ""}
          onChange={(e) => handleAbiChange(e.target.value)}
          rows={4}
        />
      </div>

      {parsedAbi.length > 0 && (
        <div>
          <Label htmlFor="function">Function</Label>
          <Select value={selectedFunction} onValueChange={setSelectedFunction}>
            <SelectTrigger>
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

      <div>
        <Label htmlFor="calldata">Calldata</Label>
        <Textarea
          id="calldata"
          placeholder="0x... - Transaction calldata"
          value={data.calldata || "0x"}
          onChange={(e) => onChange({ calldata: e.target.value })}
          rows={2}
        />
      </div>

      <div>
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          placeholder="Clearly describe what this transaction does..."
          value={data.description || ""}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </div>
    </div>
  );
}
