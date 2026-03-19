"use client";

import { formatDistanceToNow } from "date-fns";
import { Markdown } from "@/components/common/Markdown";
import { AddressDisplay } from "@/components/ui/address-display";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { type Propdate } from "@/services/propdates";
import { PropdateReplyCard } from "./PropdateReplyCard";

interface PropdateCardProps {
  propdate: Propdate;
  showContent?: boolean;
  preview?: boolean;
  previewMaxHeightPx?: number;
  replies?: Propdate[];
  isReplying?: boolean;
  onReplyClick?: (propdate: Propdate) => void;
}

export function PropdateCard({
  propdate,
  showContent = true,
  preview = false,
  previewMaxHeightPx = 180,
  replies = [],
  isReplying = false,
  onReplyClick,
}: PropdateCardProps) {
  const timeCreated = formatDistanceToNow(new Date(propdate.timeCreated * 1000), {
    addSuffix: true,
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
          <AddressDisplay address={propdate.attester} showCopy={false} showExplorer={false} />
          <div className="flex items-center gap-2">
            {propdate.milestoneId != null && propdate.milestoneId >= 0 && (
              <span className="rounded-full border px-2 py-0.5 text-xs font-medium">
                Milestone {propdate.milestoneId + 1}
              </span>
            )}
            <span>{timeCreated}</span>
          </div>
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
      {/* Replies */}
      {replies.length > 0 && (
        <div className="mr-6 mb-4 ml-10 border-l-2 border-muted pl-4 space-y-3">
          {replies.map((reply) => (
            <PropdateReplyCard key={reply.txid} reply={reply} />
          ))}
        </div>
      )}
      {/* Reply button (only in threaded context, not preview/feed) */}
      {onReplyClick && !preview && (
        <CardFooter className="justify-end pt-0">
          <Button
            variant={isReplying ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onReplyClick(propdate)}
          >
            {isReplying ? "Cancel Reply" : "Reply"}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
