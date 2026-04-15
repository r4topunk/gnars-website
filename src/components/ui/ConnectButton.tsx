"use client";

import { Wallet } from "lucide-react";
import { useConnectModal } from "thirdweb/react";
import { Button } from "@/components/ui/button";
import { WalletDrawer } from "@/components/layout/WalletDrawer";
import { useUserAddress } from "@/hooks/use-user-address";
import { getThirdwebClient } from "@/lib/thirdweb";
import { THIRDWEB_AA_CONFIG, THIRDWEB_WALLETS } from "@/lib/thirdweb-wallets";

export function ConnectButton() {
  const { isConnected } = useUserAddress();
  const { connect, isConnecting } = useConnectModal();
  const client = getThirdwebClient();

  if (isConnected) return <WalletDrawer />;

  const handleConnect = async () => {
    if (!client) return;
    try {
      await connect({
        client,
        wallets: THIRDWEB_WALLETS,
        accountAbstraction: THIRDWEB_AA_CONFIG,
        size: "compact",
        title: "Connect to Gnars",
      });
    } catch {
      // User dismissed the modal — nothing to do.
    }
  };

  return (
    <Button
      size="sm"
      variant="default"
      className="w-full cursor-pointer"
      onClick={handleConnect}
      disabled={isConnecting || !client}
    >
      <Wallet className="mr-2 h-4 w-4" />
      Connect
    </Button>
  );
}
