import type { ReactNode } from "react";
import { CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string | ReactNode;
  description?: string | ReactNode;
  action?: ReactNode;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}

export function SectionHeader({
  title,
  description,
  action,
  className,
  titleClassName,
  descriptionClassName,
}: SectionHeaderProps) {
  return (
    <CardHeader className={cn(className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className={cn("text-xl font-bold flex items-center gap-2", titleClassName)}>
            {title}
          </CardTitle>
          {description ? (
            typeof description === "string" ? (
              <p className={cn("text-sm text-muted-foreground mt-1", descriptionClassName)}>
                {description}
              </p>
            ) : (
              description
            )
          ) : null}
        </div>
        {action ? <CardAction>{action}</CardAction> : null}
      </div>
    </CardHeader>
  );
}
