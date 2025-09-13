"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AddressDisplay } from "@/components/ui/address-display";
import { type Propdate } from "@/services/propdates";
import { formatDistanceToNow } from "date-fns";
import { Markdown } from "@/components/common/Markdown";

interface PropdateCardProps {
  propdate: Propdate;
  showContent?: boolean;
  preview?: boolean;
  previewMaxHeightPx?: number;
}

export function PropdateCard({
  propdate,
  showContent = true,
  preview = false,
  previewMaxHeightPx = 180,
}: PropdateCardProps) {
  const timeCreated = formatDistanceToNow(new Date(propdate.timeCreated * 1000), {
    addSuffix: true,
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
          <AddressDisplay address={propdate.attester} showCopy={false} showExplorer={false} />
          <span>{timeCreated}</span>
        </div>
      </CardHeader>
      {showContent && (
        <CardContent className="pt-6">
          {preview ? (
            <div className="relative overflow-hidden" style={{ maxHeight: previewMaxHeightPx }}>
              <Markdown>{propdate.message}</Markdown>
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
            </div>
          ) : (
            <Markdown>{propdate.message}</Markdown>
          )}
        </CardContent>
      )}
    </Card>
  );
}
