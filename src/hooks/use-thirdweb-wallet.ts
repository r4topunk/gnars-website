"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useSetActiveWallet } from "thirdweb/react";
import {
  EIP1193,
  smartWallet,
  type Account,
  type SmartWalletOptions,
  type Wallet,
} from "thirdweb/wallets";
import { getAAConfig, getThirdwebClient, THIRDWEB_CHAIN } from "@/lib/thirdweb";

export interface UseThirdwebWalletState {
  wallet: Wallet | undefined;
  account: Account | undefined;
  isSyncing: boolean;
  error: string | undefined;
  /** True when the active thirdweb wallet is a smart account wrapping an admin signer. */
  isSmartAccount: boolean;
  /** The underlying admin EOA account when AA is on; same as account otherwise. */
  adminAccount: Account | undefined;
}

const initial: UseThirdwebWalletState = {
  wallet: undefined,
  account: undefined,
  isSyncing: false,
  error: undefined,
  isSmartAccount: false,
  adminAccount: undefined,
};

/**
 * Bridges the active wagmi connector into thirdweb by wrapping its
 * EIP-1193 provider with EIP1193.fromProvider and setting it as
 * thirdweb's active wallet. After the bridge settles, any thirdweb
 * React hook (useActiveAccount, useSendTransaction, etc.) reflects
 * the same underlying account.
 *
 * When AA is enabled via NEXT_PUBLIC_THIRDWEB_AA_ENABLED=true, the
 * bridged EOA wallet becomes the personalAccount of a smartWallet()
 * and the smart wallet is set as active instead. Farcaster mini-app
 * context is always skipped — Warpcast wallets are already Coinbase
 * Smart Wallets and stacking another SA on top would create a third
 * address with no upside.
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
    let smartWalletInstance: Wallet | undefined;

    setState((prev) => ({ ...prev, isSyncing: true, error: undefined }));

    (async () => {
      try {
        const provider = await connector.getProvider();
        if (cancelled) return;

        const eoaWallet = EIP1193.fromProvider({
          provider: provider as Parameters<typeof EIP1193.fromProvider>[0]["provider"],
        });
        bridgedWallet = eoaWallet;

        const eoaAccount = await eoaWallet.connect({ client, chain: THIRDWEB_CHAIN });
        if (cancelled) {
          await eoaWallet.disconnect().catch(() => {});
          return;
        }

        const aa = getAAConfig();
        const isFarcaster = connector.id === "farcaster";
        const shouldUseAA = aa.enabled && !isFarcaster;

        if (shouldUseAA) {
          const smartOptions: SmartWalletOptions = {
            chain: THIRDWEB_CHAIN,
            sponsorGas: aa.sponsorGas,
            ...(aa.factoryAddress ? { factoryAddress: aa.factoryAddress } : {}),
          };

          const smart = smartWallet(smartOptions);
          smartWalletInstance = smart;

          const smartAccount = await smart.connect({
            client,
            chain: THIRDWEB_CHAIN,
            personalAccount: eoaAccount,
          });
          if (cancelled) {
            await smart.disconnect().catch(() => {});
            await eoaWallet.disconnect().catch(() => {});
            return;
          }

          await setActiveWallet(smart);
          if (cancelled) return;

          console.info("[thirdweb-bridge] ready (AA)", {
            connector: connector.id,
            admin: eoaAccount.address,
            smart: smartAccount.address,
            sponsorGas: aa.sponsorGas,
          });

          setState({
            wallet: smart,
            account: smartAccount,
            isSyncing: false,
            error: undefined,
            isSmartAccount: true,
            adminAccount: eoaAccount,
          });
        } else {
          await setActiveWallet(eoaWallet);
          if (cancelled) return;

          console.info("[thirdweb-bridge] ready", {
            connector: connector.id,
            account: eoaAccount.address,
            aaEnabled: aa.enabled,
            aaSkippedForFarcaster: isFarcaster && aa.enabled,
          });

          setState({
            wallet: eoaWallet,
            account: eoaAccount,
            isSyncing: false,
            error: undefined,
            isSmartAccount: false,
            adminAccount: eoaAccount,
          });
        }
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setState({
          wallet: undefined,
          account: undefined,
          isSyncing: false,
          error: `Failed to bridge wagmi -> thirdweb: ${message}`,
          isSmartAccount: false,
          adminAccount: undefined,
        });
      }
    })();

    return () => {
      cancelled = true;
      if (smartWalletInstance) {
        smartWalletInstance.disconnect().catch(() => {});
      }
      if (bridgedWallet) {
        bridgedWallet.disconnect().catch(() => {});
      }
    };
  }, [connector, address, isConnected, setActiveWallet]);

  return state;
}
