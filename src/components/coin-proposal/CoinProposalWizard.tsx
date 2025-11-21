"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { Address, formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { AlertTriangle, Loader2 } from "lucide-react";
import { createTradeCall, setApiKey, type TradeParameters } from "@zoralabs/coins-sdk";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVotes } from "@/hooks/useVotes";
import { CHAIN, GNARS_ADDRESSES } from "@/lib/config";
import { proposalSchema, type ProposalFormValues } from "@/components/proposals/schema";
import { ProposalPreview } from "@/components/proposals/ProposalPreview";
import { CoinPurchaseForm } from "./CoinPurchaseForm";
import { CoinPurchasePreview } from "./CoinPurchasePreview";

interface CoinPurchaseData {
  coinAddress: string;
  coinName: string;
  ethAmount: string;
  slippage: string;
}

export function CoinProposalWizard() {
  const [currentTab, setCurrentTab] = useState<"purchase" | "preview">("purchase");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [purchaseData, setPurchaseData] = useState<CoinPurchaseData | null>(null);

  const methods = useForm<ProposalFormValues>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      title: "",
      description: "",
      transactions: [],
    },
    mode: "onChange",
  });

  const { address, isConnected } = useAccount();
  const { isLoading, hasThreshold, votes, proposalVotesRequired, isDelegating, delegatedTo } =
    useVotes({
      chainId: CHAIN.id,
      collectionAddress: GNARS_ADDRESSES.token,
      governorAddress: GNARS_ADDRESSES.governor,
      signerAddress: address,
    });

  const handleGenerateProposal = async (data: CoinPurchaseData) => {
    setGenerationError(null);
    setIsGenerating(true);

    try {
      // Validate inputs
      if (!data.coinAddress || !data.coinAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        throw new Error("Please enter a valid coin address (0x...)");
      }

      const amountInEth = parseFloat(data.ethAmount);
      if (isNaN(amountInEth) || amountInEth <= 0) {
        throw new Error("Please enter a valid ETH amount greater than 0");
      }

      const slippagePercent = parseFloat(data.slippage);
      if (isNaN(slippagePercent) || slippagePercent < 0 || slippagePercent > 100) {
        throw new Error("Please enter a valid slippage percentage (0-100)");
      }

      // Set Zora API key if available
      const apiKey = process.env.NEXT_PUBLIC_ZORA_API_KEY;
      if (apiKey) {
        setApiKey(apiKey);
      }

      // Build trade parameters for SDK
      const tradeParameters: TradeParameters = {
        sell: { type: "eth" },
        buy: { type: "erc20", address: data.coinAddress as Address },
        amountIn: parseEther(data.ethAmount),
        slippage: slippagePercent / 100,
        sender: GNARS_ADDRESSES.treasury,
        recipient: GNARS_ADDRESSES.treasury,
      };

      console.log("Generating trade call with parameters:", tradeParameters);

      // Use Coins SDK to generate the trade call
      const quote = await createTradeCall(tradeParameters);

      if (!quote?.call) {
        throw new Error("Failed to generate trade call from Zora Coins SDK");
      }

      // Extract transaction data
      const { target, data: calldata, value } = quote.call;

      // Generate proposal title and description
      const coinName = data.coinName || data.coinAddress;
      const title = `Buy ${coinName} Content Coin`;
      const description = `## Proposal to Purchase ${coinName}

This proposal will execute a trade to purchase the content coin at ${data.coinAddress} using ${data.ethAmount} ETH from the Gnars DAO treasury.

### Trade Details
- **Coin Address**: ${data.coinAddress}
- **ETH Amount**: ${data.ethAmount} ETH
- **Max Slippage**: ${data.slippage}%
- **Recipient**: Gnars DAO Treasury (${GNARS_ADDRESSES.treasury})

### Technical Details
The trade will be executed through the Uniswap v4 / Zora swap router with proper slippage protection and Zora hooks for fee distribution.

**Router Address**: ${target}
**Value**: ${formatEther(BigInt(value))} ETH

---
*Generated via Coin Purchase Proposal Tool*`;

      // Set form values with the custom transaction
      methods.reset({
        title,
        description,
        transactions: [
          {
            type: "custom" as const,
            target: target as Address,
            value: formatEther(BigInt(value)), // Convert wei to ETH string
            calldata: calldata as `0x${string}`,
            description: `Buy ${coinName} with ${data.ethAmount} ETH (max ${data.slippage}% slippage)`,
          },
        ],
      });

      // Store purchase data for display
      setPurchaseData(data);

      // Move to preview
      setCurrentTab("preview");
    } catch (err) {
      console.error("Error generating proposal:", err);
      setGenerationError(err instanceof Error ? err.message : "Failed to generate proposal");
    } finally {
      setIsGenerating(false);
    }
  };

  if (isConnected && isLoading) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Checking proposal eligibility...</span>
        </CardContent>
      </Card>
    );
  }

  if (isConnected && !isLoading && !hasThreshold) {
    return (
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
                  {isDelegating && delegatedTo && <> Your votes are delegated to {delegatedTo}.</>}
                </>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <FormProvider {...methods}>
      <div className="max-w-4xl mx-auto">
        <Tabs value={currentTab} onValueChange={(v) => setCurrentTab(v as "purchase" | "preview")}>
          <TabsList className="w-full">
            <TabsTrigger value="purchase" className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                1
              </span>
              Coin Purchase
            </TabsTrigger>
            <TabsTrigger
              value="preview"
              disabled={!purchaseData}
              className="flex items-center gap-2"
            >
              <span
                className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${
                  purchaseData
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                2
              </span>
              Review & Submit
            </TabsTrigger>
          </TabsList>

          <TabsContent value="purchase" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <CoinPurchaseForm
                  onGenerate={handleGenerateProposal}
                  isGenerating={isGenerating}
                  error={generationError}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                {purchaseData && <CoinPurchasePreview purchaseData={purchaseData} />}
                <div className="mt-6">
                  <ProposalPreview />
                </div>
                <div className="flex justify-between mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentTab("purchase")}
                    className="w-full sm:w-auto"
                  >
                    Back: Edit Purchase
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </FormProvider>
  );
}
