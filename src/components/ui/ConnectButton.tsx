"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { ConnectWalletModal } from "@/components/auction/ConnectWalletModal";
import { WalletDrawer } from "@/components/layout/WalletDrawer";

export function ConnectButton() {
  const { isConnected } = useAccount();
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

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
        <ConnectWalletModal open={isConnectModalOpen} onOpenChange={setIsConnectModalOpen} />
      </>
    );
  }

  return <WalletDrawer />;
}
