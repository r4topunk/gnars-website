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
}

export function ProposalDebugPanel({ formData, preparedDescription }: ProposalDebugPanelProps) {
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
        </CardContent>
      )}
    </Card>
  );
}
