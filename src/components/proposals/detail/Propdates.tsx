"use client";

import { useCallback, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { zeroHash } from "viem";
import { useAccount } from "wagmi";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PropdateCardSkeleton } from "@/components/propdates/PropdatesFeedSkeleton";
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
      <Card aria-busy="true" aria-label="Loading propdates">
        <CardHeader>
          <CardTitle>Propdates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="animate-in fade-in-0"
              style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
            >
              <PropdateCardSkeleton />
            </div>
          ))}
        </CardContent>
      </Card>
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Propdates</CardTitle>
        {canCreatePropdate && (
          <Button
            onClick={handleNewPropdate}
            variant={showForm && !replyingTo ? "destructive" : "outline"}
            size="sm"
          >
            {showForm && !replyingTo ? (
              "Cancel"
            ) : (
              <>
                <Plus className="mr-1 h-4 w-4" />
                Create Propdate
              </>
            )}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
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
            {topLevel.map((propdate, i) => (
              <div
                key={propdate.txid}
                className="animate-in fade-in-0"
                style={{ animationDelay: `${i * 40}ms`, animationFillMode: "both" }}
              >
                <PropdateCard
                  propdate={propdate}
                  replies={getReplies(propdate.txid)}
                  isReplying={replyingTo?.txid === propdate.txid}
                  onReplyClick={canReply ? handleReplyClick : undefined}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">No updates on this proposal yet!</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              The proposer can post progress updates here
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
