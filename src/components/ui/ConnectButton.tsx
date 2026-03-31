"use client";

import { useMemo, useState } from "react";
import { ChevronDown, LogOut, User, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAccount, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddressDisplay } from "@/components/ui/address-display";
import { toast } from "sonner";
import { ConnectWalletModal } from "@/components/auction/ConnectWalletModal";

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  const shortAddress = useMemo(() => {
    if (!address) return "";
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
  }, [address]);

  if (!isConnected) {
    return (
      <>
        <Button
          size="sm"
          variant="default"
          className="w-full cursor-pointer"
          onClick={() => setIsConnectModalOpen(true)}
        >
          <Wallet className="mr-2 h-4 w-4" />
          Connect
        </Button>
        <ConnectWalletModal
          open={isConnectModalOpen}
          onOpenChange={setIsConnectModalOpen}
        />
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost" className="w-full cursor-pointer">
          <span className="hidden sm:inline">
            <AddressDisplay address={address!} variant="compact" avatarSize="sm" showAvatar={true} showENS={true} showCopy={false} showExplorer={false} onAddressClick={() => {}} />
          </span>
          <span className="sm:hidden">{shortAddress}</span>
          <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top">
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={(e) => {
            e.preventDefault();
            if (!address) return;
            router.push(`/members/${address}`);
          }}
        >
          <User className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          className="cursor-pointer"
          onSelect={async (e) => {
            e.preventDefault();
            try {
              disconnect();
              toast("Disconnected");
            } catch (err: unknown) {
              const message =
                err && typeof err === "object" && "message" in err
                  ? String((err as { message?: string }).message ?? "Failed to disconnect")
                  : "Failed to disconnect";
              toast.error("Disconnect failed", { description: message });
            }
          }}
        >
          <LogOut className="mr-2 h-4 w-4 text-red-600" />
          <span className="text-red-600">Disconnect</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
