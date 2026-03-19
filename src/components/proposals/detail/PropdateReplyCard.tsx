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
    <div className="rounded-md border bg-muted/40 p-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <AddressDisplay
            address={reply.attester}
            variant="compact"
            showAvatar
            showCopy={false}
            showExplorer={false}
            avatarSize="sm"
          />
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{timeCreated}</span>
      </div>
      <Markdown className="prose-sm">{reply.message}</Markdown>
    </div>
  );
}
