"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Code2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ipfsToGatewayUrl } from "@/lib/pinata";
import { DROPOSAL_DEFAULT_MINT_LIMIT } from "@/lib/config";
import type { StartTimeCalculation } from "@/hooks/use-dao-settings";

interface DroposalDebugPanelProps {
  formData: {
    name?: string;
    symbol?: string;
    description?: string;
    animationURI?: string;
    imageURI?: string;
    price?: string;
    startTime?: Date;
    endTime?: Date;
    payoutAddress?: string;
    defaultAdmin?: string;
    editionSize?: string;
    royalty?: string;
    transactionDescription?: string;
  };
  startTimeCalculation?: StartTimeCalculation;
}

export function DroposalDebugPanel({ formData, startTimeCalculation }: DroposalDebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error(`Failed to copy ${label}`);
    }
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return "Not set";
    return date.toISOString();
  };

  const formatDays = (days: number) => {
    if (days < 1) {
      const hours = days * 24;
      return `${hours.toFixed(2)} hours`;
    }
    return `${days.toFixed(2)} days`;
  };

  return (
    <Card className="border-dashed border-2 border-purple-500/50 bg-purple-50/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-purple-500" />
            <CardTitle className="text-lg">Debug: Droposal Transaction Data</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Hide
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show Details
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Collection Info */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-purple-600">Collection Details</h4>
            <div className="bg-muted p-3 rounded-md space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-mono">{formData.name || "Not set"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Symbol:</span>
                <span className="font-mono">{formData.symbol || "Not set"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Edition Size:</span>
                <span className="font-mono">
                  {formData.editionSize === "0" ? "∞ (Open Edition)" : formData.editionSize || "Not set"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mint Limit/Address:</span>
                <span className="font-mono text-green-600">{DROPOSAL_DEFAULT_MINT_LIMIT.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          {formData.description && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Collection Description</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(formData.description!, "Description")}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <div className="bg-muted p-3 rounded-md text-sm">
                {formData.description}
              </div>
            </div>
          )}

          {/* Media URLs */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-purple-600">Media Files</h4>

            {/* Animation/Media URI */}
            {formData.animationURI && (
              <div className="space-y-2">
                <div className="bg-muted p-3 rounded-md space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground font-semibold">Media IPFS URL:</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(formData.animationURI!, "Media IPFS URL")}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs font-mono break-all">{formData.animationURI}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground font-semibold">Media Gateway URL:</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(ipfsToGatewayUrl(formData.animationURI!), "Media Gateway URL")}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs font-mono break-all text-blue-500">
                      {ipfsToGatewayUrl(formData.animationURI!)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Cover Image URI */}
            {formData.imageURI && (
              <div className="space-y-2">
                <div className="bg-muted p-3 rounded-md space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground font-semibold">Cover IPFS URL:</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(formData.imageURI!, "Cover IPFS URL")}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs font-mono break-all">{formData.imageURI}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground font-semibold">Cover Gateway URL:</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(ipfsToGatewayUrl(formData.imageURI!), "Cover Gateway URL")}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs font-mono break-all text-blue-500">
                      {ipfsToGatewayUrl(formData.imageURI!)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pricing & Timeline */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-purple-600">Pricing & Timeline</h4>
            <div className="bg-muted p-3 rounded-md space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price:</span>
                <span className="font-mono">{formData.price ? `${formData.price} ETH` : "Not set"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Royalty:</span>
                <span className="font-mono">
                  {formData.royalty 
                    ? `${Number(formData.royalty) / 100}% (${formData.royalty} basis points)` 
                    : "Not set"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Start Time:</span>
                <span className="font-mono text-xs">{formatDate(formData.startTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">End Time:</span>
                <span className="font-mono text-xs">{formatDate(formData.endTime)}</span>
              </div>
            </div>
          </div>

          {/* Start Time Calculation Breakdown */}
          {startTimeCalculation && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-purple-600">Start Time Calculation</h4>
              <div className="bg-muted p-3 rounded-md space-y-3 text-sm">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">1. Voting Delay (Inactive):</span>
                    <span className="font-mono">
                      {startTimeCalculation.votingDelayBlocks.toLocaleString()} blocks = {formatDays(startTimeCalculation.votingDelayDays)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">2. Voting Period (Active):</span>
                    <span className="font-mono">
                      {startTimeCalculation.votingPeriodBlocks.toLocaleString()} blocks = {formatDays(startTimeCalculation.votingPeriodDays)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">3. Timelock Delay (Queued):</span>
                    <span className="font-mono">
                      {startTimeCalculation.timelockDelaySeconds.toLocaleString()}s = {formatDays(startTimeCalculation.timelockDelayDays)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">4. Execution Buffer:</span>
                    <span className="font-mono">{startTimeCalculation.executionBufferDays} {startTimeCalculation.executionBufferDays === 1 ? 'day' : 'days'}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-border">
                  <div className="flex justify-between font-semibold">
                    <span className="text-purple-600">Total Timeline:</span>
                    <span className="font-mono text-purple-600">
                      ~{startTimeCalculation.totalDays.toFixed(2)} days
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Addresses */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-purple-600">Addresses</h4>
            <div className="bg-muted p-3 rounded-md space-y-2 text-sm">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Payout Address:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(formData.payoutAddress || "", "Payout Address")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="font-mono text-xs break-all">{formData.payoutAddress || "Not set"}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Admin Address:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(formData.defaultAdmin || "", "Admin Address")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="font-mono text-xs break-all">{formData.defaultAdmin || "Not set"}</p>
              </div>
            </div>
          </div>

          {/* Transaction Description */}
          {formData.transactionDescription && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Transaction Description</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(formData.transactionDescription!, "Transaction Description")}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <div className="bg-muted p-3 rounded-md text-sm">
                {formData.transactionDescription}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
