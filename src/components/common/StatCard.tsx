import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number | ReactNode;
  subtitle?: string | ReactNode;
  className?: string;
  titleClassName?: string;
  valueClassName?: string;
  contentClassName?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  className,
  titleClassName,
  valueClassName,
  contentClassName,
}: StatCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-1">
        <CardTitle className={cn("text-sm font-medium text-muted-foreground", titleClassName)}>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn("pt-2", contentClassName)}>
        <div className={cn("text-2xl font-bold", valueClassName)}>{value}</div>
        {subtitle ? (
          typeof subtitle === "string" ? (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          ) : (
            subtitle
          )
        ) : null}
      </CardContent>
    </Card>
  );
}
