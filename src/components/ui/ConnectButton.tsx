"use client";

import { useMemo } from "react";
import { ChevronDown, LogOut, User, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddressDisplay } from "@/components/ui/address-display";
import { toast } from "sonner";

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { connectors, connectAsync } = useConnect();
  const router = useRouter();

  const shortAddress = useMemo(() => {
    if (!address) return "";
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
  }, [address]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant={isConnected ? "ghost" : "default"} className="w-full cursor-pointer">
          {isConnected && address ? (
            <>
              <span className="hidden sm:inline">
                <AddressDisplay address={address} variant="compact" avatarSize="sm" showAvatar={true} showENS={true} showCopy={false} showExplorer={false} onAddressClick={() => {}} />
              </span>
              <span className="sm:hidden">{shortAddress}</span>
            </>
          ) : (
            <>
              <Wallet className="mr-2 h-4 w-4" />
              Connect
            </>
          )}
          <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top">
        {!isConnected ? (
          <>
            {connectors.map((connector) => (
              <DropdownMenuItem
                key={connector.uid}
                className="cursor-pointer"
                onSelect={async (e) => {
                  e.preventDefault();
                  try {
                    await connectAsync({ connector });
                  } catch (err: unknown) {
                    const message =
                      err && typeof err === "object" && "message" in err
                        ? String((err as { message?: string }).message ?? "Failed to connect")
                        : "Failed to connect";
                    if (/rejected|user|cancel/i.test(message)) {
                      toast("Connection cancelled");
                    } else {
                      toast.error("Connection failed", { description: message });
                    }
                  }
                }}
              >
                {connector.name}
              </DropdownMenuItem>
            ))}
          </>
        ) : (
          <>
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
                  // Disconnect all active connections if any, else just disconnect
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
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


