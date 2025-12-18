"use client";

import { X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { FaEthereum } from "react-icons/fa";
import { parseEther } from "viem";
import type { TVItem } from "./types";
import { useBatchCoinPurchase } from "@/hooks/use-batch-coin-purchase";
import { GNARS_CREATOR_COIN } from "@/lib/config";
import { PurchaseFlowChart } from "./PurchaseFlowChart";

const SKATEHIVE_REFERRER = "0xb4964e1eca55db36a94e8aeffbfbab48529a2f6c";

type ModalStep = "select" | "confirm" | "executing" | "success" | "error";

interface BuyAllModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: TVItem[];
  sharedStrategy?: {
    name: string;
    coins: string[];
    eth: string;
  } | null;
}

/**
 * Modal for buying multiple content coins in bulk
 */
export function BuyAllModal({ isOpen, onClose, items, sharedStrategy }: BuyAllModalProps) {
  const [mounted, setMounted] = useState(false);
  const [ethAmount, setEthAmount] = useState("0.01");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<ModalStep>("select");
  const [error, setError] = useState<string | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [strategyName, setStrategyName] = useState("");
  const [displayStrategyName, setDisplayStrategyName] = useState<string | null>(null);

  // Filter to only coins (not droposals) and take first 20
  const contentCoins = useMemo(() => {
    return items
      .filter((item) => item.coinAddress && !item.tokenAddress)
      .slice(0, 20);
  }, [items]);

  // Selected coins with amounts
  const selectedCoins = useMemo(() => {
    let totalEth = 0n;
    try {
      totalEth = parseEther(ethAmount || "0");
    } catch (error) {
      // Invalid input - default to 0
      console.warn("Invalid ETH amount:", ethAmount, error);
    }
    
    const ethPerCoin = selectedItems.size > 0 ? totalEth / BigInt(selectedItems.size) : 0n;
    
    return contentCoins
      .filter((item) => selectedItems.has(item.id))
      .map((item) => ({
        address: item.coinAddress as `0x${string}`,
        ethAmount: ethPerCoin,
      }));
  }, [contentCoins, selectedItems, ethAmount]);

  // Initialize batch purchase hook (Multicall3 - single atomic transaction)
  const {
    executeBatchPurchase,
    isPreparing,
    isPending,
    isConfirmed,
    error: txError,
    txHash,
    totalSwaps,
  } = useBatchCoinPurchase({
    coins: selectedCoins,
    slippageBps: 500,
    onSuccess: () => setStep("success"),
    onError: (err) => {
      setError(err.message);
      setStep("error");
    },
  });

  // Pre-select first 10 items when modal opens, preferring paired coins
  // OR use shared strategy if provided
  useEffect(() => {
    if (isOpen && contentCoins.length > 0) {
      // Check if we have a shared strategy
      if (sharedStrategy && sharedStrategy.coins.length > 0) {
        // Find items matching the shared coin addresses
        const sharedCoinSet = new Set(sharedStrategy.coins.map((addr) => addr.toLowerCase()));
        const matchingItems = contentCoins.filter((item) => 
          item.coinAddress && sharedCoinSet.has(item.coinAddress.toLowerCase())
        );
        
        setSelectedItems(new Set(matchingItems.map((item) => item.id)));
        setEthAmount(sharedStrategy.eth);
        setDisplayStrategyName(sharedStrategy.name);
        setStep("confirm"); // Open directly in confirmation/preview step
      } else {
        // Default behavior: prefer paired coins
        const pairedCoins = contentCoins.filter((item) => item.poolCurrencyTokenAddress);
        const unpairedCoins = contentCoins.filter((item) => !item.poolCurrencyTokenAddress);
        const sortedCoins = [...pairedCoins, ...unpairedCoins];
        
        const preSelected = new Set(sortedCoins.slice(0, 10).map((item) => item.id));
        setSelectedItems(preSelected);
        setDisplayStrategyName(null);
        setStep("select");
      }
      
      setError(null);
    }
  }, [isOpen, contentCoins, sharedStrategy]);

  // Ensure component is mounted (client-side only for portal)
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClose = useCallback(() => {
    if (step === "executing" || isPreparing || isPending) {
      return; // Don't allow closing during transaction
    }
    setStep("select");
    setError(null);
    onClose();
  }, [step, isPreparing, isPending, onClose]);

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, handleClose]);

  const toggleItem = (itemId: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedItems(new Set(contentCoins.map((item) => item.id)));
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  const handleShare = () => {
    setShowShareDialog(true);
  };

  const handleGenerateShareLink = () => {
    if (!strategyName.trim()) {
      setError("Please enter a strategy name");
      return;
    }

    const selectedItemsData = contentCoins.filter((item) => selectedItems.has(item.id));
    const coinAddresses = selectedItemsData.map((item) => item.coinAddress).filter(Boolean);
    
    const params = new URLSearchParams();
    params.set("strategy", strategyName.trim());
    params.set("coins", coinAddresses.join(","));
    params.set("eth", ethAmount);
    
    const shareUrl = `${window.location.origin}/tv?${params.toString()}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl).then(() => {
      setShowShareDialog(false);
      setStrategyName("");
      // Show success feedback
      alert("Strategy link copied to clipboard!");
    }).catch(() => {
      setError("Failed to copy to clipboard");
    });
  };

  const handleProceedToConfirm = () => {
    // Basic validation
    if (selectedCoins.length === 0) {
      setError("Please select at least one coin");
      return;
    }

    if (selectedCoins.length > 20) {
      setError("Maximum 20 coins per batch");
      return;
    }

    const totalEth = parseEther(ethAmount || "0");
    if (totalEth === 0n) {
      setError("ETH amount must be greater than 0");
      return;
    }

    const ethPerCoin = totalEth / BigInt(selectedCoins.length);
    const minPerCoin = parseEther("0.0001");
    if (ethPerCoin < minPerCoin) {
      setError("Minimum 0.0001 ETH per coin");
      return;
    }

    setError(null);
    setStep("confirm");
  };

  const handleExecutePurchase = async () => {
    setStep("executing");
    setError(null);
    
    try {
      await executeBatchPurchase();
    } catch {
      // Error handling done in hook callbacks
    }
  };

  // Update step based on transaction state
  useEffect(() => {
    if (isConfirmed) {
      setStep("success");
    } else if (txError) {
      setStep("error");
      setError(String(txError) || "Transaction failed");
    }
  }, [isConfirmed, txError]);

  if (!isOpen || !mounted) return null;

  const selectedCount = selectedItems.size;
  const ethPerCoin = selectedCount > 0 ? parseFloat(ethAmount) / selectedCount : 0;

  // Render different content based on step
  const renderContent = () => {
    // Success State
    if (step === "success") {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-12">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-2xl font-bold mb-2 text-foreground">Purchase Successful!</h3>
          <p className="text-center mb-6 text-muted-foreground">
            You successfully purchased {selectedCount} content coins in a single transaction
          </p>
          {txHash && (
            <a
              href={`https://basescan.org/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-[#FBBF23] hover:underline"
            >
              View on Basescan: {txHash.slice(0, 8)}...{txHash.slice(-8)}
            </a>
          )}
        </div>
      );
    }

    // Error State
    if (step === "error") {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-12">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-red-100 dark:bg-red-900/30">
            <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-2xl font-bold mb-2 text-foreground">Purchase Failed</h3>
          <p className="text-center mb-6 max-w-md text-muted-foreground">
            {error || "An error occurred during the purchase"}
          </p>
          <button
            onClick={() => setStep("select")}
            className="px-6 py-3 font-medium rounded-xl transition-all bg-secondary text-secondary-foreground hover:bg-secondary/80"
          >
            Try Again
          </button>
        </div>
      );
    }

    // Executing State
    if (step === "executing") {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-12">
          <Loader2 className="w-16 h-16 animate-spin mb-6 text-[#FBBF23] dark:text-[#FBBF23]" />
          <h3 className="text-2xl font-bold mb-2 text-foreground">
            {isPreparing && "Preparing batch transaction..."}
            {isPending && "Confirming transaction..."}
            {!isPreparing && !isPending && "Processing..."}
          </h3>
          <p className="text-center text-muted-foreground">
            {isPreparing && `Generating swap data for ${totalSwaps} coins`}
            {isPending && "Waiting for blockchain confirmation"}
          </p>
        </div>
      );
    }

    // Confirmation State
    if (step === "confirm") {
      const selectedItemsData = contentCoins.filter((item) => selectedItems.has(item.id));

      return (
        <>
          <div className="flex-1 overflow-y-auto p-6">
            {/* Flow Chart Visualization */}
            <div className="mb-6">
              <PurchaseFlowChart items={selectedItemsData} ethPerCoin={ethPerCoin} totalEth={ethAmount} />
            </div>

            <div className="p-6 mb-6 rounded-xl bg-muted">
              <h3 className="mb-4 font-semibold text-foreground">Purchase Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Selected Creators</span>
                  <span className="font-medium text-foreground">{selectedCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ETH per Creator</span>
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <FaEthereum className="w-3 h-3 text-[#FBBF23]" />
                    {ethPerCoin.toFixed(6)}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-3 border-t border-border">
                  <span className="text-muted-foreground">Total</span>
                  <span className="flex items-center gap-1 font-bold text-[#FBBF23] dark:text-[#FBBF23]">
                    <FaEthereum className="w-4 h-4" />
                    {ethAmount} ETH
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-xl bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
              <p className="text-sm text-foreground">
                ⚡ <strong>Multicall3:</strong> All {selectedCount} purchases will execute in a single atomic transaction. One approval, one gas fee.
              </p>
            </div>
          </div>

          <div className="p-6 border-t border-border">
            <div className="flex gap-3 mb-3">
              <button
                onClick={handleShare}
                className="w-full px-4 py-2 text-sm font-medium rounded-xl transition-all bg-secondary text-secondary-foreground hover:bg-secondary/80 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share Strategy
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep("select")}
                className="flex-1 px-6 py-3 font-medium rounded-xl transition-all bg-secondary text-secondary-foreground hover:bg-secondary/80"
              >
                Back
              </button>
              <button
                onClick={handleExecutePurchase}
                className="flex-1 px-6 py-3 font-medium text-black rounded-xl transition-all bg-[#FBBF23] hover:bg-[#F59E0B] dark:bg-[#FBBF23] dark:hover:bg-[#F59E0B]"
              >
                Confirm Purchase
              </button>
            </div>
          </div>
        </>
      );
    }

    // Select State (default)
    return (
      <>
        {/* ETH Input Section */}
        <div className="p-6 border-b border-border">
          <label className="block mb-3 font-semibold text-foreground">Total ETH to Spend</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#FBBF23]">
              <FaEthereum className="w-6 h-6" />
            </div>
            <input
              type="number"
              step="0.001"
              min="0"
              value={ethAmount}
              onChange={(e) => setEthAmount(e.target.value)}
              className="w-full pl-14 pr-4 py-4 text-xl font-semibold border rounded-xl transition-colors bg-background text-foreground border-input focus:outline-none focus:border-[#FBBF23]"
              placeholder="0.01"
            />
          </div>
          {selectedCount > 0 && (
            <p className="text-sm mt-2 text-muted-foreground">
              ≈ {ethPerCoin.toFixed(6)} ETH per coin ({selectedCount} selected)
            </p>
          )}
          {error && (
            <p className="flex items-center gap-2 text-sm mt-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4" />
              {error}
            </p>
          )}
        </div>

        {/* Content Coins List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">
              Select Creators ({selectedCount}/{contentCoins.length})
            </h3>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="px-3 py-1.5 text-xs rounded-lg transition-colors bg-secondary text-secondary-foreground hover:bg-secondary/80"
              >
                Select All
              </button>
              <button
                onClick={deselectAll}
                className="px-3 py-1.5 text-xs rounded-lg transition-colors bg-secondary text-secondary-foreground hover:bg-secondary/80"
              >
                Clear
              </button>
            </div>
          </div>

          {contentCoins.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No content coins available in feed
            </div>
          ) : (
            <div className="space-y-2">
              {contentCoins.map((item) => {
                const isSelected = selectedItems.has(item.id);
                // Safely compute badge flags with explicit null checks
                const isGnarsPaired = 
                  item.poolCurrencyTokenAddress != null &&
                  item.poolCurrencyTokenAddress.toLowerCase() === GNARS_CREATOR_COIN.toLowerCase();
                const isSkatehive = 
                  item.platformReferrer != null &&
                  item.platformReferrer.toLowerCase() === SKATEHIVE_REFERRER.toLowerCase();
                
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={`w-full p-4 border rounded-xl transition-all flex items-center gap-4 ${
                      isSelected
                        ? "border-[#FBBF23] bg-amber-50 dark:bg-amber-900/20"
                        : "border-border bg-muted/50 hover:bg-muted"
                    }`}
                  >
                    {/* Checkbox */}
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        isSelected
                          ? "bg-[#FBBF23] border-[#FBBF23]"
                          : "border-white/30"
                      }`}
                    >
                      {isSelected && (
                        <svg
                          className="w-3 h-3 text-black"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>

                    {/* Thumbnail */}
                    <div className="relative w-12 h-12 overflow-hidden rounded-lg flex-shrink-0 bg-muted">
                      <Image
                        src={item.imageUrl || "/gnars.webp"}
                        alt={item.title}
                        fill
                        className="object-cover"
                      />
                      {/* Badges for Gnars paired and/or SkateHive referred */}
                      {isGnarsPaired && (
                        <div className="absolute bottom-0 right-0 w-5 h-5 rounded-tl-md bg-white dark:bg-black border-l border-t border-border flex items-center justify-center z-10">
                          <Image
                            src="/gnars.webp"
                            alt="Gnars paired"
                            width={16}
                            height={16}
                            className="object-contain"
                          />
                        </div>
                      )}
                      {isSkatehive && (
                        <div className={`absolute bottom-0 w-5 h-5 rounded-tl-md bg-white dark:bg-black border-l border-t border-border flex items-center justify-center z-10 ${
                          isGnarsPaired ? "right-5" : "right-0"
                        }`}>
                          <span className="text-xs">🛹</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 text-left">
                      <h4 className="text-sm font-medium line-clamp-1 text-foreground">
                        {item.title}
                      </h4>
                      <p className="text-xs line-clamp-1 text-muted-foreground">
                        {item.creatorName || item.creator}
                      </p>
                    </div>

                    {/* Amount Preview */}
                    {isSelected && (
                      <div className="text-right">
                        <p className="text-[#FBBF23] font-semibold text-sm flex items-center gap-1">
                          <FaEthereum className="w-3 h-3" />
                          {ethPerCoin.toFixed(6)}
                        </p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Investment</p>
              <p className="flex items-center gap-2 text-2xl font-bold text-[#FBBF23] dark:text-[#FBBF23]">
                <FaEthereum className="w-5 h-5" />
                {ethAmount} ETH
              </p>
            </div>
            <div className="text-right text-muted-foreground">
              <p className="text-sm">{selectedCount} creators selected</p>
              <p className="text-xs">≈ {ethPerCoin.toFixed(6)} ETH each</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 px-6 py-3 font-medium rounded-xl transition-all bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              Cancel
            </button>
            <button
              onClick={handleProceedToConfirm}
              disabled={selectedCount === 0}
              className={`flex-1 px-6 py-3 font-medium rounded-xl transition-all ${
                selectedCount > 0
                  ? "text-black bg-[#FBBF23] hover:bg-[#F59E0B] dark:bg-[#FBBF23] dark:hover:bg-[#F59E0B]"
                  : "cursor-not-allowed bg-muted text-muted-foreground"
              }`}
            >
              Review Purchase
            </button>
          </div>
        </div>
      </>
    );
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 dark:bg-black/80"
      onClick={(e) => {
        if (e.target === e.currentTarget && step !== "executing") {
          handleClose();
        }
      }}
    >
      <div className="flex flex-col w-full max-w-3xl max-h-[90vh] rounded-lg border shadow-lg bg-background border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {step === "confirm" && "Confirm Purchase"}
              {step === "executing" && "Processing..."}
              {step === "success" && "Success!"}
              {step === "error" && "Error"}
              {step === "select" && "Buy Content Coins"}
            </h2>
            {(step === "select" || step === "confirm") && (
              <p className="text-muted-foreground text-sm mt-1">
                {displayStrategyName ? (
                  <span>
                    <strong className="text-[#FBBF23]">{displayStrategyName}</strong> strategy
                  </span>
                ) : (
                  step === "select" ? "Select creators to support with your ETH" : ""
                )}
              </p>
            )}
          </div>
          {step !== "executing" && (
            <button
              onClick={handleClose}
              className="flex items-center justify-center w-10 h-10 rounded-full transition-all text-foreground bg-accent hover:bg-accent/80"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Dynamic Content */}
        {renderContent()}
      </div>

      {/* Share Strategy Dialog */}
      {showShareDialog && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-10">
          <div className="bg-background border border-border rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-foreground mb-4">Share Your Strategy</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Give your selection a name and share it with others!
            </p>
            <input
              type="text"
              value={strategyName}
              onChange={(e) => setStrategyName(e.target.value)}
              placeholder="e.g., SkateHive Crew, Gnars Squad..."
              className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#FBBF23] mb-4"
              autoFocus
            />
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowShareDialog(false);
                  setStrategyName("");
                  setError(null);
                }}
                className="flex-1 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateShareLink}
                className="flex-1 px-4 py-2 rounded-xl bg-[#FBBF23] text-black hover:bg-[#F59E0B] transition-all font-medium"
              >
                Copy Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
