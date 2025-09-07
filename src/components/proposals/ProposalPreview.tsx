"use client";

import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { AlertTriangle, CheckCircle, ExternalLink, Loader2 } from "lucide-react";
import { parseEther, encodeFunctionData, parseUnits } from "viem";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GNARS_ADDRESSES, TREASURY_TOKEN_ALLOWLIST } from "@/lib/config";
import { type ProposalFormValues } from "./schema";
import { TransactionsSummaryList } from "@/components/proposals/preview/TransactionsSummaryList";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ipfsHash, setIpfsHash] = useState<string | null>(null);

  // Watch form values for reactive preview
  const watchedData = useWatch<ProposalFormValues>();

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Get current form data
  const data = (watchedData as ProposalFormValues) || getValues();

  // Summary formatting moved to separate component

  // moved list rendering into TransactionsSummaryList

  const uploadToIPFS = async (): Promise<string> => {
    // Mock IPFS upload - in production, implement actual IPFS upload
    // Simulate upload delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Return mock IPFS hash
    return `QmProposal${Date.now()}`;
  };

  const handleFormSubmit = async (formData: ProposalFormValues) => {
    if (!formData.title || formData.transactions.length === 0) return;

    setIsSubmitting(true);

    try {
      // Upload proposal metadata to IPFS
      const ipfsHash = await uploadToIPFS();
      setIpfsHash(ipfsHash);

      // Prepare transaction data for governor contract
      const targets: `0x${string}`[] = [];
      const values: bigint[] = [];
      const calldatas: `0x${string}`[] = [];

      for (const tx of formData.transactions) {
        try {
          switch (tx.type) {
            case "send-eth":
              targets.push(tx.target as `0x${string}`);
              values.push(parseEther(tx.value || "0"));
              calldatas.push("0x" as `0x${string}`);
              break;

            case "send-usdc":
              targets.push(TREASURY_TOKEN_ALLOWLIST.USDC as `0x${string}`);
              values.push(BigInt(0));
              const usdcCalldata = encodeFunctionData({
                abi: [
                  {
                    name: "transfer",
                    type: "function",
                    inputs: [
                      { name: "to", type: "address" },
                      { name: "amount", type: "uint256" },
                    ],
                  },
                ],
                functionName: "transfer",
                args: [tx.recipient, parseUnits(tx.amount || "0", 6)], // USDC has 6 decimals
              });
              calldatas.push(usdcCalldata);
              break;

            case "send-tokens":
              targets.push(tx.tokenAddress as `0x${string}`);
              values.push(BigInt(0));
              // TODO: Fetch token decimals on-chain or add a field to the form
              const tokenCalldata = encodeFunctionData({
                abi: [
                  {
                    name: "transfer",
                    type: "function",
                    inputs: [
                      { name: "to", type: "address" },
                      { name: "amount", type: "uint256" },
                    ],
                  },
                ],
                functionName: "transfer",
                args: [tx.recipient, parseUnits(tx.amount || "0", 18)], // Assuming 18 decimals for generic ERC-20
              });
              calldatas.push(tokenCalldata);
              break;

            case "send-nfts":
              targets.push(tx.contractAddress as `0x${string}`);
              values.push(BigInt(0));
              const nftCalldata = encodeFunctionData({
                abi: [
                  {
                    name: "transferFrom",
                    type: "function",
                    inputs: [
                      { name: "from", type: "address" },
                      { name: "to", type: "address" },
                      { name: "tokenId", type: "uint256" },
                    ],
                  },
                ],
                functionName: "transferFrom",
                args: [tx.from, tx.to, BigInt(tx.tokenId || "0")],
              });
              calldatas.push(nftCalldata);
              break;

            case "custom":
              targets.push(tx.target as `0x${string}`);
              values.push(tx.value ? parseEther(tx.value) : BigInt(0));
              calldatas.push(tx.calldata as `0x${string}`);
              break;

            case "droposal":
              // TODO: Implement droposal transaction encoding
              console.warn("Droposal transaction encoding not yet implemented");
              targets.push("0x" as `0x${string}`);
              values.push(BigInt(0));
              calldatas.push("0x" as `0x${string}`);
              break;

            default:
              console.error("Unknown transaction type");
              targets.push("0x" as `0x${string}`);
              values.push(BigInt(0));
              calldatas.push("0x" as `0x${string}`);
          }
        } catch (error) {
          console.error(`Error encoding transaction ${tx.type}:`, error);
          // Add empty transaction to maintain array length
          targets.push("0x" as `0x${string}`);
          values.push(BigInt(0));
          calldatas.push("0x" as `0x${string}`);
        }
      }

      const description = `# ${formData.title}\n\n${formData.description}\n\n**IPFS:** ${ipfsHash}`;

      // Submit to governor contract
      await writeContract({
        address: GNARS_ADDRESSES.governor as `0x${string}`,
        abi: governorAbi,
        functionName: "propose",
        args: [targets, values, calldatas, description],
      });
    } catch (error) {
      console.error("Error submitting proposal:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit =
    Boolean(data.title) && (data.transactions?.length ?? 0) > 0 && !isSubmitting && !isPending && !isConfirming;

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

          {isSubmitting && (
            <Alert className="mb-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                {ipfsHash ? "Submitting proposal to Governor..." : "Uploading to IPFS..."}
              </AlertDescription>
            </Alert>
          )}

          {isPending && (
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
            {isSubmitting || isPending || isConfirming ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {isSubmitting ? "Uploading..." : isPending ? "Confirming..." : "Submitting..."}
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
