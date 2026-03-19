"use client";

import { useCallback, useMemo, useState } from "react";
import { zeroHash } from "viem";
import { useAccount } from "wagmi";
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
  proposer?: string;
  targets?: string[];
}

export function Propdates({ proposalId, proposer, targets }: PropdatesProps) {
  const { propdates, isLoading, isError, refetch } = usePropdates(proposalId);
  const { data: daoMembers } = useDaoMembers();
  const { address } = useAccount();
  const [showForm, setShowForm] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Propdate | null>(null);

  // Allowed to create top-level propdates: proposer + tx target addresses
  const allowedAuthors = useMemo(() => {
    const set = new Set<string>();
    if (proposer) set.add(proposer.toLowerCase());
    if (targets) {
      for (const t of targets) {
        if (t) set.add(t.toLowerCase());
      }
    }
    return set;
  }, [proposer, targets]);

  const canCreatePropdate = address
    ? allowedAuthors.has(address.toLowerCase())
    : false;

  const canReply = address && daoMembers
    ? daoMembers.has(address.toLowerCase())
    : false;

  const topLevel = useMemo(() => {
    if (!propdates) return [];
    return propdates
      .filter((p) => !p.originalMessageId || p.originalMessageId === zeroHash)
      .sort((a, b) => b.timeCreated - a.timeCreated);
  }, [propdates]);

  // Replies: only show those from DAO members
  const getReplies = useCallback((parentTxid: string): Propdate[] => {
    if (!propdates) return [];
    return propdates
      .filter((p) => {
        if (p.originalMessageId !== parentTxid) return false;
        // Only show replies from DAO members
        if (!daoMembers) return true; // show all while loading members
        return daoMembers.has(p.attester.toLowerCase());
      })
      .sort((a, b) => a.timeCreated - b.timeCreated);
  }, [propdates, daoMembers]);

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
        {canCreatePropdate && (
          <Button
            onClick={handleNewPropdate}
            variant={showForm && !replyingTo ? "destructive" : "outline"}
            size="sm"
          >
            {showForm && !replyingTo ? "Cancel" : "Create Propdate"}
          </Button>
        )}
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
              onReplyClick={canReply ? handleReplyClick : undefined}
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
