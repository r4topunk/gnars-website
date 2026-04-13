"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useSetActiveWallet } from "thirdweb/react";
import { EIP1193, type Account, type Wallet } from "thirdweb/wallets";
import { getThirdwebClient, THIRDWEB_CHAIN } from "@/lib/thirdweb";

export interface UseThirdwebWalletState {
  wallet: Wallet | undefined;
  account: Account | undefined;
  isSyncing: boolean;
  error: string | undefined;
}

const initial: UseThirdwebWalletState = {
  wallet: undefined,
  account: undefined,
  isSyncing: false,
  error: undefined,
};

/**
 * Bridges the active wagmi connector into thirdweb by wrapping its
 * EIP-1193 provider with EIP1193.fromProvider and setting it as
 * thirdweb's active wallet. After the bridge settles, any thirdweb
 * React hook (useActiveAccount, useSendTransaction, etc.) reflects
 * the same underlying account.
 *
 * Mount this hook once on a page that needs thirdweb writes. The
 * effect re-runs whenever the wagmi account or connector changes.
 */
export function useThirdwebWallet(): UseThirdwebWalletState {
  const { connector, address, isConnected } = useAccount();
  const setActiveWallet = useSetActiveWallet();
  const [state, setState] = useState<UseThirdwebWalletState>(initial);

  useEffect(() => {
    const client = getThirdwebClient();

    if (!client) {
      setState({
        ...initial,
        error: "Thirdweb client not configured (NEXT_PUBLIC_THIRDWEB_CLIENT_ID missing)",
      });
      return;
    }

    if (!isConnected || !connector || !address) {
      setState(initial);
      return;
    }

    let cancelled = false;
    let bridgedWallet: Wallet | undefined;

    setState((prev) => ({ ...prev, isSyncing: true, error: undefined }));

    (async () => {
      try {
        const provider = await connector.getProvider();
        if (cancelled) return;

        const wallet = EIP1193.fromProvider({
          provider: provider as Parameters<typeof EIP1193.fromProvider>[0]["provider"],
        });
        bridgedWallet = wallet;

        const account = await wallet.connect({ client, chain: THIRDWEB_CHAIN });
        if (cancelled) {
          await wallet.disconnect().catch(() => {});
          return;
        }

        await setActiveWallet(wallet);
        if (cancelled) return;

        setState({ wallet, account, isSyncing: false, error: undefined });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setState({
          wallet: undefined,
          account: undefined,
          isSyncing: false,
          error: `Failed to bridge wagmi -> thirdweb: ${message}`,
        });
      }
    })();

    return () => {
      cancelled = true;
      if (bridgedWallet) {
        bridgedWallet.disconnect().catch(() => {});
      }
    };
  }, [connector, address, isConnected, setActiveWallet]);

  return state;
}
