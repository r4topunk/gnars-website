"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { usePropdates } from "@/hooks/use-propdates";

interface PropdateFormProps {
  proposalId: string;
  onSuccess: () => void;
}

export function PropdateForm({ proposalId, onSuccess }: PropdateFormProps) {
  const [messageText, setMessageText] = useState("");
  const { createPropdate, isCreating, createError, submissionPhase } = usePropdates(proposalId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPropdate(
        { proposalId, messageText },
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
        : "Submit";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a Propdate</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Share an update on this proposal..."
            required
          />
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
