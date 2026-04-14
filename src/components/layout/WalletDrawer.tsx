"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, LogOut, User } from "lucide-react";
import { toast } from "sonner";
import { useAccount, useDisconnect } from "wagmi";
import { AddressDisplay } from "@/components/ui/address-display";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
 * Hydration-safe: trigger button renders on the server; the wrapper only
 * mounts after first effect so SSR HTML matches the initial client render.
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
          <DialogContent className="sm:max-w-sm gap-0 p-0">
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
      <div className="px-6 pt-6 pb-4">
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

      <div className="px-6 py-4 space-y-3 text-sm">
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
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Check className="size-3.5" />
                Delegated
              </span>
            ) : status.needsSmartAccountDelegation ? (
              <Badge variant="outline">Action needed</Badge>
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

      {status.needsSmartAccountDelegation ? (
        <>
          <Separator />
          <div className="px-6 py-4">
            <Alert>
              <AlertTitle>Action needed</AlertTitle>
              <AlertDescription>
                <p>
                  Delegate the voting power of your{" "}
                  <span className="font-medium text-foreground">
                    {status.eoaTokenBalance?.toString() ?? "0"}{" "}
                    {status.eoaTokenBalance === 1n ? "Gnar" : "Gnars"}
                  </span>{" "}
                  so you can vote through your smart account.
                </p>
                <Button
                  size="sm"
                  className="mt-2 w-full"
                  onClick={handleDelegateToSmart}
                  disabled={isDelegationInFlight || !status.smartAccountAddress}
                >
                  {isDelegationInFlight ? "Delegating…" : "Delegate voting power"}
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        </>
      ) : null}

      <Separator />

      <div className="flex flex-col gap-2 p-4 sm:flex-row sm:justify-end sm:p-6 sm:pt-4">
        <Button variant="outline" onClick={handleProfile}>
          <User />
          Profile
        </Button>
        <Button variant="destructive" onClick={handleDisconnect}>
          <LogOut />
          Disconnect
        </Button>
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
      className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      <span>{shortAddress(addr)}</span>
      <Copy className="size-3 opacity-60" />
    </button>
  );
}
