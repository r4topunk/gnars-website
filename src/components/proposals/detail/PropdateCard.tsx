"use client";

import { useTranslations } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { Markdown } from "@/components/common/Markdown";
import { AddressDisplay } from "@/components/ui/address-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
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
  const t = useTranslations("propdates");
  const timeCreated = formatDistanceToNow(new Date(propdate.timeCreated * 1000), {
    addSuffix: true,
  });

  return (
    <Card className="overflow-hidden transition-transform transition-shadow hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-3">
        {/* Header row: avatar + address + milestone + timestamp */}
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <AddressDisplay
            address={propdate.attester}
            variant="compact"
            showAvatar
            avatarSize="md"
            showCopy={false}
            showExplorer={false}
          />
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {propdate.milestoneId != null && propdate.milestoneId >= 0 && (
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-xs">
                {t("card.milestone", { number: propdate.milestoneId + 1 })}
              </Badge>
            )}
            <span>· {timeCreated}</span>
          </div>
        </div>

        {/* Content */}
        {showContent && (
          <div className="mt-3 rounded-md border bg-muted/40 p-3">
            {preview ? (
              <div className="relative overflow-hidden" style={{ maxHeight: previewMaxHeightPx }}>
                <Markdown className="prose-sm">{propdate.message}</Markdown>
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent" />
              </div>
            ) : (
              <Markdown className="prose-sm">{propdate.message}</Markdown>
            )}
          </div>
        )}
      </CardContent>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="mx-3 mb-3 border-l-2 border-dashed border-muted pl-3 space-y-2">
          {replies.map((reply) => (
            <PropdateReplyCard key={reply.txid} reply={reply} />
          ))}
        </div>
      )}

      {/* Reply button (only in threaded context, not preview/feed) */}
      {onReplyClick && !preview && (
        <CardFooter className="justify-end pt-0 px-3 pb-3">
          <Button
            variant={isReplying ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onReplyClick(propdate)}
          >
            {isReplying ? t("card.cancelReply") : t("card.reply")}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
