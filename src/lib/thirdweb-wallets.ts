import { base } from "thirdweb/chains";
import { createWallet } from "thirdweb/wallets";
import { inAppWallet } from "thirdweb/wallets/in-app";
import type { SmartWalletOptions } from "thirdweb/wallets/smart";

/**
 * Singleton wallet list used by every thirdweb hook entry point in the app.
 *
 * The inAppWallet factory intentionally does NOT set `executionMode` — the
 * `accountAbstraction` config passed at the `useConnectModal` / `useAutoConnect`
 * call level handles smart-account wrapping uniformly for every wallet in
 * this list (including inAppWallet and external wallets like MetaMask). One
 * code path, one SA derivation, no double-wrap.
 */
export const THIRDWEB_WALLETS = [
  inAppWallet({
    auth: {
      options: ["google", "apple", "x", "discord", "farcaster", "email"],
      mode: "popup",
    },
    metadata: { name: "Gnars DAO" },
  }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("walletConnect"),
];

/**
 * Account-abstraction config passed to every thirdweb hook that accepts one.
 * `sponsorGas: true` routes transactions through thirdweb's paymaster so
 * users never pay gas on Base. The same `chain` is used for SA derivation
 * regardless of which personal wallet signs the user op.
 */
export const THIRDWEB_AA_CONFIG: SmartWalletOptions = {
  chain: base,
  sponsorGas: true,
};
