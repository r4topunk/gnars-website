"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentPoolConfig, getTickPriceInfo } from "@/lib/zora/poolConfigDebug";
import { GNARS_CREATOR_COIN } from "@/lib/config";
import { Copy, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface PoolConfigDebugProps {
  className?: string;
}

export function PoolConfigDebug({ className }: PoolConfigDebugProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [config, setConfig] = React.useState(() => getCurrentPoolConfig());

  const refreshConfig = React.useCallback(() => {
    setConfig(getCurrentPoolConfig());
    toast.success("Pool config refreshed");
  }, []);

  const copyToClipboard = React.useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  }, []);

  const priceInfo = React.useMemo(() => {
    return getTickPriceInfo([...config.tickLower], [...config.tickUpper]);
  }, [config.tickLower, config.tickUpper]);

  if (!isVisible) {
    return (
      <div className={className}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsVisible(true)}
          className="gap-2"
        >
          <Eye className="h-4 w-4" />
          Show Pool Config Debug
        </Button>
      </div>
    );
  }

  return (
    <div className={className}>
      <Card className="border-orange-200 bg-orange-50/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Pool Configuration Debug
              </CardTitle>
              <CardDescription>
                Current bonding curve parameters being used for coin deployment
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={refreshConfig}>
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsVisible(false)}
              >
                <EyeOff className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Basic Config Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Basic Configuration</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Version:</span>
                  <Badge variant="secondary">{config.version}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Currency:</span>
                  <div className="flex items-center gap-1">
                    <code className="text-xs bg-muted px-1 rounded">
                      {config.currency.slice(0, 6)}...{config.currency.slice(-4)}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4"
                      onClick={() => copyToClipboard(config.currency, "Currency address")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Positions:</span>
                  <Badge variant="outline">{config.numDiscoveryPositions.join(", ")}</Badge>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Supply Distribution</h4>
              <div className="space-y-1 text-sm">
                {config.readableSupplyShare.map((share, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="text-muted-foreground">Position {index + 1}:</span>
                    <Badge 
                      variant={parseFloat(share) > 5 ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {share} max
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tick Configuration */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Tick Configuration</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Position</th>
                    <th className="text-left p-2">Tick Lower</th>
                    <th className="text-left p-2">Tick Upper</th>
                    <th className="text-left p-2">Price Range (approx)</th>
                  </tr>
                </thead>
                <tbody>
                  {priceInfo.map((info, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2">#{index + 1}</td>
                      <td className="p-2">
                        <code className="text-xs bg-muted px-1 rounded">{info.tickLower.toLocaleString()}</code>
                      </td>
                      <td className="p-2">
                        <code className="text-xs bg-muted px-1 rounded">{info.tickUpper.toLocaleString()}</code>
                      </td>
                      <td className="p-2">
                        <span className="text-xs text-muted-foreground">
                          {info.priceRangeLower} - {info.priceRangeUpper}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Raw Config */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Encoded Configuration</h4>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted p-2 rounded break-all">
                {config.encodedConfig}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(config.encodedConfig, "Encoded config")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Warnings */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <div className="flex gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">Current Issues:</p>
                <ul className="mt-1 text-yellow-700 space-y-1">
                  <li>• Using placeholder parameters (not production-safe)</li>
                  <li>• May result in extreme price curves and supply concentration</li>
                  <li>• Waiting for Zora API configuration recommendations</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}