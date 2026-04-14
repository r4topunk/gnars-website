"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, LogOut, User } from "lucide-react";
import { toast } from "sonner";
import { useAccount, useDisconnect } from "wagmi";
import { AddressDisplay } from "@/components/ui/address-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useDelegationStatus } from "@/hooks/use-delegation-status";
import { useEoaDelegate } from "@/hooks/use-eoa-delegate";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useThirdwebWallet } from "@/hooks/use-thirdweb-wallet";

function shortAddress(addr: string | undefined) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/**
 * Replaces the old DropdownMenu wallet popover with a responsive drawer
 * that surfaces every detail an existing Gnars holder needs to make
 * sense of the new smart account: which addresses they have, where
 * their NFTs live, where their voting power flows, and a one-click
 * delegate-to-smart-account CTA when delegation is missing.
 *
 * Sheet from the right on >= sm screens, from the bottom on mobile
 * (chosen via useMediaQuery so the swap respects user preference for a
 * mobile drawer).
 */
export function WalletDrawer() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const [open, setOpen] = useState(false);

  const bridge = useThirdwebWallet();
  const status = useDelegationStatus();
  const eoaDelegate = useEoaDelegate({
    onSuccess: () => {
      toast.success("Voting power delegated to your smart account");
      setOpen(false);
    },
  });

  const isDelegationInFlight = eoaDelegate.isPending || eoaDelegate.isConfirming;

  if (!isConnected || !address) return null;

  const handleCopyAddress = (addr: string, label: string) => {
    navigator.clipboard.writeText(addr);
    toast.success(`${label} copied`);
  };

  const handleDelegateToSmart = async () => {
    if (!status.smartAccountAddress) return;
    await eoaDelegate.delegate(status.smartAccountAddress);
  };

  const handleProfile = () => {
    setOpen(false);
    router.push(`/members/${address}`);
  };

  const handleDisconnect = () => {
    try {
      disconnect();
      setOpen(false);
      toast("Disconnected");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message ?? "Failed to disconnect")
          : "Failed to disconnect";
      toast.error("Disconnect failed", { description: message });
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="ghost" className="w-full cursor-pointer">
          <span className="hidden sm:inline">
            <AddressDisplay
              address={address}
              variant="compact"
              avatarSize="sm"
              showAvatar={true}
              showENS={true}
              showCopy={false}
              showExplorer={false}
              onAddressClick={() => {}}
            />
          </span>
          <span className="sm:hidden">{shortAddress(address)}</span>
        </Button>
      </SheetTrigger>

      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        className={isDesktop ? "w-full sm:max-w-md" : "h-[85vh]"}
      >
        <SheetHeader>
          {/* Visually hide the title to keep semantic h2 for screen readers
              while we render the avatar+ENS as a sibling — putting a div
              (AddressDisplay) inside <h2> is invalid HTML. */}
          <SheetTitle className="sr-only">Connected wallet</SheetTitle>
          <SheetDescription className="sr-only">
            Wallet details, voting status, and account actions
          </SheetDescription>
          <div className="pr-8">
            <AddressDisplay
              address={address}
              variant="compact"
              avatarSize="md"
              showAvatar={true}
              showENS={true}
              showCopy={false}
              showExplorer={false}
              onAddressClick={() => {}}
            />
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-5">
          {/* Wallet identity */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Wallet
            </h3>
            <button
              type="button"
              className="w-full flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent transition-colors text-left"
              onClick={() => handleCopyAddress(address, "Wallet address")}
            >
              <span className="font-mono text-sm">{shortAddress(address)}</span>
              <Copy className="size-4 text-muted-foreground" />
            </button>
          </section>

          {/* Smart account */}
          {bridge.isSmartAccount && status.smartAccountAddress ? (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                Smart account
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-normal">
                  gasless
                </Badge>
              </h3>
              <button
                type="button"
                className="w-full flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent transition-colors text-left"
                onClick={() =>
                  handleCopyAddress(status.smartAccountAddress!, "Smart account address")
                }
              >
                <span className="font-mono text-sm">
                  {shortAddress(status.smartAccountAddress)}
                </span>
                <Copy className="size-4 text-muted-foreground" />
              </button>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                A smart account that signs onchain actions on your behalf. Gas is sponsored by Gnars
                — every bid, vote, and mint is free.
              </p>
            </section>
          ) : null}

          <Separator />

          {/* Holdings */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Gnars
            </h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">At your wallet</span>
                <span className="font-medium">
                  {status.eoaTokenBalance !== undefined ? status.eoaTokenBalance.toString() : "—"}
                </span>
              </div>
              {bridge.isSmartAccount ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">At smart account</span>
                  <span className="font-medium">
                    {status.smartAccountTokenBalance !== undefined
                      ? status.smartAccountTokenBalance.toString()
                      : "—"}
                  </span>
                </div>
              ) : null}
            </div>
          </section>

          {/* Voting / delegation */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Voting
            </h3>
            {status.isDelegatedToSmartAccount ? (
              <div className="flex items-start gap-2 rounded-lg border border-green-500/30 bg-green-500/[0.04] p-3 text-sm">
                <Check className="size-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium">Delegated to smart account</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your votes flow through your smart account.
                  </p>
                </div>
              </div>
            ) : status.needsSmartAccountDelegation ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.04] p-3 space-y-3">
                <div className="text-sm">
                  <div className="font-medium">Action recommended</div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    You hold {status.eoaTokenBalance?.toString() ?? "0"}{" "}
                    {status.eoaTokenBalance === 1n ? "Gnar" : "Gnars"} at your wallet. Delegate the
                    voting power to your smart account so you can vote through the new flow.
                  </p>
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={handleDelegateToSmart}
                  disabled={isDelegationInFlight || !status.smartAccountAddress}
                >
                  {isDelegationInFlight ? "Delegating…" : "Delegate voting power"}
                </Button>
              </div>
            ) : status.isDelegatedToSelf ? (
              <p className="text-sm text-muted-foreground">
                Voting with your own NFTs ({shortAddress(status.currentDelegate)}).
              </p>
            ) : status.currentDelegate ? (
              <p className="text-sm text-muted-foreground">
                Delegated to {shortAddress(status.currentDelegate)}.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No delegation set yet.</p>
            )}
          </section>

          <Separator />

          {/* Actions */}
          <section className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={handleProfile}>
              <User className="mr-2 size-4" />
              Profile
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:bg-red-500/10 hover:text-red-600"
              onClick={handleDisconnect}
            >
              <LogOut className="mr-2 size-4" />
              Disconnect
            </Button>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
