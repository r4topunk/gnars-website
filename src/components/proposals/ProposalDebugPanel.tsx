"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Code2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ipfsToGatewayUrl } from "@/lib/pinata";
import { type ProposalFormValues } from "./schema";

interface ProposalDebugPanelProps {
  formData: ProposalFormValues;
  preparedDescription?: string;
  encodedTransactions?: {
    targets: `0x${string}`[];
    values: bigint[];
    calldatas: `0x${string}`[];
  };
}

export function ProposalDebugPanel({ formData, preparedDescription, encodedTransactions }: ProposalDebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  // Split the description by && to show title and body separately
  // Format is: Title&&Body (no spaces)
  const parts = preparedDescription?.split("&&");
  const titlePart = parts?.[0] ?? formData.title;
  const bodyPart = parts?.[1] ?? formData.description;

  return (
    <Card className="border-dashed border-2 border-blue-500/50 bg-blue-50/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-lg">Debug: Proposal Data Preview</CardTitle>
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
          {/* Title */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Title (Before &&)</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(titlePart, "Title")}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <div className="bg-muted p-3 rounded-md text-sm font-mono">
              {titlePart || formData.title}
            </div>
          </div>

          {/* Banner Image */}
          {formData.bannerImage && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Banner Image</h4>
              <div className="bg-muted p-3 rounded-md space-y-2">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground font-semibold">IPFS URL:</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(formData.bannerImage!, "IPFS URL")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs font-mono break-all">{formData.bannerImage}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground font-semibold">Gateway URL:</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(ipfsToGatewayUrl(formData.bannerImage!), "Gateway URL")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <a
                    href={ipfsToGatewayUrl(formData.bannerImage)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono break-all text-blue-500 hover:underline"
                  >
                    {ipfsToGatewayUrl(formData.bannerImage)}
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Description Body */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Description (After &&)</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(bodyPart || formData.description, "Description")}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <div className="bg-muted p-3 rounded-md text-sm font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
              {bodyPart || formData.description}
            </div>
          </div>

          {/* Full Description with && */}
          {preparedDescription && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Full Description (as sent to contract)</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(preparedDescription, "Full description")}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <div className="bg-muted p-3 rounded-md text-sm font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
                {preparedDescription}
              </div>
              <p className="text-xs text-muted-foreground">
                Format: <code className="bg-background px-1 py-0.5 rounded">Title&&Body</code> - The && separator tells the UI where to split title from description
              </p>
            </div>
          )}

          {/* Transaction Count */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Transactions</h4>
            <div className="bg-muted p-3 rounded-md text-sm">
              <p className="font-mono">{formData.transactions?.length ?? 0} transaction(s)</p>
            </div>
          </div>

          {/* Encoded Transaction Data */}
          {encodedTransactions && (
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Encoded Transaction Data</h4>
              
              {/* Targets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">Targets (Contract Addresses)</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(JSON.stringify(encodedTransactions.targets, null, 2), "Targets")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <div className="bg-muted p-3 rounded-md space-y-1 max-h-40 overflow-y-auto">
                  {encodedTransactions.targets.map((target, i) => (
                    <div key={i} className="text-xs font-mono break-all">
                      <span className="text-muted-foreground">[{i}]</span> {target}
                    </div>
                  ))}
                </div>
              </div>

              {/* Values */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">Values (ETH amounts in wei)</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(JSON.stringify(encodedTransactions.values.map(v => v.toString()), null, 2), "Values")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <div className="bg-muted p-3 rounded-md space-y-1 max-h-40 overflow-y-auto">
                  {encodedTransactions.values.map((value, i) => (
                    <div key={i} className="text-xs font-mono break-all">
                      <span className="text-muted-foreground">[{i}]</span> {value.toString()}
                    </div>
                  ))}
                </div>
              </div>

              {/* Calldatas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">Calldatas (Encoded Function Calls)</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(JSON.stringify(encodedTransactions.calldatas, null, 2), "Calldatas")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <div className="bg-muted p-3 rounded-md space-y-2 max-h-60 overflow-y-auto">
                  {encodedTransactions.calldatas.map((calldata, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground font-semibold">Transaction {i + 1}:</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(calldata, `Calldata ${i + 1}`)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs font-mono break-all bg-background p-2 rounded">{calldata}</p>
                      <p className="text-xs text-muted-foreground">Length: {calldata.length} characters</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  💡 Tip: Copy the calldata and decode it on{" "}
                  <a
                    href="https://openchain.xyz/signatures"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    OpenChain
                  </a>
                  {" "}or{" "}
                  <a
                    href="https://www.4byte.directory/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    4byte.directory
                  </a>
                </p>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
