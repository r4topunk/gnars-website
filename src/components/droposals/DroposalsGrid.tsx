import { DroposalListItem } from "@/services/droposals";
import { DroposalCard } from "@/components/droposals/DroposalCard";

interface DroposalsGridProps {
  items: DroposalListItem[];
}

export function DroposalsGrid({ items }: DroposalsGridProps) {
  if (items.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        No droposals found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <DroposalCard key={item.proposalId} item={item} />
      ))}
    </div>
  );
}


