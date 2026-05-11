"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { AlertTriangle, CheckCircle, ExternalLink, Info, Loader2 } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  getContract,
  prepareContractCall,
  readContract,
  sendTransaction,
  waitForReceipt,
} from "thirdweb";
import { base } from "thirdweb/chains";
import { parseEventLogs } from "viem";
import { TransactionsSummaryList } from "@/components/proposals/preview/TransactionsSummaryList";
import { ProposalDebugPanel } from "@/components/proposals/ProposalDebugPanel";
import { useProposalEligibilityContext } from "@/components/proposals/ProposalEligibilityContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createProposalAction } from "@/app/propose/actions";
import { useProposalIndexing } from "@/hooks/use-proposal-indexing";
import { useUserAddress } from "@/hooks/use-user-address";
import { useWriteAccount } from "@/hooks/use-write-account";
import { DAO_ADDRESSES } from "@/lib/config";
import { ipfsToGatewayUrl } from "@/lib/pinata";
import { encodeTransactions } from "@/lib/proposal-utils";
import { getThirdwebClient } from "@/lib/thirdweb";
import { ensureOnChain } from "@/lib/thirdweb-tx";
import { type ProposalFormValues } from "./schema";

const governorAbi = [
  {
    name: "propose",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "targets", type: "address[]" },
      { name: "values", type: "uint256[]" },
      { name: "calldatas", type: "bytes[]" },
      { name: "description", type: "string" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "proposalThreshold",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "ProposalCreated",
    type: "event",
    anonymous: false,
    inputs: [
      { name: "proposalId", type: "bytes32", indexed: false },
      { name: "targets", type: "address[]", indexed: false },
      { name: "values", type: "uint256[]", indexed: false },
      { name: "calldatas", type: "bytes[]", indexed: false },
      { name: "description", type: "string", indexed: false },
      { name: "descriptionHash", type: "bytes32", indexed: false },
      {
        name: "proposal",
        type: "tuple",
        indexed: false,
        components: [
          { name: "proposer", type: "address" },
          { name: "timeCreated", type: "uint32" },
          { name: "againstVotes", type: "uint32" },
          { name: "forVotes", type: "uint32" },
          { name: "abstainVotes", type: "uint32" },
          { name: "voteStart", type: "uint32" },
          { name: "voteEnd", type: "uint32" },
          { name: "proposalThreshold", type: "uint32" },
          { name: "quorumVotes", type: "uint32" },
          { name: "executed", type: "bool" },
          { name: "canceled", type: "bool" },
          { name: "vetoed", type: "bool" },
        ],
      },
    ],
  },
] as const;

// Minimal token ABI used only for the send-time voting-power pre-check.
// Keeps the propose path self-contained without reaching into the shared
// token ABI module.
const tokenGetVotesAbi = [
  {
    name: "getVotes",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export function ProposalPreview() {
  const t = useTranslations("propose");
  const eligibility = useProposalEligibilityContext();
  const {
    getValues,
    handleSubmit,
    formState: { errors },
  } = useFormContext<ProposalFormValues>();
  const [isActionPending, startTransition] = useTransition();
  const [preparedDescription, setPreparedDescription] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [encodedTxData, setEncodedTxData] = useState<
    | {
        targets: `0x${string}`[];
        values: bigint[];
        calldatas: `0x${string}`[];
      }
    | undefined
  >();
  const { address, isConnected } = useUserAddress();
  const writer = useWriteAccount();
  const [hash, setHash] = useState<`0x${string}` | undefined>(undefined);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isWalletPending, setIsWalletPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [onchainProposalId, setOnchainProposalId] = useState<`0x${string}` | undefined>(undefined);
  const indexing = useProposalIndexing(onchainProposalId);

  // Watch form values for reactive preview
  const watchedData = useWatch<ProposalFormValues>();

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
    setHash(undefined);
    setIsConfirming(false);
    setIsSuccess(false);
    setOnchainProposalId(undefined);

    startTransition(async () => {
      console.log("Inside startTransition");
      try {
        const client = getThirdwebClient();
        if (!client) {
          throw new Error(t("preview.thirdwebNotConfigured"));
        }

        if (!writer) {
          throw new Error(t("preview.connectWalletToSubmit"));
        }

        console.log("Ensuring Base network...");
        await ensureOnChain(writer.wallet, base);

        // Pre-check: confirm the actual signer has enough voting power to
        // clear the proposal threshold. The eligibility context gates the
        // submit button on this too, but we re-check at send time because
        // view-mode toggles and delegation changes can happen between
        // render and click — and a revert costs gas.
        const governorReadContract = getContract({
          client,
          chain: base,
          address: DAO_ADDRESSES.governor as `0x${string}`,
          abi: governorAbi,
        });
        const tokenReadContract = getContract({
          client,
          chain: base,
          address: DAO_ADDRESSES.token as `0x${string}`,
          abi: tokenGetVotesAbi,
        });

        const [threshold, signerVotes] = await Promise.all([
          readContract({
            contract: governorReadContract,
            method: "proposalThreshold",
            params: [],
          }),
          readContract({
            contract: tokenReadContract,
            method: "getVotes",
            params: [writer.account.address as `0x${string}`],
          }),
        ]);

        if (signerVotes <= threshold) {
          setIsWalletPending(false);
          const detail = `You need more than ${threshold.toString()} votes to create a proposal. Your current signer has ${signerVotes.toString()}. Switch view or adjust delegation.`;
          setValidationError(detail);
          toast.error(t("preview.insufficientVotingPower"), { description: detail });
          return;
        }

        console.log("Calling createProposalAction...");
        const preparedTx = await createProposalAction(formData);
        console.log("Prepared transaction:", preparedTx);

        const contract = getContract({
          client,
          chain: base,
          address: DAO_ADDRESSES.governor as `0x${string}`,
          abi: governorAbi,
        });

        const tx = prepareContractCall({
          contract,
          method: "propose",
          params: [
            preparedTx.targets,
            preparedTx.values,
            preparedTx.calldatas,
            preparedTx.description,
          ],
        });

        console.log("Sending proposal tx...");
        setIsWalletPending(true);
        const result = await sendTransaction({
          account: writer.account,
          transaction: tx,
        });
        const txHash = result.transactionHash as `0x${string}`;
        setHash(txHash);
        setIsWalletPending(false);

        setIsConfirming(true);
        const receipt = await waitForReceipt({ client, chain: base, transactionHash: txHash });
        setIsConfirming(false);

        try {
          const events = parseEventLogs({
            abi: governorAbi,
            eventName: "ProposalCreated",
            logs: receipt.logs,
          });
          const created = events[0];
          if (created?.args?.proposalId) {
            setOnchainProposalId(created.args.proposalId as `0x${string}`);
          }
        } catch (parseErr) {
          console.warn("Could not decode ProposalCreated event:", parseErr);
        }

        setIsSuccess(true);
      } catch (error) {
        console.error("Error submitting proposal:", error);
        setIsWalletPending(false);
        setIsConfirming(false);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        setValidationError(errorMessage);
        toast.error(t("preview.failedToSubmit"), {
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

    if (
      errors.title &&
      typeof errors.title === "object" &&
      errors.title !== null &&
      "message" in errors.title
    ) {
      errorMessages.push(`Title: ${(errors.title as { message: string }).message}`);
    }
    if (
      errors.description &&
      typeof errors.description === "object" &&
      errors.description !== null &&
      "message" in errors.description
    ) {
      errorMessages.push(`Description: ${(errors.description as { message: string }).message}`);
    }
    if (errors.transactions && Array.isArray(errors.transactions)) {
      errors.transactions.forEach((txError: unknown, index: number) => {
        if (txError && typeof txError === "object" && txError !== null) {
          Object.entries(txError).forEach(([field, error]: [string, unknown]) => {
            if (error && typeof error === "object" && error !== null && "message" in error) {
              errorMessages.push(
                `Transaction ${index + 1} - ${field}: ${(error as { message: string }).message}`,
              );
            }
          });
        }
      });
    }

    const errorMessage =
      errorMessages.length > 0 ? errorMessages.join("; ") : t("preview.pleaseFixErrors");

    console.log("Validation error message:", errorMessage);
    setValidationError(errorMessage);
    toast.error(t("preview.validationFailed"), {
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
    const isIndexed = indexing.status === "ready" && indexing.proposalNumber !== null;
    const isPolling = indexing.status === "pending" && !!onchainProposalId;
    const timedOut = indexing.status === "timeout" || indexing.status === "error";

    return (
      <Card>
        <CardContent className="p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-2">{t("preview.submitted")}</h3>

          {isIndexed ? (
            <p className="text-muted-foreground mb-4">
              {t("preview.proposalLive", { number: indexing.proposalNumber })}
            </p>
          ) : isPolling ? (
            <p className="text-muted-foreground mb-4 inline-flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("preview.waitingIndex")}
            </p>
          ) : timedOut ? (
            <p className="text-muted-foreground mb-4">{t("preview.indexingTimeout")}</p>
          ) : (
            <p className="text-muted-foreground mb-4">{t("preview.proposalSubmitted")}</p>
          )}

          <div className="flex flex-wrap gap-2 justify-center">
            {isIndexed && indexing.proposalNumber !== null && (
              <Button asChild>
                <a
                  href={`/proposals/base/${indexing.proposalNumber}`}
                  className="inline-flex items-center"
                >
                  {t("preview.viewProposal")} <ExternalLink className="h-4 w-4 ml-1" />
                </a>
              </Button>
            )}
            {hash && (
              <Button variant="outline" asChild>
                <a
                  href={`https://basescan.org/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center"
                >
                  {t("preview.viewTransaction")} <ExternalLink className="h-4 w-4 ml-1" />
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{t("preview.title")}</h2>
        <p className="text-muted-foreground">{t("preview.description")}</p>
      </div>

      {/* Proposal Header */}
      <Card>
        <CardContent className="p-6">
          {data.bannerImage && (
            <div className="w-full h-48 bg-muted rounded-lg mb-4 overflow-hidden relative">
              <Image
                src={ipfsToGatewayUrl(data.bannerImage)}
                alt={t("preview.bannerAlt")}
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
              <h3 className="font-semibold mb-2">{t("preview.beforeSubmitTitle")}</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• {t("preview.checklist.transactionDetails")}</li>
                <li>• {t("preview.checklist.ipfsUpload")}</li>
                <li>• {t("preview.checklist.governorSubmit")}</li>
                <li>• {t("preview.checklist.cannotModify")}</li>
                <li>• {t("preview.checklist.votingDelay")}</li>
              </ul>
            </div>
          </div>

          {eligibility.proposalVotesRequired !== undefined && (
            <Alert className="mb-4 border-blue-200/60 bg-blue-50/60 dark:border-blue-800/40 dark:bg-blue-950/20">
              <Info className="h-4 w-4 text-blue-700 dark:text-blue-300" />
              <AlertDescription className="text-blue-900/90 dark:text-blue-100/90">
                {t("preview.minimumVotes", {
                  count: eligibility.proposalVotesRequired.toString(),
                })}
              </AlertDescription>
            </Alert>
          )}

          {!isConnected && (
            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertDescription>{t("preview.connectToCheck")}</AlertDescription>
            </Alert>
          )}

          {isConnected && eligibility.isLoading && (
            <Alert className="mb-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>{t("preview.checkingVotingPower")}</AlertDescription>
            </Alert>
          )}

          {isConnected && eligibility.hasThreshold === false && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t("preview.insufficientVotes", {
                  required: eligibility.proposalVotesRequired?.toString() ?? "N/A",
                })}
                {typeof eligibility.votes === "bigint" && (
                  <> {t("preview.yourCurrentVotes", { votes: eligibility.votes.toString() })}</>
                )}
                {eligibility.isDelegating && eligibility.delegatedTo && address && (
                  <> {t("preview.votesAreDelegated", { address: eligibility.delegatedTo })}</>
                )}
              </AlertDescription>
            </Alert>
          )}

          {isActionPending && (
            <Alert className="mb-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>{t("preview.preparingProposal")}</AlertDescription>
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
              <AlertDescription>{t("preview.walletPending")}</AlertDescription>
            </Alert>
          )}

          {isConfirming && (
            <Alert className="mb-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>{t("preview.waitingConfirmation")}</AlertDescription>
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
                    ? t("preview.preparing")
                    : isWalletPending
                      ? t("preview.confirming")
                      : t("preview.submitting")}
                </>
              ) : (
                t("preview.submitProposal")
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
