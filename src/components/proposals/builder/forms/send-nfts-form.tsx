import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface FormData {
  contractAddress?: string;
  tokenId?: string;
  from?: string;
  to?: string;
  description?: string;
}

export interface FormComponentProps {
  data: FormData;
  onChange: (updates: Partial<FormData>) => void;
}

export function SendNFTsForm({ data, onChange }: FormComponentProps) {
  return (
    <div className="space-y-4">
      <div className="grid w/full max-w-sm items-center gap-2">
        <Label htmlFor="contractAddress">NFT Contract Address *</Label>
        <Input
          id="contractAddress"
          placeholder="0x..."
          value={data.contractAddress || ""}
          onChange={(e) => onChange({ contractAddress: e.target.value })}
        />
      </div>

      <div className="grid w/full max-w-sm items-center gap-2">
        <Label htmlFor="tokenId">Token ID *</Label>
        <Input
          id="tokenId"
          placeholder="1"
          value={data.tokenId || ""}
          onChange={(e) => onChange({ tokenId: e.target.value })}
        />
      </div>

      <div className="grid w/full max-w-sm items-center gap-2">
        <Label htmlFor="from">From Address *</Label>
        <Input
          id="from"
          placeholder="0x... (typically treasury address)"
          value={data.from || ""}
          onChange={(e) => onChange({ from: e.target.value })}
        />
      </div>

      <div className="grid w/full max-w-sm items-center gap-2">
        <Label htmlFor="to">To Address *</Label>
        <Input
          id="to"
          placeholder="0x... or ENS name"
          value={data.to || ""}
          onChange={(e) => onChange({ to: e.target.value })}
        />
      </div>

      <div className="grid w/full max-w-sm items-center gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe the purpose of this NFT transfer..."
          value={data.description || ""}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </div>
    </div>
  );
}
