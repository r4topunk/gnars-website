"use client";

import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import {
  AlertTriangle,
  CheckCircle,
  Coins,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Send,
  Settings,
  Zap,
} from "lucide-react";
import { parseEther, encodeFunctionData, parseUnits } from "viem";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SimpleAddressDisplay } from "@/components/ui/address-display";
import { GNARS_ADDRESSES, TREASURY_TOKEN_ALLOWLIST } from "@/lib/config";
import { type ProposalFormValues, type TransactionFormValues } from "./schema";

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

  const getTransactionIcon = (type: string | undefined) => {
    switch (type) {
      case "send-eth":
        return Send;
      case "send-usdc":
        return Coins;
      case "send-tokens":
        return Coins;
      case "send-nfts":
        return ImageIcon;
      case "droposal":
        return Zap;
      case "custom":
        return Settings;
      default:
        return Settings;
    }
  };

  const getTransactionLabel = (type: string | undefined) => {
    switch (type) {
      case "send-eth":
        return "Send ETH";
      case "send-usdc":
        return "Send USDC";
      case "send-tokens":
        return "Send Tokens";
      case "send-nfts":
        return "Send NFTs";
      case "droposal":
        return "Create Droposal";
      case "custom":
        return "Custom Transaction";
      default:
        return "Unknown";
    }
  };

  const formatTransactionSummary = (transaction: TransactionFormValues) => {
    switch (transaction.type) {
      case "send-eth":
        return `Send ${transaction.value || "0"} ETH to ${transaction.target}`;
      case "send-usdc":
        return `Send ${transaction.amount || "0"} USDC to ${transaction.recipient}`;
      case "send-tokens":
        return `Send ${transaction.amount || "0"} tokens to ${transaction.recipient}`;
      case "send-nfts":
        return `Transfer NFT #${transaction.tokenId} from ${transaction.from} to ${transaction.to}`;
      case "droposal":
        return `Create Zora drop: "${transaction.name}" (${transaction.editionType === "open" ? "Open" : transaction.editionSize} edition)`;
      case "custom":
        return `Execute custom transaction on ${transaction.target}`;
      default:
        return "Unknown transaction";
    }
  };

  const resolveTargetAddress = (tx: TransactionFormValues): string => {
    switch (tx.type) {
      case "send-usdc":
        return TREASURY_TOKEN_ALLOWLIST.USDC;
      case "send-eth":
      case "custom":
        return tx.target;
      case "send-tokens":
        return tx.tokenAddress;
      case "send-nfts":
        return tx.contractAddress;
      case "droposal":
        return "";
    }
  };

  const resolveValue = (tx: TransactionFormValues): string => {
    switch (tx.type) {
      case "send-eth":
        return tx.value || "0";
      case "send-usdc":
      case "send-tokens":
        return tx.amount || "0";
      case "custom":
        return tx.value || "0";
      case "send-nfts":
      case "droposal":
        return "0";
    }
  };

  const resolveUnit = (tx: TransactionFormValues): string => {
    switch (tx.type) {
      case "send-usdc":
        return "USDC";
      default:
        return "ETH";
    }
  };

  const resolveCalldata = (tx: TransactionFormValues): string => {
    switch (tx.type) {
      case "custom":
        return tx.calldata;
      default:
        return "0x";
    }
  };

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
      <Card>
        <CardHeader>
          <CardTitle>Transactions ({data.transactions?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(data.transactions ?? []).map((transaction, index) => {
            const Icon = getTransactionIcon(transaction.type);
            return (
              <div key={transaction.id || `${transaction.type}-${index}` } className="flex items-start space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium">Transaction {index + 1}</span>
                    <Badge variant="secondary">{getTransactionLabel(transaction.type)}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {formatTransactionSummary(transaction)}
                  </p>
                  {transaction.description && <p className="text-sm">{transaction.description}</p>}
                  <div className="text-xs font-mono bg-muted p-2 rounded mt-2">
                    <div>
                      Target: <SimpleAddressDisplay address={resolveTargetAddress(transaction)} />
                    </div>
                    <div>Value: {resolveValue(transaction)} {resolveUnit(transaction)}</div>
                    <div>Calldata: {(() => { const cd = resolveCalldata(transaction); return cd ? (cd.length > 22 ? cd.slice(0, 20) + "..." : cd) : "0x"; })()}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

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
