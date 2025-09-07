/**
 * DroposalSupporters
 * Placeholder list of collectors. Future: fetch and render supporters.
 */
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/common/SectionHeader";

export function DroposalSupporters() {
  return (
    <Card>
      <SectionHeader title="Supporters" description="Collectors who minted this drop" />
      <CardContent>
        <div className="text-muted-foreground">Supporters list coming soon.</div>
      </CardContent>
    </Card>
  );
}


