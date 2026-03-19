"use client";

import { useCallback, useMemo, useState } from "react";
import { zeroHash } from "viem";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useDaoMembers } from "@/hooks/use-dao-members";
import { usePropdates } from "@/hooks/use-propdates";
import { type Propdate } from "@/services/propdates";
import { PropdateCard } from "./PropdateCard";
import { PropdateForm } from "./PropdateForm";

interface PropdatesProps {
  proposalId: string;
}

export function Propdates({ proposalId }: PropdatesProps) {
  const { propdates, isLoading, isError, refetch } = usePropdates(proposalId);
  const { data: daoMembers } = useDaoMembers();
  const [showForm, setShowForm] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Propdate | null>(null);
  const [showOnlyMembers, setShowOnlyMembers] = useState(false);

  const filteredPropdates = useMemo(() => {
    if (!propdates) return [];
    if (showOnlyMembers && daoMembers) {
      return propdates.filter((p) => daoMembers.has(p.attester.toLowerCase()));
    }
    return propdates;
  }, [propdates, showOnlyMembers, daoMembers]);

  const topLevel = useMemo(() => {
    return filteredPropdates
      .filter((p) => !p.originalMessageId || p.originalMessageId === zeroHash)
      .sort((a, b) => b.timeCreated - a.timeCreated);
  }, [filteredPropdates]);

  const getReplies = useCallback((parentTxid: string): Propdate[] => {
    return filteredPropdates
      .filter((p) => p.originalMessageId === parentTxid)
      .sort((a, b) => a.timeCreated - b.timeCreated);
  }, [filteredPropdates]);

  const handleReplyClick = (propdate: Propdate) => {
    if (replyingTo?.txid === propdate.txid) {
      setShowForm(false);
      setReplyingTo(null);
    } else {
      setReplyingTo(propdate);
      setShowForm(true);
    }
  };

  const handleNewPropdate = () => {
    setReplyingTo(null);
    setShowForm(!showForm);
  };

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
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowOnlyMembers(!showOnlyMembers)}
            variant="ghost"
            size="sm"
          >
            {showOnlyMembers ? "Show All" : "DAO Members Only"}
          </Button>
          <Button
            onClick={handleNewPropdate}
            variant={showForm && !replyingTo ? "destructive" : "outline"}
            size="sm"
          >
            {showForm && !replyingTo ? "Cancel" : "Create Propdate"}
          </Button>
        </div>
      </div>
      {showForm && (
        <PropdateForm
          proposalId={proposalId}
          replyTo={replyingTo}
          onSuccess={() => {
            setShowForm(false);
            setReplyingTo(null);
            refetch();
          }}
          onCancel={() => {
            setShowForm(false);
            setReplyingTo(null);
          }}
        />
      )}
      <Separator />
      {topLevel.length > 0 ? (
        <div className="space-y-4">
          {topLevel.map((propdate) => (
            <PropdateCard
              key={propdate.txid}
              propdate={propdate}
              replies={getReplies(propdate.txid)}
              isReplying={replyingTo?.txid === propdate.txid}
              onReplyClick={handleReplyClick}
            />
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
