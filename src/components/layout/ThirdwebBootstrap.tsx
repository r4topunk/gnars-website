"use client";

import { useEffect } from "react";
import { sdk as farcasterSdk } from "@farcaster/miniapp-sdk";
import { type ThirdwebClient } from "thirdweb";
import { EIP1193 } from "thirdweb/wallets";
import { useAutoConnect, useSetActiveWallet } from "thirdweb/react";
import { getThirdwebClient, THIRDWEB_CHAIN } from "@/lib/thirdweb";
import { THIRDWEB_AA_CONFIG, THIRDWEB_WALLETS } from "@/lib/thirdweb-wallets";

/**
 * Renders nothing. Mounted inside `ThirdwebProvider` in `Providers.tsx` to:
 *
 *  1. Restore the user's session across reloads by calling `useAutoConnect`.
 *  2. Detect the Farcaster mini-app context and wire the Warpcast-provided
 *     EIP-1193 provider into thirdweb as an adapted wallet, so mini-app users
 *     are connected automatically without ever seeing the Connect modal.
 *
 * When `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` is not configured this renders null —
 * the inner component (which hosts the thirdweb hooks) never mounts so we
 * never call `useAutoConnect` with an undefined client.
 */
export function ThirdwebBootstrap() {
  const client = getThirdwebClient();
  if (!client) return null;
  return <ThirdwebBootstrapInner client={client} />;
}

function ThirdwebBootstrapInner({ client }: { client: ThirdwebClient }) {
  const setActiveWallet = useSetActiveWallet();

  useAutoConnect({
    client,
    wallets: THIRDWEB_WALLETS,
    accountAbstraction: THIRDWEB_AA_CONFIG,
    timeout: 15_000,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const isMiniApp = await farcasterSdk.isInMiniApp();
        if (!isMiniApp || cancelled) return;

        const provider = await farcasterSdk.wallet.getEthereumProvider();
        if (!provider || cancelled) return;

        // Wrap the Farcaster-provided EIP-1193 provider so thirdweb treats
        // it like any other wallet. We skip the SA wrap here because
        // Farcaster mini-app wallets are already Coinbase Smart Wallets —
        // stacking our own SA on top would create a third address with no
        // upside.
        const wallet = EIP1193.fromProvider({
          provider: provider as Parameters<
            typeof EIP1193.fromProvider
          >[0]["provider"],
        });

        await wallet.connect({ client, chain: THIRDWEB_CHAIN });
        if (cancelled) return;

        await setActiveWallet(wallet);
      } catch {
        // Not running inside a Farcaster mini app — fall back to the
        // standard Connect modal flow.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [client, setActiveWallet]);

  return null;
}
