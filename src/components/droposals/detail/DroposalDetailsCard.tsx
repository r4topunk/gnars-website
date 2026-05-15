/**
 * DroposalDetailsCard
 * Shows basic details like name and description.
 */
import { getTranslations } from "next-intl/server";
import { SectionHeader } from "@/components/common/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";

export interface DroposalDetailsCardProps {
  name?: string | null;
  title?: string | null;
  description?: string | null;
}

export async function DroposalDetailsCard({ name, title, description }: DroposalDetailsCardProps) {
  const t = await getTranslations("droposals");
  return (
    <Card>
      <SectionHeader title={t("detail.detailsTitle")} />
      <CardContent className="space-y-2">
        <div className="text-sm">
          <span className="text-muted-foreground">{t("detail.name")}</span>
          <div className="font-medium">{name || title}</div>
        </div>
        {description && (
          <div className="text-sm">
            <span className="text-muted-foreground">{t("detail.description")}</span>
            <div className="whitespace-pre-wrap mt-1">{description}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
