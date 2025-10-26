/**
 * DroposalActionBox
 * Shows price, edition, sale status and mint CTA.
 */
"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMintDroposal } from "@/hooks/useMintDroposal";

export interface DroposalActionBoxProps {
  priceEth: string;
  saleActive: boolean;
  saleNotStarted: boolean;
  saleEnded: boolean;
  saleStart?: number;
  saleEnd?: number;
  hasDecoded: boolean;
  tokenAddress?: `0x${string}`;
}

export function DroposalActionBox({
  priceEth,
  saleActive,
  saleNotStarted,
  saleEnded,
  saleStart,
  saleEnd,
  hasDecoded,
  tokenAddress,
}: DroposalActionBoxProps) {
  const [quantity, setQuantity] = useState(1);
  const [comment, setComment] = useState("");

  const { mint, isPending, isReady, isConnected } = useMintDroposal({
    tokenAddress: tokenAddress || "0x",
    priceEth,
    onSuccess: (txHash) => {
      console.log("Mint successful:", txHash);
    },
    onError: (error) => {
      console.error("Mint failed:", error);
    },
  });

  const handleMint = async () => {
    if (!tokenAddress) {
      console.error("No token address provided");
      return;
    }
    await mint(quantity, comment);
  };

  const totalPrice = (parseFloat(priceEth) * quantity).toFixed(4);

  // Countdown logic moved to client component
  const formatCountdown = (target: number) => {
    const now = Date.now();
    const diff = Math.max(0, target - now);
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${d}d ${h}h ${m}m`;
  };
  return (
    <Card>
      <CardContent className="space-y-4">
        <div>
          <div className="text-xs text-muted-foreground">Price</div>
          <div className="text-lg font-semibold">
            {Number(priceEth) === 0 ? "Free" : `${priceEth} ETH`}
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {saleNotStarted && saleStart ? (
            <span>
              Starts {new Date(saleStart).toLocaleString()} · {formatCountdown(saleStart)}
            </span>
          ) : null}
          {saleEnded && saleEnd ? <span>Ended {new Date(saleEnd).toLocaleString()}</span> : null}
          {!hasDecoded && (
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              No sale configuration
            </span>
          )}
        </div>
        {saleActive && tokenAddress ? (
          <div className="space-y-4">
            {/* Quantity Selector */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </Button>
                 <Input
                   id="quantity"
                   type="number"
                   min="1"
                   value={quantity}
                   onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                   className="w-20 text-center [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                 />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  +
                </Button>
              </div>
            </div>

            {/* Comment Input */}
            <div className="space-y-2">
              <Label htmlFor="comment">Comment (optional)</Label>
              <Textarea
                id="comment"
                placeholder="Add a comment to your mint..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
              />
            </div>

            {/* Mint Button */}
            <Button 
              onClick={handleMint}
              disabled={!saleActive || !isReady || isPending || !isConnected}
              className="w-full"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Minting...
                </>
              ) : (
                `Collect for ${totalPrice} ETH`
              )}
            </Button>
          </div>
        ) : (
          <Button disabled={!saleActive} className="w-full">
            {saleActive ? "Mint" : "Mint is not available yet"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
