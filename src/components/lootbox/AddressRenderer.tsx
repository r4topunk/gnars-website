import { type Address } from "viem";

interface AddressRendererProps {
  value: string | Address | null | undefined;
}

export function AddressRenderer({ value }: AddressRendererProps) {
  if (!value) return <>-</>;
  return <span className="font-mono text-xs break-all">{value}</span>;
}
