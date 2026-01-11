import { type ReactNode } from "react";

interface ReadItemProps {
  label: string;
  value: ReactNode;
}

export function ReadItem({ label, value }: ReadItemProps) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
