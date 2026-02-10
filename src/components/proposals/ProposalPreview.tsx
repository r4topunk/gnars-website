"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle, ExternalLink, Info, Loader2 } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import { base } from "wagmi/chains";
import { useAccount, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { toast } from "sonner";
import Image from "next/image";
import { TransactionsSummaryList } from "@/components/proposals/preview/TransactionsSummaryList";
import { ProposalDebugPanel } from "@/components/proposals/ProposalDebugPanel";
import { useProposalEligibilityContext } from "@/components/proposals/ProposalEligibilityContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createProposalAction } from "@/app/propose/actions";
import { GNARS_ADDRESSES } from "@/lib/config";
import { ipfsToGatewayUrl } from "@/lib/pinata";
import { encodeTransactions } from "@/lib/proposal-utils";
import { type ProposalFormValues } from "./schema";

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
  const eligibility = useProposalEligibilityContext();
  const { getValues, handleSubmit, formState: { errors } } = useFormContext<ProposalFormValues>();
  const [isActionPending, startTransition] = useTransition();
  const [preparedDescription, setPreparedDescription] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [encodedTxData, setEncodedTxData] = useState<{
    targets: `0x${string}`[];
    values: bigint[];
    calldatas: `0x${string}`[];
  } | undefined>();
  const { chain, isConnected, address } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  // Watch form values for reactive preview
  const watchedData = useWatch<ProposalFormValues>();

  const { writeContract, data: hash, isPending: isWalletPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    chainId: base.id,
  });

  // Get current form data
  const data = (watchedData as ProposalFormValues) || getValues();

  // Generate the prepared description and encoded transactions for debugging
  useEffect(() => {
    const generateDescription = async () => {
      try {
        const result = await createProposalAction(data);
        setPreparedDescription(result.description);
        
        // Also encode the transactions for preview
        if (data.transactions && data.transactions.length > 0) {
          const encoded = encodeTransactions(data.transactions);
          setEncodedTxData(encoded);
        }
      } catch (error) {
        console.error("Error generating description:", error);
      }
    };

    if (data.title && data.description) {
      generateDescription();
    }
  }, [data]);

  const handleFormSubmit = async (formData: ProposalFormValues) => {
    console.log("handleFormSubmit called with data:", formData);
    setValidationError(null);
    startTransition(async () => {
      console.log("Inside startTransition");
      try {
        // Check if on correct network, switch if needed
        if (chain?.id !== base.id) {
          console.log("Switching to Base network...");
          toast.info("Switching to Base network...");
          await switchChainAsync({ chainId: base.id });
        }

        console.log("Calling createProposalAction...");
        const preparedTx = await createProposalAction(formData);
        console.log("Prepared transaction:", preparedTx);

        console.log("Calling writeContract...");
        await writeContract({
          address: GNARS_ADDRESSES.governor as `0x${string}`,
          abi: governorAbi,
          functionName: "propose",
          args: [
            preparedTx.targets,
            preparedTx.values,
            preparedTx.calldatas,
            preparedTx.description,
          ],
          chainId: base.id,
        });
      } catch (error) {
        console.error("Error submitting proposal:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        setValidationError(errorMessage);
        toast.error("Failed to submit proposal", {
          description: errorMessage,
        });
      }
    });
  };

  const onValidationError = (errors: Record<string, unknown>) => {
    console.error("Form validation errors:", errors);
    console.log("Full errors object:", JSON.stringify(errors, null, 2));
    
    // Collect all error messages
    const errorMessages: string[] = [];
    
    if (errors.title && typeof errors.title === 'object' && errors.title !== null && 'message' in errors.title) {
      errorMessages.push(`Title: ${(errors.title as { message: string }).message}`);
    }
    if (errors.description && typeof errors.description === 'object' && errors.description !== null && 'message' in errors.description) {
      errorMessages.push(`Description: ${(errors.description as { message: string }).message}`);
    }
    if (errors.transactions && Array.isArray(errors.transactions)) {
      errors.transactions.forEach((txError: unknown, index: number) => {
        if (txError && typeof txError === 'object' && txError !== null) {
          Object.entries(txError).forEach(([field, error]: [string, unknown]) => {
            if (error && typeof error === 'object' && error !== null && 'message' in error) {
              errorMessages.push(`Transaction ${index + 1} - ${field}: ${(error as { message: string }).message}`);
            }
          });
        }
      });
    }
    
    const errorMessage = errorMessages.length > 0 
      ? errorMessages.join("; ") 
      : "Please fix validation errors before submitting";
    
    console.log("Validation error message:", errorMessage);
    setValidationError(errorMessage);
    toast.error("Validation Failed", {
      description: errorMessage,
    });
  };

  const canSubmit =
    isConnected &&
    eligibility.hasThreshold === true &&
    Boolean(data.title) &&
    (data.transactions?.length ?? 0) > 0 &&
    !isActionPending &&
    !isWalletPending &&
    !isConfirming &&
    !eligibility.isLoading;

  // Debug logging
  useEffect(() => {
    console.log("ProposalPreview - canSubmit:", canSubmit);
    console.log("ProposalPreview - title:", data.title);
    console.log("ProposalPreview - transactions:", data.transactions?.length);
    console.log("ProposalPreview - isActionPending:", isActionPending);
    console.log("ProposalPreview - isWalletPending:", isWalletPending);
    console.log("ProposalPreview - isConfirming:", isConfirming);
  }, [canSubmit, data.title, data.transactions, isActionPending, isWalletPending, isConfirming]);

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
            <div className="w-full h-48 bg-muted rounded-lg mb-4 overflow-hidden relative">
              <Image
                src={ipfsToGatewayUrl(data.bannerImage)}
                alt="Proposal banner"
                fill
                className="object-cover"
              />
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

      {/* Debug Panel */}
      <ProposalDebugPanel 
        formData={data} 
        preparedDescription={preparedDescription}
        encodedTransactions={encodedTxData}
      />

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

          {eligibility.proposalVotesRequired !== undefined && (
            <Alert className="mb-4 border-blue-200/60 bg-blue-50/60 dark:border-blue-800/40 dark:bg-blue-950/20">
              <Info className="h-4 w-4 text-blue-700 dark:text-blue-300" />
              <AlertDescription className="text-blue-900/90 dark:text-blue-100/90">
                Minimum to create a proposal:{" "}
                <span className="font-semibold">
                  {eligibility.proposalVotesRequired.toString()} votes
                </span>
                . This comes from the Governor contract proposal threshold.
              </AlertDescription>
            </Alert>
          )}

          {!isConnected && (
            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertDescription>Connect your wallet to check eligibility and submit.</AlertDescription>
            </Alert>
          )}

          {isConnected && eligibility.isLoading && (
            <Alert className="mb-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>Checking voting power...</AlertDescription>
            </Alert>
          )}

          {isConnected && eligibility.hasThreshold === false && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You need at least{" "}
                <span className="font-semibold">
                  {eligibility.proposalVotesRequired?.toString() ?? "N/A"}
                </span>{" "}
                votes to create a proposal.
                {typeof eligibility.votes === "bigint" && (
                  <>
                    {" "}
                    You currently have <span className="font-semibold">{eligibility.votes.toString()}</span>{" "}
                    votes.
                  </>
                )}
                {eligibility.isDelegating && eligibility.delegatedTo && address && (
                  <> Your votes are delegated to {eligibility.delegatedTo}.</>
                )}
              </AlertDescription>
            </Alert>
          )}

          {isActionPending && (
            <Alert className="mb-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>Preparing proposal...</AlertDescription>
            </Alert>
          )}

          {validationError && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{validationError}</AlertDescription>
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

          {isConnected && eligibility.hasThreshold === true && (
            <Button
              onClick={(e) => {
                console.log("Submit button clicked!");
                console.log("canSubmit:", canSubmit);
                console.log("Form errors:", errors);
                handleSubmit(handleFormSubmit, onValidationError)(e);
              }}
              disabled={!canSubmit}
              size="lg"
              className="w-full"
            >
              {isActionPending || isWalletPending || isConfirming ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {isActionPending
                    ? "Preparing..."
                    : isWalletPending
                      ? "Confirming..."
                      : "Submitting..."}
                </>
              ) : (
                "Submit Proposal"
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
