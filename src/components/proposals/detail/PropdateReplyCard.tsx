"use client";

import { formatDistanceToNow } from "date-fns";
import { Markdown } from "@/components/common/Markdown";
import { AddressDisplay } from "@/components/ui/address-display";
import { type Propdate } from "@/services/propdates";

interface PropdateReplyCardProps {
  reply: Propdate;
}

export function PropdateReplyCard({ reply }: PropdateReplyCardProps) {
  const timeCreated = formatDistanceToNow(new Date(reply.timeCreated * 1000), {
    addSuffix: true,
  });

  return (
    <div className="rounded-lg border bg-muted/50 p-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
        <AddressDisplay address={reply.attester} showCopy={false} showExplorer={false} />
        <span>{timeCreated}</span>
      </div>
      <Markdown>{reply.message}</Markdown>
    </div>
  );
}
