"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, LogOut, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { useAccount, useDisconnect } from "wagmi";
import { AddressDisplay } from "@/components/ui/address-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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
 * Responsive wallet panel triggered from the header avatar.
 *
 * - Desktop (md+): centered Dialog modal
 * - Mobile (< md): bottom vaul Drawer
 *
 * Hydration-safe: the trigger button is rendered on the server, the
 * Dialog/Drawer wrapper only mounts after the first effect so the SSR
 * HTML matches the initial client render. Both wrappers render no DOM
 * when closed, so the responsive switch is invisible.
 */
export function WalletDrawer() {
  const { address, isConnected } = useAccount();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!isConnected || !address) return null;

  const triggerButton = (
    <Button
      size="sm"
      variant="ghost"
      className="w-full cursor-pointer"
      onClick={() => setOpen(true)}
    >
      <span className="hidden md:inline">
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
      <span className="md:hidden">{shortAddress(address)}</span>
    </Button>
  );

  if (!mounted) {
    return triggerButton;
  }

  return (
    <>
      {triggerButton}
      {isDesktop ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-sm p-0 gap-0">
            <DialogHeader className="sr-only">
              <DialogTitle>Connected wallet</DialogTitle>
              <DialogDescription>
                Wallet details, voting status, and account actions
              </DialogDescription>
            </DialogHeader>
            <WalletPanelBody address={address} closePanel={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent>
            <DrawerHeader className="sr-only">
              <DrawerTitle>Connected wallet</DrawerTitle>
              <DrawerDescription>
                Wallet details, voting status, and account actions
              </DrawerDescription>
            </DrawerHeader>
            <WalletPanelBody address={address} closePanel={() => setOpen(false)} />
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}

interface WalletPanelBodyProps {
  address: `0x${string}`;
  closePanel: () => void;
}

function WalletPanelBody({ address, closePanel }: WalletPanelBodyProps) {
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const bridge = useThirdwebWallet();
  const status = useDelegationStatus();

  const eoaDelegate = useEoaDelegate({
    onSuccess: () => {
      toast.success("Voting power delegated to your smart account");
      closePanel();
    },
  });
  const isDelegationInFlight = eoaDelegate.isPending || eoaDelegate.isConfirming;

  const showSmartAccount = bridge.isSmartAccount && Boolean(status.smartAccountAddress);

  const totalGnars =
    showSmartAccount && status.smartAccountTokenBalance !== undefined
      ? (status.eoaTokenBalance ?? 0n) + status.smartAccountTokenBalance
      : status.eoaTokenBalance;

  const handleCopyAddress = async (addr: string, label: string) => {
    try {
      await navigator.clipboard.writeText(addr);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed");
    }
  };

  const handleProfile = () => {
    closePanel();
    router.push(`/members/${address}`);
  };

  const handleDisconnect = () => {
    try {
      disconnect();
      closePanel();
      toast("Disconnected");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message ?? "Failed to disconnect")
          : "Failed to disconnect";
      toast.error("Disconnect failed", { description: message });
    }
  };

  const handleDelegateToSmart = async () => {
    if (!status.smartAccountAddress) return;
    await eoaDelegate.delegate(status.smartAccountAddress);
  };

  return (
    <div className="flex flex-col">
      {/* Identity header */}
      <div className="px-5 pt-5 pb-4">
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

      <Separator />

      {/* Two-column metadata table — labels on left, values on right */}
      <div className="px-5 py-4 space-y-3 text-sm">
        <Row
          label="Wallet"
          value={
            <CopyValue
              addr={address}
              onCopy={() => handleCopyAddress(address, "Wallet address")}
            />
          }
        />

        {showSmartAccount && status.smartAccountAddress ? (
          <Row
            label={
              <span className="flex items-center gap-1.5">
                Smart account
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-normal">
                  gasless
                </Badge>
              </span>
            }
            value={
              <CopyValue
                addr={status.smartAccountAddress}
                onCopy={() =>
                  handleCopyAddress(status.smartAccountAddress!, "Smart account address")
                }
              />
            }
          />
        ) : null}

        <Row
          label="Gnars"
          value={
            <span className="font-medium tabular-nums">
              {totalGnars !== undefined ? totalGnars.toString() : "—"}
              {showSmartAccount &&
              status.smartAccountTokenBalance !== undefined &&
              status.smartAccountTokenBalance > 0n ? (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({status.eoaTokenBalance?.toString() ?? "0"} +{" "}
                  {status.smartAccountTokenBalance.toString()})
                </span>
              ) : null}
            </span>
          }
        />

        <Row
          label="Voting"
          value={
            status.isDelegatedToSmartAccount ? (
              <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                <Check className="size-3.5" />
                Delegated
              </span>
            ) : status.needsSmartAccountDelegation ? (
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <Sparkles className="size-3.5" />
                Action needed
              </span>
            ) : status.isDelegatedToSelf ? (
              <span className="text-muted-foreground">Self</span>
            ) : status.currentDelegate ? (
              <span className="text-muted-foreground">{shortAddress(status.currentDelegate)}</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )
          }
        />
      </div>

      {/* Inline delegation CTA — only when needed */}
      {status.needsSmartAccountDelegation ? (
        <>
          <Separator />
          <div className="px-5 py-4 space-y-2">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Delegate the voting power of your{" "}
              <span className="text-foreground font-medium">
                {status.eoaTokenBalance?.toString() ?? "0"}{" "}
                {status.eoaTokenBalance === 1n ? "Gnar" : "Gnars"}
              </span>{" "}
              so you can vote through your smart account.
            </p>
            <Button
              size="sm"
              className="w-full"
              onClick={handleDelegateToSmart}
              disabled={isDelegationInFlight || !status.smartAccountAddress}
            >
              {isDelegationInFlight ? "Delegating…" : "Delegate voting power"}
            </Button>
          </div>
        </>
      ) : null}

      <Separator />

      {/* Actions — both ghost buttons, identical shape, just different intent */}
      <div className="p-2">
        <button
          type="button"
          onClick={handleProfile}
          className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
        >
          <User className="size-4 text-muted-foreground" />
          Profile
        </button>
        <button
          type="button"
          onClick={handleDisconnect}
          className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="size-4" />
          Disconnect
        </button>
      </div>
    </div>
  );
}

interface RowProps {
  label: React.ReactNode;
  value: React.ReactNode;
}

function Row({ label, value }: RowProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

interface CopyValueProps {
  addr: string;
  onCopy: () => void;
}

function CopyValue({ addr, onCopy }: CopyValueProps) {
  return (
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex items-center gap-1.5 font-mono text-xs hover:text-foreground transition-colors text-muted-foreground"
    >
      <span>{shortAddress(addr)}</span>
      <Copy className="size-3 opacity-60" />
    </button>
  );
}
