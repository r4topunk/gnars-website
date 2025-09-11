"use client";

import { useTransition } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { AlertTriangle, CheckCircle, ExternalLink, Loader2 } from "lucide-react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GNARS_ADDRESSES } from "@/lib/config";
import { type ProposalFormValues } from "./schema";
import { TransactionsSummaryList } from "@/components/proposals/preview/TransactionsSummaryList";
import { createProposalAction } from "@/app/propose/actions";

const governorAbi = [
  {
    name: "propose",
    type: "function",
    inputs: [
      { name: "targets", type: "address[]" },
      { name: "values", type: "uint256[]" },
      { name: "calldatas", type: "bytes[]" },
      { name: "description", type: "string" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export function ProposalPreview() {
  const { getValues, handleSubmit } = useFormContext<ProposalFormValues>();
  const [isActionPending, startTransition] = useTransition();

  // Watch form values for reactive preview
  const watchedData = useWatch<ProposalFormValues>();

  const { writeContract, data: hash, isPending: isWalletPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Get current form data
  const data = (watchedData as ProposalFormValues) || getValues();

  const handleFormSubmit = async (formData: ProposalFormValues) => {
    startTransition(async () => {
      try {
        const preparedTx = await createProposalAction(formData);

        await writeContract({
          address: GNARS_ADDRESSES.governor as `0x${string}`,
          abi: governorAbi,
          functionName: "propose",
          args: [preparedTx.targets, preparedTx.values, preparedTx.calldatas, preparedTx.description],
        });
      } catch (error) {
        console.error("Error submitting proposal:", error);
        // TODO: Show an error to the user
      }
    });
  };

  const canSubmit =
    Boolean(data.title) &&
    (data.transactions?.length ?? 0) > 0 &&
    !isActionPending &&
    !isWalletPending &&
    !isConfirming;

  if (isSuccess) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-2">Proposal Submitted!</h3>
          <p className="text-muted-foreground mb-4">
            Your proposal has been successfully submitted to the Gnars DAO.
          </p>
          {hash && (
            <Button variant="outline" asChild>
              <a
                href={`https://basescan.org/tx/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center"
              >
                View Transaction <ExternalLink className="h-4 w-4 ml-1" />
              </a>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Proposal Preview</h2>
        <p className="text-muted-foreground">Review your proposal before submitting to the DAO</p>
      </div>

      {/* Proposal Header */}
      <Card>
        <CardContent className="p-6">
          {data.bannerImage && (
            <div className="w-full h-48 bg-muted rounded-lg mb-4 flex items-center justify-center">
              <p className="text-muted-foreground">Banner Image: {data.bannerImage}</p>
            </div>
          )}
          <h1 className="text-3xl font-bold mb-4">{data.title}</h1>
          <div className="prose prose-gray max-w-none">
            {(data.description ?? "").split("\n\n").map((paragraph, i) => (
              <p key={i} className="mb-4 last:mb-0">
                {paragraph}
              </p>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transactions Summary */}
      <TransactionsSummaryList transactions={data.transactions ?? []} />

      {/* Submit Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start space-x-3 mb-4">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div>
              <h3 className="font-semibold mb-2">Before You Submit</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Ensure all transaction details are correct</li>
                <li>• Your proposal metadata will be uploaded to IPFS</li>
                <li>• The proposal will be submitted to the Governor contract</li>
                <li>• Once submitted, the proposal cannot be modified</li>
                <li>• Voting will begin after a short delay period</li>
              </ul>
            </div>
          </div>

          {isActionPending && (
            <Alert className="mb-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Preparing proposal...
              </AlertDescription>
            </Alert>
          )}

          {isWalletPending && (
            <Alert className="mb-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Transaction pending... Please confirm in your wallet.
              </AlertDescription>
            </Alert>
          )}

          {isConfirming && (
            <Alert className="mb-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>Waiting for transaction confirmation...</AlertDescription>
            </Alert>
          )}

          <Button onClick={handleSubmit(handleFormSubmit)} disabled={!canSubmit} size="lg" className="w-full">
            {isActionPending || isWalletPending || isConfirming ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {isActionPending ? "Preparing..." : isWalletPending ? "Confirming..." : "Submitting..."}
              </>
            ) : (
              "Submit Proposal"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
