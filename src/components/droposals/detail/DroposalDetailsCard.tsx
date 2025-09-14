/**
 * DroposalDetailsCard
 * Shows basic details like name and description.
 */
import { SectionHeader } from "@/components/common/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";

export interface DroposalDetailsCardProps {
  name?: string | null;
  title?: string | null;
  description?: string | null;
}

export function DroposalDetailsCard({ name, title, description }: DroposalDetailsCardProps) {
  return (
    <Card>
      <SectionHeader title="Details" />
      <CardContent className="space-y-2">
        <div className="text-sm">
          <span className="text-muted-foreground">Name</span>
          <div className="font-medium">{name || title}</div>
        </div>
        {description && (
          <div className="text-sm">
            <span className="text-muted-foreground">Description</span>
            <div className="whitespace-pre-wrap mt-1">{description}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
