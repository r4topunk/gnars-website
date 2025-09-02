"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useAccount } from "wagmi";
import { ProposalWizard } from "@/components/proposals/ProposalWizard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useVotes } from "@/hooks/use-votes";
import { CHAIN, GNARS_ADDRESSES } from "@/lib/config";

export default function ProposePage() {
  const { address, isConnected } = useAccount();

  const { isLoading, hasThreshold, votes, proposalVotesRequired, isDelegating, delegatedTo } =
    useVotes({
      chainId: CHAIN.id,
      collectionAddress: GNARS_ADDRESSES.token,
      governorAddress: GNARS_ADDRESSES.governor,
      signerAddress: address,
    });

  if (!isConnected) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Create Proposal</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Please connect your wallet to create a proposal.</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Checking proposal eligibility...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasThreshold) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Insufficient Voting Power</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You need at least {proposalVotesRequired?.toString() || "N/A"} votes to create a
                proposal.
                {votes !== undefined && (
                  <>
                    {" "}
                    You currently have {votes.toString()} votes.
                    {isDelegating && delegatedTo && (
                      <> Your votes are delegated to {delegatedTo}.</>
                    )}
                  </>
                )}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Create Proposal</h1>
        <p className="text-muted-foreground mt-2">Create a new proposal for the Gnars DAO</p>
      </div>

      <ProposalWizard />
    </div>
  );
}
