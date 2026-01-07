"use client";

import { useState } from "react";
import { Check, Copy, Info } from "lucide-react";
import { formatEther } from "viem";
import { DroposalMedia } from "@/components/droposals/detail/DroposalMedia";
import { Badge } from "@/components/ui/badge";
import { decodeDroposalParams } from "@/lib/droposal-utils";
import { ipfsToHttp } from "@/lib/ipfs";
import { cn } from "@/lib/utils";
import { type TransactionFormValues } from "../schema";

interface DroposalTransactionDetailsProps {
  transaction: TransactionFormValues;
}

export function DroposalTransactionDetails({ transaction }: DroposalTransactionDetailsProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [copied, setCopied] = useState(false);

  if (transaction.type !== "droposal") return null;

  const { name, symbol, price, animationUri, imageUri, rawCalldata } = transaction;

  // Convert IPFS URIs to HTTP URLs
  const mediaAnimation = animationUri ? ipfsToHttp(animationUri) : undefined;
  const mediaImage = imageUri ? ipfsToHttp(imageUri) : undefined;

  // Decode calldata to get additional info
  const decodedData = rawCalldata ? decodeDroposalParams(rawCalldata) : null;

  // Copy calldata to clipboard
  const handleCopy = async () => {
    if (rawCalldata) {
      await navigator.clipboard.writeText(rawCalldata);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Format dates
  const formatDate = (timestamp: bigint) => {
    if (timestamp === 18446744073709551615n) return "No limit";
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="perspective-1000 w-full">
      <div
        className={cn(
          "relative w-full transition-all duration-700 transform-style-3d",
          // Mobile: vertical card, Desktop: horizontal card
          "min-h-[480px] md:min-h-[320px]",
          isFlipped && "rotate-y-180",
        )}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* FRONT SIDE - TCG Card (Mobile) / Driver's License (Desktop) */}
        <div
          className={cn(
            "absolute inset-0 w-full backface-hidden",
            isFlipped && "pointer-events-none",
          )}
          style={{ backfaceVisibility: "hidden" }}
        >
          {/* Card Container */}
          <div className="relative h-full p-2.5 md:p-3 rounded-2xl bg-card dark:bg-card border-2 border-border shadow-xl">
            {/* Subtle Shine Effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-transparent via-white/5 to-transparent pointer-events-none" />

            {/* Info Icon - Top Right Corner */}
            <button
              onClick={() => setIsFlipped(true)}
              className="absolute top-1.5 right-1.5 z-10 p-1.5 rounded-full bg-neutral-700/90 hover:bg-neutral-600 dark:bg-neutral-600/90 dark:hover:bg-neutral-500 text-neutral-100 transition-colors shadow-lg"
              aria-label="Show calldata"
            >
              <Info className="h-3.5 w-3.5" />
            </button>

            {/* Mobile: Vertical Layout */}
            <div className="md:hidden h-full flex flex-col">
              {/* Card Header */}
              <div className="relative mb-1.5">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-tight leading-tight truncate">
                    {name || "Untitled"}
                  </h3>
                  <p className="text-xs text-muted-foreground font-semibold truncate">
                    {symbol || "---"}
                  </p>
                </div>
              </div>

              {/* Video Frame */}
              <div className="relative mb-1.5">
                <div className="p-0.5 bg-gradient-to-br from-neutral-400 via-neutral-500 to-neutral-400 dark:from-neutral-600 dark:via-neutral-700 dark:to-neutral-600 rounded-lg">
                  <div className="relative rounded-md overflow-hidden bg-black aspect-[16/9]">
                    {(mediaAnimation || mediaImage) && (
                      <DroposalMedia
                        mediaAnimation={mediaAnimation}
                        mediaImage={mediaImage}
                        alt={name || "Droposal media"}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Stats Section */}
              <div className="relative space-y-1 flex-1">
                {/* Mint Price */}
                <div className="relative px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-neutral-700 to-neutral-800 dark:from-neutral-800 dark:to-neutral-900 border border-neutral-600 dark:border-neutral-700">
                  <div className="text-center">
                    <p className="text-[9px] uppercase tracking-widest text-neutral-300 dark:text-neutral-400 font-bold mb-0.5">
                      Mint Price
                    </p>
                    <p className="text-lg font-black font-mono text-white dark:text-neutral-100 leading-none">
                      {price || "0"} ETH
                    </p>
                  </div>
                </div>

                {/* Description */}
                {decodedData?.collectionDescription && (
                  <div className="rounded-lg bg-muted border border-border p-2 h-20 overflow-y-auto">
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      {decodedData.collectionDescription}
                    </p>
                  </div>
                )}

                {/* Sale Details */}
                {decodedData && (
                  <div className="grid grid-cols-2 gap-1">
                    <div className="px-2 py-1 rounded bg-muted border border-border">
                      <p className="text-[8px] uppercase tracking-wider text-muted-foreground font-bold">
                        Sale Start
                      </p>
                      <p className="text-[10px] font-bold text-foreground">
                        {formatDate(decodedData.saleConfig.publicSaleStart)}
                      </p>
                    </div>
                    <div className="px-2 py-1 rounded bg-muted border border-border">
                      <p className="text-[8px] uppercase tracking-wider text-muted-foreground font-bold">
                        Max Mint
                      </p>
                      <p className="text-[10px] font-bold text-foreground">
                        {decodedData.saleConfig.maxSalePurchasePerAddress === 1000000
                          ? "∞"
                          : decodedData.saleConfig.maxSalePurchasePerAddress}
                      </p>
                    </div>
                  </div>
                )}

                {/* Card Type Badge */}
                <div className="text-center">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-neutral-600 dark:bg-neutral-700/50 border border-neutral-700 dark:border-neutral-600 text-[9px] uppercase tracking-wider text-neutral-100 dark:text-neutral-300 font-bold">
                    NFT Collection
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop: Horizontal Layout (Driver's License Style) */}
            <div className="hidden md:flex h-full gap-4">
              {/* Left: Video/Image */}
              <div className="w-[45%] flex items-center">
                <div className="w-full p-0.5 bg-gradient-to-br from-neutral-400 via-neutral-500 to-neutral-400 dark:from-neutral-600 dark:via-neutral-700 dark:to-neutral-600 rounded-lg">
                  <div className="relative rounded-md overflow-hidden bg-black aspect-video">
                    {(mediaAnimation || mediaImage) && (
                      <DroposalMedia
                        mediaAnimation={mediaAnimation}
                        mediaImage={mediaImage}
                        alt={name || "Droposal media"}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Info */}
              <div className="flex-1 flex flex-col justify-between py-2">
                {/* Header */}
                <div>
                  <h3 className="text-lg font-bold text-foreground uppercase tracking-tight leading-tight truncate">
                    {name || "Untitled"}
                  </h3>
                  <p className="text-sm text-muted-foreground font-semibold truncate mb-3">
                    {symbol || "---"}
                  </p>

                  {/* Description */}
                  {decodedData?.collectionDescription && (
                    <div className="rounded-lg bg-muted border border-border p-2.5 max-h-32 overflow-y-auto mb-3">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {decodedData.collectionDescription}
                      </p>
                    </div>
                  )}
                </div>

                {/* Bottom Info */}
                <div className="space-y-2">
                  {/* Mint Price */}
                  <div className="relative px-3 py-2 rounded-lg bg-gradient-to-r from-neutral-700 to-neutral-800 dark:from-neutral-800 dark:to-neutral-900 border border-neutral-600 dark:border-neutral-700">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-widest text-neutral-300 dark:text-neutral-400 font-bold">
                        Mint Price
                      </p>
                      <p className="text-xl font-black font-mono text-white dark:text-neutral-100 leading-none">
                        {price || "0"} ETH
                      </p>
                    </div>
                  </div>

                  {/* Sale Details */}
                  {decodedData && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="px-2.5 py-1.5 rounded bg-muted border border-border">
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold mb-0.5">
                          Sale Start
                        </p>
                        <p className="text-[11px] font-bold text-foreground">
                          {formatDate(decodedData.saleConfig.publicSaleStart)}
                        </p>
                      </div>
                      <div className="px-2.5 py-1.5 rounded bg-muted border border-border">
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold mb-0.5">
                          Max Mint
                        </p>
                        <p className="text-[11px] font-bold text-foreground">
                          {decodedData.saleConfig.maxSalePurchasePerAddress === 1000000
                            ? "∞"
                            : decodedData.saleConfig.maxSalePurchasePerAddress}
                        </p>
                      </div>
                      <div className="px-2.5 py-1.5 rounded bg-muted border border-border flex items-center justify-center">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                          NFT
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ZORA Badge - Bottom Right */}
            <Badge className="absolute bottom-2 right-2 bg-neutral-600 text-white dark:bg-neutral-700 dark:text-neutral-200 border-0 font-bold text-[10px] px-2 py-0.5">
              ZORA
            </Badge>

            {/* Bottom Border Accent */}
            <div className="absolute bottom-1.5 left-2.5 right-2.5 h-0.5 bg-gradient-to-r from-transparent via-neutral-400 dark:via-neutral-600 to-transparent rounded-full opacity-30" />
          </div>
        </div>

        {/* BACK SIDE - Decoded Data */}
        <div
          className={cn(
            "absolute inset-0 w-full backface-hidden rotate-y-180",
            !isFlipped && "pointer-events-none",
          )}
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="relative h-full p-2.5 rounded-2xl bg-card dark:bg-card border-2 border-border shadow-xl flex flex-col">
            {/* Header with Back Button */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div className="p-1 rounded bg-neutral-600/50 dark:bg-neutral-700/50">
                  <Info className="h-3 w-3 text-neutral-100 dark:text-neutral-300" />
                </div>
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Details
                </h4>
              </div>
              <button
                onClick={() => setIsFlipped(false)}
                className="px-2.5 py-1 rounded-md bg-neutral-600 hover:bg-neutral-500 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-50 dark:text-neutral-100 text-[10px] font-semibold transition-colors"
                aria-label="Back to card"
              >
                Back
              </button>
            </div>

            {/* Decoded Data Content */}
            <div className="flex-1 overflow-y-auto space-y-1.5">
              {decodedData ? (
                <>
                  {/* Collection Info */}
                  <div className="rounded-lg bg-muted border border-border p-2 space-y-1">
                    <h5 className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold mb-1">
                      Collection
                    </h5>
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">Name:</span>
                        <span className="text-foreground font-semibold">{decodedData.name}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">Symbol:</span>
                        <span className="text-foreground font-mono font-semibold">
                          {decodedData.symbol}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">Edition Size:</span>
                        <span className="text-foreground font-semibold">
                          {decodedData.editionSize === 18446744073709551615n
                            ? "Unlimited"
                            : decodedData.editionSize.toString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">Royalty:</span>
                        <span className="text-foreground font-semibold">
                          {(decodedData.royaltyBPS / 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sale Config */}
                  <div className="rounded-lg bg-muted border border-border p-2 space-y-1">
                    <h5 className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold mb-1">
                      Sale Details
                    </h5>
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">Price:</span>
                        <span className="text-foreground font-mono font-semibold">
                          {formatEther(decodedData.saleConfig.publicSalePrice)} ETH
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">Max per wallet:</span>
                        <span className="text-foreground font-semibold">
                          {decodedData.saleConfig.maxSalePurchasePerAddress === 1000000
                            ? "∞"
                            : decodedData.saleConfig.maxSalePurchasePerAddress}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">Sale Start:</span>
                        <span className="text-foreground font-semibold text-right">
                          {formatDate(decodedData.saleConfig.publicSaleStart)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">Sale End:</span>
                        <span className="text-foreground font-semibold">
                          {formatDate(decodedData.saleConfig.publicSaleEnd)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Addresses */}
                  <div className="rounded-lg bg-muted border border-border p-2 space-y-1">
                    <h5 className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold mb-1">
                      Addresses
                    </h5>
                    <div className="space-y-0.5">
                      <div className="text-[10px]">
                        <p className="text-muted-foreground mb-0.5">Funds Recipient:</p>
                        <p className="text-foreground font-mono text-[9px] break-all">
                          {decodedData.fundsRecipient}
                        </p>
                      </div>
                      <div className="text-[10px]">
                        <p className="text-muted-foreground mb-0.5">Admin:</p>
                        <p className="text-foreground font-mono text-[9px] break-all">
                          {decodedData.defaultAdmin}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* URIs */}
                  <div className="rounded-lg bg-muted border border-border p-2 space-y-1">
                    <h5 className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold mb-1">
                      Media
                    </h5>
                    <div className="space-y-0.5 text-[9px]">
                      <div>
                        <p className="text-muted-foreground mb-0.5">Animation:</p>
                        <p className="text-foreground font-mono break-all">
                          {decodedData.animationURI}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-0.5">Image:</p>
                        <p className="text-foreground font-mono break-all">
                          {decodedData.imageURI}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Calldata - Copyable */}
                  <div className="rounded-lg bg-muted border border-border p-2">
                    <div className="flex items-center justify-between mb-1">
                      <h5 className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">
                        Transaction Data
                      </h5>
                      <button
                        onClick={handleCopy}
                        className="px-1.5 py-0.5 rounded bg-neutral-500/50 hover:bg-neutral-500 dark:bg-neutral-700/50 dark:hover:bg-neutral-700 transition-colors"
                      >
                        {copied ? (
                          <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                        ) : (
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                    <p className="text-[8px] font-mono text-muted-foreground break-all leading-relaxed">
                      {rawCalldata}
                    </p>
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-xs text-muted-foreground">No decoded data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
