"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDelegationStatus } from "@/hooks/use-delegation-status";
import { useEoaDelegate } from "@/hooks/use-eoa-delegate";

const STORAGE_PREFIX = "gnars:aa-welcome-dismissed:";

function buildStorageKey(eoa: string) {
  return `${STORAGE_PREFIX}${eoa.toLowerCase()}`;
}

/**
 * Mounts the account-abstraction migration prompts at app root:
 *
 * 1. AAWelcomeModal — shown once per EOA when AA is enabled, the EOA
 *    holds Gnars, and the EOA hasn't delegated voting power to its
 *    smart account. Explains what changed in plain language and offers
 *    a one-tap "Delegate and continue" CTA.
 *
 * 2. AADelegationBanner — persistent thin banner shown after the modal
 *    has been dismissed but before delegation has happened. Acts as a
 *    quiet safety net so the user is never blocked but never forgets.
 *
 * Both are gated by useDelegationStatus.needsSmartAccountDelegation, so
 * everything disappears the moment the delegation lands onchain. The
 * dismissal flag is keyed on the EOA address so each wallet sees the
 * modal at most once.
 */
export function AAOnboarding() {
  const status = useDelegationStatus();
  const [hasSeenWelcome, setHasSeenWelcome] = useState(true); // assume seen until storage check
  const [storageReady, setStorageReady] = useState(false);

  const storageKey = useMemo(
    () => (status.eoaAddress ? buildStorageKey(status.eoaAddress) : null),
    [status.eoaAddress],
  );

  // Read dismissal state from localStorage once per EOA change
  useEffect(() => {
    if (typeof window === "undefined" || !storageKey) {
      setStorageReady(false);
      return;
    }
    try {
      setHasSeenWelcome(window.localStorage.getItem(storageKey) === "true");
    } catch {
      setHasSeenWelcome(true); // bail on storage errors
    }
    setStorageReady(true);
  }, [storageKey]);

  const dismissWelcome = useCallback(() => {
    if (typeof window !== "undefined" && storageKey) {
      try {
        window.localStorage.setItem(storageKey, "true");
      } catch {
        // ignore
      }
    }
    setHasSeenWelcome(true);
  }, [storageKey]);

  const eoaDelegate = useEoaDelegate({
    onSuccess: () => {
      // Only dismiss the welcome modal on a successful delegation — if
      // the user cancelled the wallet prompt or the tx reverted, keep
      // the modal open so they can retry without being demoted to the
      // smaller banner.
      dismissWelcome();
    },
  });

  const isDelegating = eoaDelegate.isPending || eoaDelegate.isConfirming;

  const handleDelegateAndContinue = useCallback(async () => {
    if (!status.smartAccountAddress) return;
    await eoaDelegate.delegate(status.smartAccountAddress);
    // dismissWelcome is fired from the onSuccess callback above so a
    // failed/cancelled tx leaves the modal in place.
  }, [status.smartAccountAddress, eoaDelegate]);

  // Visibility: only matters once we've finished reading storage and
  // the bridge has resolved enough state to know if delegation is needed.
  const needs = status.needsSmartAccountDelegation;
  const showWelcomeModal = needs && storageReady && !hasSeenWelcome;
  const showBanner = needs && storageReady && hasSeenWelcome;

  return (
    <>
      <AAWelcomeModal
        open={showWelcomeModal}
        onDismiss={dismissWelcome}
        onDelegate={handleDelegateAndContinue}
        eoaTokenBalance={status.eoaTokenBalance}
        isDelegating={isDelegating}
      />
      {showBanner ? (
        <AADelegationBanner
          eoaTokenBalance={status.eoaTokenBalance}
          isDelegating={isDelegating}
          onDelegate={handleDelegateAndContinue}
        />
      ) : null}
    </>
  );
}

interface AAWelcomeModalProps {
  open: boolean;
  onDismiss: () => void;
  onDelegate: () => void | Promise<void>;
  eoaTokenBalance: bigint | undefined;
  isDelegating: boolean;
}

function AAWelcomeModal({
  open,
  onDismiss,
  onDelegate,
  eoaTokenBalance,
  isDelegating,
}: AAWelcomeModalProps) {
  const balanceLabel = eoaTokenBalance !== undefined ? eoaTokenBalance.toString() : "your";
  const noun = eoaTokenBalance === 1n ? "Gnar" : "Gnars";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onDismiss();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-amber-500" />
            <DialogTitle>Gnars is now gasless</DialogTitle>
          </div>
          <DialogDescription className="pt-2 leading-relaxed">
            We added a smart account on top of your wallet. Your {balanceLabel} {noun} stay where
            they are — nothing moved. Your smart account signs transactions on your behalf and the
            DAO covers the gas.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.04] p-4 space-y-1">
          <div className="text-sm font-medium">One-time setup</div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Delegate the voting power of your {noun} to your smart account so you can vote through
            the new flow. Roughly $0.001 paid from your wallet. You can do it later from the wallet
            menu.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={onDismiss} disabled={isDelegating}>
            Maybe later
          </Button>
          <Button onClick={() => void onDelegate()} disabled={isDelegating}>
            {isDelegating ? "Delegating…" : "Delegate and continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AADelegationBannerProps {
  eoaTokenBalance: bigint | undefined;
  isDelegating: boolean;
  onDelegate: () => void | Promise<void>;
}

function AADelegationBanner({
  eoaTokenBalance,
  isDelegating,
  onDelegate,
}: AADelegationBannerProps) {
  const balanceLabel = eoaTokenBalance !== undefined ? eoaTokenBalance.toString() : "your";
  const noun = eoaTokenBalance === 1n ? "Gnar" : "Gnars";

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/[0.06]">
      <div className="max-w-6xl mx-auto px-4 py-2 flex flex-wrap items-center gap-3">
        <Sparkles className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="text-xs sm:text-sm text-foreground/80 flex-1 min-w-[12rem]">
          You hold {balanceLabel} {noun} at your wallet. Delegate voting power to your smart
          account to vote.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => void onDelegate()}
          disabled={isDelegating}
        >
          {isDelegating ? "Delegating…" : "Delegate now"}
        </Button>
      </div>
    </div>
  );
}
