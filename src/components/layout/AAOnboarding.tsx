"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useDelegationStatus } from "@/hooks/use-delegation-status";
import { useEoaDelegate } from "@/hooks/use-eoa-delegate";
import { useMediaQuery } from "@/hooks/use-media-query";

const STORAGE_PREFIX = "gnars:aa-welcome-dismissed:";

function buildStorageKey(eoa: string) {
  return `${STORAGE_PREFIX}${eoa.toLowerCase()}`;
}

/**
 * AA migration prompt at app root.
 *
 * AAWelcomeModal: Dialog (md+) / Drawer (mobile) shown once per EOA when
 * the user holds Gnars but hasn't delegated voting power to their smart
 * account. Dismissal is keyed on the EOA address in localStorage. After
 * dismissal the user can re-trigger the delegation flow from the wallet
 * panel (the delegation CTA there is still gated on needsSmartAccountDelegation).
 */
export function AAOnboarding() {
  const status = useDelegationStatus();
  const [hasSeenWelcome, setHasSeenWelcome] = useState(true);
  const [storageReady, setStorageReady] = useState(false);

  const storageKey = useMemo(
    () => (status.eoaAddress ? buildStorageKey(status.eoaAddress) : null),
    [status.eoaAddress],
  );

  useEffect(() => {
    if (typeof window === "undefined" || !storageKey) {
      setStorageReady(false);
      return;
    }
    try {
      setHasSeenWelcome(window.localStorage.getItem(storageKey) === "true");
    } catch {
      setHasSeenWelcome(true);
    }
    setStorageReady(true);
  }, [storageKey]);

  const dismissWelcome = useCallback(() => {
    if (typeof window !== "undefined" && storageKey) {
      try {
        window.localStorage.setItem(storageKey, "true");
      } catch {}
    }
    setHasSeenWelcome(true);
  }, [storageKey]);

  const eoaDelegate = useEoaDelegate({
    onSuccess: () => {
      dismissWelcome();
    },
  });

  const isDelegating = eoaDelegate.isPending || eoaDelegate.isConfirming;

  const handleDelegate = useCallback(async () => {
    if (!status.smartAccountAddress) return;
    await eoaDelegate.delegate(status.smartAccountAddress);
  }, [status.smartAccountAddress, eoaDelegate]);

  // Show once per EOA on first login when the user has Gnars but hasn't
  // delegated to their smart account. Dismiss persists in localStorage so
  // we never re-nag. If the user later decides they want sponsored gas,
  // the same "Delegate voting power" CTA lives in the WalletDrawer panel.
  const needs = status.needsSmartAccountDelegation;
  const showWelcomeModal = needs && storageReady && !hasSeenWelcome;

  return (
    <AAWelcomeModal
      open={showWelcomeModal}
      onDismiss={dismissWelcome}
      onDelegate={handleDelegate}
      eoaTokenBalance={status.eoaTokenBalance}
      isDelegating={isDelegating}
    />
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
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const balanceLabel = eoaTokenBalance !== undefined ? eoaTokenBalance.toString() : "your";
  const noun = eoaTokenBalance === 1n ? "Gnar" : "Gnars";

  const title = "Vote without paying gas";
  const description = `Your ${balanceLabel} ${noun} stay in your wallet. A smart account signs your votes and the DAO covers gas.`;

  const body = (
    <Alert>
      <AlertTitle>One-time setup</AlertTitle>
      <AlertDescription>
        Delegate the voting power of your {noun} to your smart account so you can vote through the
        new flow. You can always do this later from the wallet menu.
      </AlertDescription>
    </Alert>
  );

  const actions = (
    <>
      <Button variant="outline" onClick={onDismiss} disabled={isDelegating}>
        Maybe later
      </Button>
      <Button onClick={() => void onDelegate()} disabled={isDelegating}>
        {isDelegating ? "Delegating…" : "Delegate voting power"}
      </Button>
    </>
  );

  if (!mounted || isDesktop) {
    return (
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) onDismiss();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {body}
          <DialogFooter>{actions}</DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next) onDismiss();
      }}
    >
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>
        <div className="px-4">{body}</div>
        <DrawerFooter>{actions}</DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
