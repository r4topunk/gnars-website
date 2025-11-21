"use client";

import { useState } from "react";
import { Address, parseEther } from "viem";
import { createTradeCall, setApiKey, type TradeParameters } from "@zoralabs/coins-sdk";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Info, Loader2 } from "lucide-react";
import { GNARS_ADDRESSES } from "@/lib/config";
import { TransactionDisplay } from "./TransactionDisplay";

interface TradeCall {
  target: Address;
  data: string;
  value: bigint;
}

export function CoinProposalGenerator() {
  const [coinAddress, setCoinAddress] = useState<string>("");
  const [ethAmount, setEthAmount] = useState<string>("0.1");
  const [slippage, setSlippage] = useState<string>("5");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tradeCall, setTradeCall] = useState<TradeCall | null>(null);

  const generateProposalTx = async () => {
    setError(null);
    setTradeCall(null);
    setIsGenerating(true);

    try {
      // Validate inputs
      if (!coinAddress || !coinAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        throw new Error("Please enter a valid coin address (0x...)");
      }

      const amountInEth = parseFloat(ethAmount);
      if (isNaN(amountInEth) || amountInEth <= 0) {
        throw new Error("Please enter a valid ETH amount greater than 0");
      }

      const slippagePercent = parseFloat(slippage);
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
        sell: { type: "eth" }, // DAO treasury selling ETH
        buy: { type: "erc20", address: coinAddress as Address }, // Buying the content/creator coin
        amountIn: parseEther(ethAmount), // ETH amount to spend
        slippage: slippagePercent / 100, // Convert percentage to decimal (5% -> 0.05)
        sender: GNARS_ADDRESSES.treasury, // DAO treasury as sender
        recipient: GNARS_ADDRESSES.treasury, // Coin goes back to treasury
      };

      console.log("Generating trade call with parameters:", tradeParameters);

      // Use Coins SDK to generate the trade call
      const quote = await createTradeCall(tradeParameters);

      if (!quote?.call) {
        throw new Error("Failed to generate trade call from Zora Coins SDK");
      }

      // Extract transaction data
      const { target, data, value } = quote.call;

      setTradeCall({
        target: target as Address,
        data: data as string,
        value: BigInt(value),
      });

      console.log("Trade call generated successfully:", {
        target,
        value: value.toString(),
        dataLength: data.length,
      });
    } catch (err) {
      console.error("Error generating proposal transaction:", err);
      setError(err instanceof Error ? err.message : "Failed to generate transaction");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setTradeCall(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">Option A: Raw Router Calldata (Recommended)</p>
                <p>
                  This tool uses Zora Coins SDK to generate raw transaction data for the Uniswap v4
                  router. You are <strong>NOT</strong> calling a function on the coin contract
                  itself—coins are just ERC-20s. The swap happens through the router + Zora hooks.
                </p>
                <p className="text-xs">
                  The SDK&apos;s <code>createTradeCall</code> returns the router address, calldata, and
                  ETH value needed for a Builder DAO custom transaction.
                </p>
              </div>
            </AlertDescription>
          </Alert>

          <div className="grid w-full max-w-sm items-center gap-2">
            <Label htmlFor="coinAddress">Coin Address</Label>
            <Input
              id="coinAddress"
              placeholder="0x..."
              value={coinAddress}
              onChange={(e) => setCoinAddress(e.target.value)}
              disabled={isGenerating}
            />
            <p className="text-xs text-muted-foreground">
              The ERC-20 address of the content or creator coin to purchase
            </p>
          </div>

          <div className="grid w-full max-w-sm items-center gap-2">
            <Label htmlFor="ethAmount">ETH Amount</Label>
            <Input
              id="ethAmount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.1"
              value={ethAmount}
              onChange={(e) => setEthAmount(e.target.value)}
              disabled={isGenerating}
            />
            <p className="text-xs text-muted-foreground">
              Amount of ETH the DAO treasury will spend
            </p>
          </div>

          <div className="grid w-full max-w-sm items-center gap-2">
            <Label htmlFor="slippage">Slippage Tolerance (%)</Label>
            <Input
              id="slippage"
              type="number"
              step="0.1"
              min="0"
              max="100"
              placeholder="5"
              value={slippage}
              onChange={(e) => setSlippage(e.target.value)}
              disabled={isGenerating}
            />
            <p className="text-xs text-muted-foreground">
              Maximum acceptable slippage (recommended: 5%)
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={generateProposalTx}
            disabled={isGenerating}
            className="w-full max-w-sm"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Transaction...
              </>
            ) : (
              "Generate Proposal Transaction"
            )}
          </Button>
        </div>
      </Card>

      {tradeCall && (
        <TransactionDisplay
          target={tradeCall.target}
          value={tradeCall.value}
          calldata={tradeCall.data}
          coinAddress={coinAddress as Address}
          ethAmount={ethAmount}
          slippage={slippage}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
