"use client";

import { useState } from "react";
import { Address, formatEther } from "viem";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, Copy, Info } from "lucide-react";
import { GNARS_ADDRESSES } from "@/lib/config";

interface TransactionDisplayProps {
  target: Address;
  value: bigint;
  calldata: string;
  coinAddress: Address;
  ethAmount: string;
  slippage: string;
  onReset: () => void;
}

export function TransactionDisplay({
  target,
  value,
  calldata,
  coinAddress,
  ethAmount,
  slippage,
  onReset,
}: TransactionDisplayProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <Button
      variant="outline"
      size="sm"
      onClick={() => copyToClipboard(text, field)}
      className="ml-2"
    >
      {copiedField === field ? (
        <>
          <Check className="h-4 w-4 mr-1" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-4 w-4 mr-1" />
          Copy
        </>
      )}
    </Button>
  );

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Proposal Transaction Data</h2>
          <p className="text-muted-foreground">
            Use these values when creating a custom transaction in your Builder DAO proposal
          </p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            This transaction will swap {ethAmount} ETH for the coin at {coinAddress} with{" "}
            {slippage}% max slippage. The purchased coins will be sent to the Gnars DAO treasury.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {/* Target Address */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="target-display">Target (Router Address)</Label>
              <CopyButton text={target} field="target" />
            </div>
            <Textarea
              id="target-display"
              value={target}
              readOnly
              className="font-mono text-sm"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Uniswap v4 / Zora swap router contract (NOT the coin contract itself)
            </p>
          </div>

          {/* Value */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="value-display">Value (Wei)</Label>
              <CopyButton text={value.toString()} field="value" />
            </div>
            <Textarea
              id="value-display"
              value={value.toString()}
              readOnly
              className="font-mono text-sm"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              ETH amount in wei: {formatEther(value)} ETH
            </p>
          </div>

          {/* Calldata */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="calldata-display">Calldata</Label>
              <CopyButton text={calldata} field="calldata" />
            </div>
            <Textarea
              id="calldata-display"
              value={calldata}
              readOnly
              className="font-mono text-sm"
              rows={6}
            />
            <p className="text-xs text-muted-foreground">
              Encoded function call with routing, slippage, and hook parameters (
              {calldata.length} characters)
            </p>
          </div>
        </div>

        {/* Usage Instructions */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-3">
              <p className="font-semibold">How to use in Builder DAO (Option A - Raw Calldata):</p>
              <ol className="list-decimal list-inside space-y-1.5 text-sm">
                <li>Go to Create Proposal and add a &quot;Custom Transaction&quot;</li>
                <li>
                  <strong>Step 1 - Address:</strong> Paste the <strong>Target</strong> address above
                  (this is the Uniswap v4 router, NOT the coin contract)
                </li>
                <li>
                  <strong>Step 2 - Contract ABI:</strong> Leave empty or skip (we&apos;re using raw
                  calldata)
                </li>
                <li>
                  <strong>Step 3 - Function:</strong> This will be empty—that&apos;s expected. Builder
                  should allow you to proceed with raw calldata
                </li>
                <li>
                  When Builder asks for transaction data, paste the <strong>Calldata</strong> above
                </li>
                <li>
                  Set the transaction <strong>Value</strong> to the wei amount shown above
                </li>
                <li>Add a description like &quot;Buy [coin name] with X ETH from treasury&quot;</li>
                <li>Submit your proposal for DAO voting</li>
              </ol>
              <div className="mt-3 p-3 bg-muted rounded-md text-xs">
                <p className="font-semibold mb-1">Alternative: Option B - Helper Contract</p>
                <p>
                  If Builder forces you to select a function and won&apos;t accept raw calldata, you&apos;ll
                  need to deploy a small &quot;ZoraTreasuryTrader&quot; helper contract that accepts the
                  calldata as a bytes parameter. Contact the dev team if you need this approach.
                </p>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* Trade Summary */}
        <div className="border-t pt-4">
          <h3 className="font-semibold mb-3">Trade Summary</h3>
          <dl className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Coin Address:</dt>
              <dd className="font-mono">{coinAddress}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">ETH to Spend:</dt>
              <dd>{ethAmount} ETH</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Max Slippage:</dt>
              <dd>{slippage}%</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Sender (Treasury):</dt>
              <dd className="font-mono">{GNARS_ADDRESSES.treasury}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Recipient (Treasury):</dt>
              <dd className="font-mono">{GNARS_ADDRESSES.treasury}</dd>
            </div>
          </dl>
        </div>

        <Button onClick={onReset} variant="outline" className="w-full">
          Generate New Transaction
        </Button>
      </div>
    </Card>
  );
}
