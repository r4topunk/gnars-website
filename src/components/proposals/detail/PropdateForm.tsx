"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Markdown } from "@/components/common/Markdown";
import { AddressDisplay } from "@/components/ui/address-display";
import { usePropdates } from "@/hooks/use-propdates";
import { type Propdate } from "@/services/propdates";

interface PropdateFormProps {
  proposalId: string;
  replyTo?: Propdate | null;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function PropdateForm({ proposalId, replyTo, onSuccess, onCancel }: PropdateFormProps) {
  const [messageText, setMessageText] = useState("");
  const { createPropdate, isCreating, createError, submissionPhase } = usePropdates(proposalId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPropdate(
        { proposalId, messageText, originalMessageId: replyTo?.txid },
        {
          onSuccess: () => {
            setMessageText("");
            onSuccess();
          },
        },
      );
    } catch {
      // error message controlled by hook
    }
  };

  const buttonLabel =
    submissionPhase === "confirming-wallet"
      ? "Confirm in wallet..."
      : submissionPhase === "pending-tx"
        ? "Waiting for confirmation..."
        : replyTo
          ? "Submit Reply"
          : "Submit";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{replyTo ? "Reply to Propdate" : "Create a Propdate"}</CardTitle>
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {replyTo && (
          <div className="mb-4 rounded-lg border-l-4 border-muted-foreground/30 bg-muted/50 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <span>Replying to</span>
              <AddressDisplay address={replyTo.attester} showCopy={false} showExplorer={false} />
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{replyTo.message}</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs defaultValue="write" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="write">Write</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="write">
              <Textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={replyTo ? "Write your reply..." : "Share an update on this proposal..."}
                required
                rows={6}
              />
            </TabsContent>
            <TabsContent value="preview">
              <div className="min-h-[150px] rounded-md border p-3">
                {messageText.trim() ? (
                  <Markdown>{messageText}</Markdown>
                ) : (
                  <p className="text-sm text-muted-foreground">Nothing to preview</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
          <Button type="submit" disabled={isCreating || !messageText.trim()}>
            {buttonLabel}
          </Button>
        </form>
        {createError && (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {createError}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
