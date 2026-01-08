/**
 * DelegationModal - Display and manage NFT voting delegation
 *
 * Shows current delegation status and allows users to change their delegate.
 * Integrates with Gnars token contract for delegation transactions.
 *
 * Public surface:
 * - Display current delegate address
 * - Self-delegation indicator
 * - Change delegation action with transaction handling
 *
 * Accessibility:
 * - Keyboard navigation
 * - ARIA labels for dialog
 */

"use client";

import * as React from "react";
import { Copy, ExternalLink, Loader2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Address } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import { GNARS_ADDRESSES } from "@/lib/config";
import { useVotes } from "@/hooks/useVotes";
import { useDelegate } from "@/hooks/useDelegate";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface DelegationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDelegateAddress?: string;
}

export function DelegationModal({ open, onOpenChange, initialDelegateAddress }: DelegationModalProps) {
  const { address, isConnected } = useAccount();
  const [delegateAddress, setDelegateAddress] = React.useState("");
  const [isChanging, setIsChanging] = React.useState(false);

  // Read token balance - only when modal is open
  const { data: balanceData } = useReadContracts({
    contracts: [
      {
        address: GNARS_ADDRESSES.token as Address,
        abi: [
          {
            name: "balanceOf",
            type: "function",
            stateMutability: "view",
            inputs: [{ name: "owner", type: "address" }],
            outputs: [{ name: "", type: "uint256" }],
          },
        ] as const,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
        chainId: 8453,
      },
    ],
    query: {
      enabled: open && Boolean(address),
      refetchInterval: false,
    },
  });

  const tokenBalance = balanceData?.[0]?.result ?? 0n;

  // Fetch voting data - only when modal is open
  const votesData = useVotes({
    chainId: 8453,
    collectionAddress: GNARS_ADDRESSES.token as Address,
    governorAddress: GNARS_ADDRESSES.governor as Address,
    signerAddress: address,
    enabled: open,
  });

  // Delegation hook
  const { delegate, isPending, isConfirming, isConfirmed, pendingHash } = useDelegate({
    onSuccess: (txHash, delegatee) => {
      toast.success("Delegation updated!", {
        description: `Successfully delegated to ${formatAddress(delegatee)}`,
      });
      setIsChanging(false);
      // Keep modal open to show confirmation
      setTimeout(() => {
        onOpenChange(false);
      }, 2000);
    },
  });

  const currentDelegate = votesData.delegatedTo;
  const isSelfDelegated = currentDelegate?.toLowerCase() === address?.toLowerCase();
  const votingPower = votesData.votes;

  React.useEffect(() => {
    if (initialDelegateAddress) {
      console.log("[DelegationModal] Setting delegate address to initial address:", initialDelegateAddress);
      setDelegateAddress(initialDelegateAddress);
      setIsChanging(true); // Auto-open the change form when pre-filled
    } else if (address) {
      console.log("[DelegationModal] Setting delegate address to user address:", address);
      setDelegateAddress(address);
    }
  }, [address, initialDelegateAddress]);

  // Reset changing state when modal closes
  React.useEffect(() => {
    if (!open) {
      setIsChanging(false);
    }
  }, [open]);

  const handleCopyAddress = React.useCallback((addr: string) => {
    navigator.clipboard.writeText(addr);
    toast.success("Address copied to clipboard");
  }, []);

  const handleDelegate = React.useCallback(async () => {
    console.log("[DelegationModal] handleDelegate called:", {
      delegateAddress,
      currentDelegate,
      addressLength: delegateAddress.length,
      tokenBalance: tokenBalance.toString(),
      votingPower: votingPower?.toString(),
    });

    if (!delegateAddress || delegateAddress.length !== 42) {
      console.warn("[DelegationModal] Invalid address format");
      toast.error("Invalid address", { description: "Please enter a valid Ethereum address" });
      return;
    }

    // Warn if no tokens owned
    if (tokenBalance === 0n) {
      console.warn("[DelegationModal] User has no Gnars tokens:", {
        tokenBalance: tokenBalance.toString(),
        votingPower: votingPower?.toString(),
      });
      toast.error("No tokens to delegate", {
        description: "You don't own any Gnars NFTs. Delegation requires owning at least one token.",
      });
      return;
    }

    // Check if already delegated to this address
    if (delegateAddress.toLowerCase() === currentDelegate?.toLowerCase()) {
      console.log("[DelegationModal] Already delegated to this address");
      toast.info("Already delegated", {
        description: "You are already delegated to this address.",
      });
      return;
    }

    console.log("[DelegationModal] Calling delegate function...");
    await delegate(delegateAddress);
  }, [delegateAddress, currentDelegate, delegate, tokenBalance, votingPower]);

  const handleCancelDelegation = React.useCallback(async () => {
    if (!address) {
      toast.error("Unable to cancel delegation", { description: "Wallet address not found" });
      return;
    }

    // Warn if no tokens owned
    if (tokenBalance === 0n) {
      console.warn("[DelegationModal] User has no Gnars tokens");
      toast.error("No tokens to delegate", {
        description: "You don't own any Gnars NFTs. Delegation requires owning at least one token.",
      });
      return;
    }

    console.log("[DelegationModal] Canceling delegation - delegating back to self:", address);
    await delegate(address);
  }, [address, delegate, tokenBalance]);

  const formatAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!isConnected) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Delegation</DialogTitle>
            <DialogDescription>
              Connect your wallet to view and manage your voting delegation.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <div className="rounded-full bg-muted p-4">
              <UserCheck className="size-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Wallet connection required
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Voting Delegation</DialogTitle>
          <DialogDescription> 
              Delegating allows someone else to vote with your NFTs while you retain ownership.
              This doesn&apos;t transfer your tokens.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-4">
          {/* Token Balance Display */}
          <div className="flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/20 p-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                Gnars NFTs Owned
              </span>
              <span className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {tokenBalance.toString()} {tokenBalance === 1n ? "NFT" : "NFTs"}
              </span>
            </div>
          </div>

          {/* Voting Power Display */}
          {votingPower !== undefined && votingPower > 0n && (
            <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20 p-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                  Your Voting Power
                </span>
                <span className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {votingPower.toString()} {votingPower === 1n ? "vote" : "votes"}
                </span>
              </div>
            </div>
          )}

          {/* Current Delegation Status */}
          <div className="flex flex-col gap-3">
            <Label className="text-sm font-medium">Current Delegate</Label>
            <div
              className={cn(
                "flex items-center justify-between rounded-lg border p-4",
                isSelfDelegated && "border-green-500/50 bg-green-50 dark:bg-green-950/20",
              )}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono">{formatAddress(currentDelegate || "")}</span>
                  {isSelfDelegated && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-300">
                      <UserCheck className="size-3" />
                      Self
                    </span>
                  )}
                </div>
                {isSelfDelegated ? (
                  <p className="text-xs text-muted-foreground">
                    You are voting with your own NFTs
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Your votes are delegated to another address
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleCopyAddress(currentDelegate || "")}
                disabled={!currentDelegate}
              >
                <Copy className="size-4" />
                <span className="sr-only">Copy address</span>
              </Button>
            </div>
          </div>



          {/* Change Delegation */}
          {isChanging ? (
            <div className="flex flex-col gap-3">
              <Label htmlFor="delegate-address" className="text-sm font-medium">
                New Delegate Address
              </Label>
              <Input
                id="delegate-address"
                placeholder="0x..."
                value={delegateAddress}
                onChange={(e) => setDelegateAddress(e.target.value)}
                className="font-mono text-sm"
                disabled={isPending || isConfirming}
              />
              <p className="text-xs text-muted-foreground">
                Enter the Ethereum address you want to delegate your voting power to
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {!isSelfDelegated && (
                <Button
                  variant="default"
                  className="w-full"
                  onClick={handleCancelDelegation}
                  disabled={isPending || isConfirming}
                >
                  {isPending || isConfirming ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Canceling...
                    </>
                  ) : (
                    "Cancel Delegation"
                  )}
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsChanging(true)}
                disabled={isPending || isConfirming}
              >
                Change Delegate
              </Button>
            </div>
          )}

          {/* Transaction Status */}
          {pendingHash && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 p-3 text-sm">
              {isConfirming ? (
                <>
                  <Loader2 className="size-4 animate-spin text-amber-600 dark:text-amber-400" />
                  <span className="text-amber-900 dark:text-amber-100">Confirming transaction...</span>
                </>
              ) : isConfirmed ? (
                <span className="text-green-900 dark:text-green-100">✓ Transaction confirmed!</span>
              ) : (
                <span className="text-amber-900 dark:text-amber-100">Transaction submitted</span>
              )}
            </div>
          )}
        </div>

        {isChanging && (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setIsChanging(false)}
              disabled={isPending || isConfirming}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelegate}
              disabled={!delegateAddress || delegateAddress.length !== 42 || isPending || isConfirming}
            >
              {isPending || isConfirming ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  {isConfirming ? "Confirming..." : "Submitting..."}
                </>
              ) : (
                "Update Delegation"
              )}
            </Button>
          </DialogFooter>
        )}

        {/* Transaction Link & Docs */}
        <div className="border-t pt-4 flex flex-col gap-2">
          {pendingHash && (
            <a
              href={`https://basescan.org/tx/${pendingHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              <ExternalLink className="size-3" />
              View transaction on Basescan
            </a>
          )}
          <a
            href="https://docs.nouns.wtf/nouns-dao/governance/delegate"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="size-3" />
            Learn more about delegation
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
