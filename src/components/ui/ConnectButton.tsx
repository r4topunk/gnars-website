"use client";

import { Wallet } from "lucide-react";
import { useConnectedWallets, useConnectModal, useDisconnect } from "thirdweb/react";
import { useViewAccount } from "@/components/layout/ViewAccountContext";
import { WalletDrawer } from "@/components/layout/WalletDrawer";
import { Button } from "@/components/ui/button";
import { useUserAddress } from "@/hooks/use-user-address";
import { getThirdwebClient } from "@/lib/thirdweb";
import { THIRDWEB_AA_CONFIG, THIRDWEB_WALLETS } from "@/lib/thirdweb-wallets";

export function ConnectButton() {
  const { isConnected } = useUserAddress();
  const { connect, isConnecting } = useConnectModal();
  const connectedWallets = useConnectedWallets();
  const { disconnect } = useDisconnect();
  const { clearViewMode } = useViewAccount();
  const client = getThirdwebClient();

  if (isConnected) return <WalletDrawer />;

  const handleConnect = async () => {
    if (!client) return;
    try {
      // Reset the persisted view-mode preference BEFORE connecting so the
      // fresh session starts with the wallet-aware default (external → eoa,
      // inApp → sa). A stale "sa"/"eoa" from a previous user/session would
      // otherwise override the default and display the wrong address.
      clearViewMode();

      const nextWallet = await connect({
        client,
        wallets: THIRDWEB_WALLETS,
        accountAbstraction: THIRDWEB_AA_CONFIG,
        size: "compact",
        title: "Connect to Gnars",
      });

      // Clean up any stale wallets left in thirdweb's connection manager
      // from previous sessions. When users swap between social login and
      // an external wallet without a full page reload, the old entries
      // linger — `useAdminWallet` can then resolve to the wrong signer
      // and our isInAppWallet detection lies about the active identity.
      // Keep only the wallet returned by the connect modal.
      for (const stale of connectedWallets) {
        if (stale !== nextWallet) {
          try {
            disconnect(stale);
          } catch {
            // best effort
          }
        }
      }
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
