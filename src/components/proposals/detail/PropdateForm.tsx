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
  const { createPropdate, isCreating } = usePropdates(proposalId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    createPropdate(
      { proposalId, messageText },
      {
        onSuccess: () => {
          setMessageText("");
          onSuccess();
        },
      },
    );
  };

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
            {isCreating ? "Submitting..." : "Submit"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
