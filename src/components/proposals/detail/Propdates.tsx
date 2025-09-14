"use client";

import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { usePropdates } from "@/hooks/use-propdates";
import { PropdateCard } from "./PropdateCard";
import { PropdateForm } from "./PropdateForm";

interface PropdatesProps {
  proposalId: string;
}

export function Propdates({ proposalId }: PropdatesProps) {
  const { propdates, isLoading, isError, refetch } = usePropdates(proposalId);
  const [showForm, setShowForm] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading propdates">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load propdates. Please try again later.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Propdates</h3>
        <Button onClick={() => setShowForm(!showForm)} variant="outline" size="sm">
          {showForm ? "Cancel" : "Create Propdate"}
        </Button>
      </div>
      {showForm && (
        <PropdateForm
          proposalId={proposalId}
          onSuccess={() => {
            setShowForm(false);
            refetch();
          }}
        />
      )}
      <Separator />
      {(propdates?.length ?? 0) > 0 ? (
        <div className="space-y-4">
          {propdates!.map((propdate) => (
            <PropdateCard key={propdate.txid} propdate={propdate} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          No updates on this proposal yet!
        </div>
      )}
    </div>
  );
}
