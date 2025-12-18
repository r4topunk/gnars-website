"use client";

import { X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { FaEthereum } from "react-icons/fa";
import { parseEther } from "viem";
import type { TVItem } from "./types";
import { useBatchCoinPurchase } from "@/hooks/use-batch-coin-purchase";

type ModalStep = "select" | "confirm" | "executing" | "success" | "error";

interface BuyAllModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: TVItem[];
}

/**
 * Modal for buying multiple content coins in bulk
 */
export function BuyAllModal({ isOpen, onClose, items }: BuyAllModalProps) {
  const [mounted, setMounted] = useState(false);
  const [ethAmount, setEthAmount] = useState("0.01");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<ModalStep>("select");
  const [error, setError] = useState<string | null>(null);

  // Filter to only coins (not droposals) and take first 20
  const contentCoins = useMemo(() => {
    return items
      .filter((item) => item.coinAddress && !item.tokenAddress)
      .slice(0, 20);
  }, [items]);

  // Selected coins with amounts
  const selectedCoins = useMemo(() => {
    const totalEth = parseEther(ethAmount || "0");
    const ethPerCoin = selectedItems.size > 0 ? totalEth / BigInt(selectedItems.size) : 0n;
    
    return contentCoins
      .filter((item) => selectedItems.has(item.id))
      .map((item) => ({
        address: item.coinAddress as `0x${string}`,
        ethAmount: ethPerCoin,
      }));
  }, [contentCoins, selectedItems, ethAmount]);

  // Initialize batch purchase hook (sequential swaps - works with any wallet)
  const {
    executeBatchPurchase,
    isPreparing,
    isPending,
    isConfirmed,
    error: txError,
    id,
    currentSwapIndex,
    totalSwaps,
    completedSwaps,
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
  useEffect(() => {
    if (isOpen && contentCoins.length > 0) {
      // Prefer paired coins (those with poolCurrencyTokenAddress)
      const pairedCoins = contentCoins.filter((item) => item.poolCurrencyTokenAddress);
      const unpairedCoins = contentCoins.filter((item) => !item.poolCurrencyTokenAddress);
      const sortedCoins = [...pairedCoins, ...unpairedCoins];
      
      const preSelected = new Set(sortedCoins.slice(0, 10).map((item) => item.id));
      setSelectedItems(preSelected);
      setStep("select");
      setError(null);
    }
  }, [isOpen, contentCoins]);

  // Ensure component is mounted (client-side only for portal)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

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
    } catch (err) {
      // Error handling done in hook callbacks
    }
  };

  const handleClose = () => {
    if (step === "executing" || isPreparing || isPending) {
      return; // Don't allow closing during transaction
    }
    setStep("select");
    setError(null);
    onClose();
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
            You successfully purchased {selectedCount} content coins
          </p>
          {id && (
            <p className="text-xs font-mono text-muted-foreground/60">
              Batch ID: {String(id).slice(0, 8)}...{String(id).slice(-8)}
            </p>
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
            {isPreparing && "Preparing swaps..."}
            {isPending && `Purchasing coin ${currentSwapIndex + 1} of ${totalSwaps}...`}
            {!isPreparing && !isPending && "Processing..."}
          </h3>
          <p className="text-center text-muted-foreground">
            {isPending && `${completedSwaps} of ${totalSwaps} completed`}
            {!isPending && "Generating swap data for each coin"}
          </p>
        </div>
      );
    }

    // Confirmation State
    if (step === "confirm") {
      return (
        <>
          <div className="flex-1 overflow-y-auto p-6">
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

            <div className="p-4 border rounded-xl bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
              <p className="text-sm text-foreground">
                💡 <strong>Note:</strong> This will execute {selectedCount} purchases in a single
                transaction. Gas fees will be optimized for the batch.
              </p>
            </div>
          </div>

          <div className="p-6 border-t border-border">
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
            {step === "select" && (
              <p className="text-muted-foreground text-sm mt-1">
                Select creators to support with your ETH
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
    </div>,
    document.body
  );
}
