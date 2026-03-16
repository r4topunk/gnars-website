"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Loader2, Wallet } from "lucide-react";
import Link from "next/link";
import { FormProvider, useForm } from "react-hook-form";
import { useAccount, useReadContract } from "wagmi";
import { TransactionBuilder } from "@/components/proposals/builder/TransactionBuilder";
import { ProposalDetailsForm } from "@/components/proposals/ProposalDetailsForm";
import { ProposalPreview } from "@/components/proposals/ProposalPreview";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConnectButton } from "@/components/ui/ConnectButton";
import { ProposalEligibilityProvider } from "@/components/proposals/ProposalEligibilityContext";
import { useProposalEligibility } from "@/hooks/useProposalEligibility";
import { CHAIN, GNARS_ADDRESSES } from "@/lib/config";
import { proposalSchema, type ProposalFormValues } from "./schema";

const balanceOfAbi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export function ProposalWizard() {
  const [currentTab, setCurrentTab] = useState("details");
  const [isEditingTransaction, setIsEditingTransaction] = useState(false);

  const methods = useForm<ProposalFormValues>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      title: "",
      description: "",
      bannerImage: undefined,
      transactions: [],
    },
    mode: "onChange",
  });

  const { address, isConnected } = useAccount();

  const { data: nftBalance, isLoading: isBalanceLoading } = useReadContract({
    address: GNARS_ADDRESSES.token,
    abi: balanceOfAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: CHAIN.id,
    query: { enabled: Boolean(address) },
  });

  const hasGnar = typeof nftBalance === "bigint" && nftBalance > 0n;

  const eligibility = useProposalEligibility({
    chainId: CHAIN.id,
    collectionAddress: GNARS_ADDRESSES.token,
    governorAddress: GNARS_ADDRESSES.governor,
    signerAddress: address,
  });

  const { trigger, watch } = methods;

  const watchedValues = watch();

  const canProceedToTransactions = watchedValues.title?.trim() !== "";
  // Rely on watched transactions to avoid desync with nested field arrays
  const watchedTransactions = watch("transactions");
  const canProceedToPreview = canProceedToTransactions && (watchedTransactions?.length ?? 0) > 0;

  const handleNextToTransactions = async () => {
    const isValid = await trigger(["title", "description"]);
    if (isValid) {
      setCurrentTab("transactions");
    }
  };

  const handleNextToPreview = async () => {
    const isValid = await trigger("transactions");
    if (isValid) {
      setCurrentTab("preview");
    }
  };

  // Child builder handles add/update/remove via useFieldArray

  // Determine warning banner state
  const showDisconnectedBanner = !isConnected;
  const showNoNftBanner = isConnected && !isBalanceLoading && !hasGnar;

  return (
    <ProposalEligibilityProvider value={eligibility}>
      <FormProvider {...methods}>
        <div className="max-w-4xl mx-auto space-y-4">
          {showDisconnectedBanner && (
            <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
              <Wallet className="h-4 w-4 text-amber-500" />
              <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
                <span>
                  Connect your wallet to submit proposals. You can still explore the form below.
                </span>
                <ConnectButton />
              </AlertDescription>
            </Alert>
          )}

          {showNoNftBanner && (
            <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
                <span>
                  You need at least one Gnars NFT to submit proposals.{" "}
                  <Link href="/" className="underline font-medium text-amber-500 hover:text-amber-400">
                    Get a Gnar at the auction
                  </Link>
                </span>
              </AlertDescription>
            </Alert>
          )}

          <Tabs value={currentTab} onValueChange={setCurrentTab} className="gap-6">
            <TabsList className="w-full">
              <TabsTrigger value="details" className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                  1
                </span>
                Details
              </TabsTrigger>
              <TabsTrigger
                value="transactions"
                disabled={!canProceedToTransactions}
                className="flex items-center gap-2"
              >
                <span
                  className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${
                    canProceedToTransactions
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  2
                </span>
                Transactions
              </TabsTrigger>
              <TabsTrigger
                value="preview"
                disabled={!canProceedToPreview}
                className="flex items-center gap-2"
              >
                <span
                  className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${
                    canProceedToPreview
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  3
                </span>
                Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  <ProposalDetailsForm />
                  <div className="flex justify-end mt-6">
                    <Button
                      onClick={handleNextToTransactions}
                      disabled={!canProceedToTransactions}
                      className="w-full sm:w-auto"
                    >
                      Next: Add Transactions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transactions" className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  <TransactionBuilder onFormsVisibilityChange={setIsEditingTransaction} />
                  {!isEditingTransaction && (
                    <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentTab("details")}
                        className="w-full sm:w-auto"
                      >
                        Back: Edit Details
                      </Button>
                      <Button
                        onClick={handleNextToPreview}
                        disabled={!canProceedToPreview}
                        className="w-full sm:w-auto"
                      >
                        Next: Preview & Submit
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  <ProposalPreview />
                  <div className="flex justify-between mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentTab("transactions")}
                      className="w-full sm:w-auto"
                    >
                      Back: Edit Transactions
                    </Button>
                    {/* Submit button will be in ProposalPreview component */}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </FormProvider>
    </ProposalEligibilityProvider>
  );
}
