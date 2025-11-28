"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSplitCreation } from "@/hooks/use-split-creation";
import type { SplitRecipient } from "@/lib/splits-utils";
import {
  validateSplitRecipients,
  prepareSplitConfigForSDK,
  formatSplitAddress,
  IMMUTABLE_CONTROLLER,
} from "@/lib/splits-utils";

interface SplitDebugPanelProps {
  recipients: SplitRecipient[];
  distributorFee: number;
  onSplitCreated?: (splitAddress: string) => void;
}

export function SplitDebugPanel({
  recipients,
  distributorFee,
  onSplitCreated,
}: SplitDebugPanelProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const { createSplit, isPending, isSuccess, isError, error, splitAddress, txHash, reset } =
    useSplitCreation();

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCreateSplit = async () => {
    try {
      const validationErrors = validateSplitRecipients(recipients);
      if (validationErrors.length > 0) {
        alert("Fix validation errors before creating split:\n" + validationErrors.map((e) => `• ${e.message}`).join("\n"));
        return;
      }

      const splitConfig = {
        recipients,
        distributorFeePercent: distributorFee,
        controller: IMMUTABLE_CONTROLLER,
      };

      const config = prepareSplitConfigForSDK(splitConfig);

      const address = await createSplit(config);
      if (address && onSplitCreated) {
        onSplitCreated(address);
      }
    } catch (err) {
      console.error("Failed to create split:", err);
    }
  };

  const handleReset = () => {
    reset();
  };

  const validationErrors = validateSplitRecipients(recipients);
  const isValid = validationErrors.length === 0;

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-blue-600">🧪</span>
          Split Creation Test Panel
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Test creating the split contract before submitting the proposal
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Validation Status */}
        {!isValid && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Configuration Invalid:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                {validationErrors.map((err, i) => (
                  <li key={i} className="text-xs">
                    {err.message}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Configuration Preview */}
        <div className="space-y-2 text-sm">
          <div className="font-semibold text-foreground">Configuration:</div>
          <div className="bg-white dark:bg-gray-900 p-3 rounded border space-y-1 font-mono text-xs text-foreground">
            <div><span className="text-blue-600 dark:text-blue-400 font-semibold">Recipients:</span> {recipients.length}</div>
            <div><span className="text-blue-600 dark:text-blue-400 font-semibold">Distributor Fee:</span> {distributorFee}%</div>
            <div><span className="text-blue-600 dark:text-blue-400 font-semibold">Controller:</span> {formatSplitAddress(IMMUTABLE_CONTROLLER)} (Immutable)</div>
          </div>
        </div>

        {/* Action Button */}
        {!isSuccess && (
          <Button
            onClick={handleCreateSplit}
            disabled={!isValid || isPending}
            className="w-full"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Split Contract...
              </>
            ) : (
              "🧪 Test Create Split"
            )}
          </Button>
        )}

        {/* Success State */}
        {isSuccess && splitAddress && (
          <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription>
              <div className="space-y-3">
                <strong className="text-green-900 dark:text-green-100">Split Created Successfully!</strong>

                {/* Split Address */}
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-green-900 dark:text-green-100">Split Address:</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white dark:bg-gray-900 px-2 py-1 rounded text-xs border text-foreground">
                      {splitAddress}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(splitAddress, "address")}
                      className="h-7 w-7 p-0"
                    >
                      {copied === "address" ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Transaction Hash */}
                {txHash && (
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-green-900 dark:text-green-100">Transaction:</div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-white dark:bg-gray-900 px-2 py-1 rounded text-xs border truncate text-foreground">
                        {txHash}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(txHash, "tx")}
                        className="h-7 w-7 p-0"
                      >
                        {copied === "tx" ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-7 w-7 p-0"
                      >
                        <a
                          href={`https://basescan.org/tx/${txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                )}

                {/* View on Splits.org */}
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="w-full"
                >
                  <a
                    href={`https://app.splits.org/accounts/${splitAddress}/?chainId=8453`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View on Splits.org
                    <ExternalLink className="ml-2 h-3 w-3" />
                  </a>
                </Button>

                {/* Reset Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="w-full"
                >
                  Test Another Configuration
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Error State */}
        {isError && error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <strong>Failed to create split:</strong>
                <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
                  {error instanceof Error ? error.message : String(error)}
                </pre>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  Try Again
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Info Box */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Test First:</strong> Create the split contract now to verify your configuration. You can reuse this address or create a new one when submitting the proposal.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
