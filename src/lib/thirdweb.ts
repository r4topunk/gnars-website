import { createThirdwebClient, type ThirdwebClient } from "thirdweb";
import { base as thirdwebBase } from "thirdweb/chains";

const CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

let clientSingleton: ThirdwebClient | undefined;
let warned = false;

export function getThirdwebClient(): ThirdwebClient | undefined {
  if (!CLIENT_ID) {
    if (typeof window !== "undefined" && !warned) {
      warned = true;
      console.warn(
        "[thirdweb] NEXT_PUBLIC_THIRDWEB_CLIENT_ID is not set. Thirdweb transaction sending is disabled. Get a client ID at https://thirdweb.com/dashboard.",
      );
    }
    return undefined;
  }

  if (!clientSingleton) {
    clientSingleton = createThirdwebClient({ clientId: CLIENT_ID });
  }

  return clientSingleton;
}

export const THIRDWEB_CHAIN = thirdwebBase;

export interface AAConfig {
  /** When false the bridge skips the smart wallet wrapper entirely. */
  enabled: boolean;
  /** Whether thirdweb's paymaster should cover gas for user operations. */
  sponsorGas: boolean;
  /** Optional override for the account factory address. */
  factoryAddress?: string;
}

/**
 * Reads account abstraction configuration from env vars. Off by default —
 * enable with NEXT_PUBLIC_THIRDWEB_AA_ENABLED=true. sponsorGas defaults to
 * true when AA is enabled; set NEXT_PUBLIC_THIRDWEB_AA_SPONSOR_GAS=false to
 * make users pay their own gas. Optionally pass a custom factory via
 * NEXT_PUBLIC_THIRDWEB_AA_FACTORY_ADDRESS.
 */
export function getAAConfig(): AAConfig {
  return {
    enabled: process.env.NEXT_PUBLIC_THIRDWEB_AA_ENABLED === "true",
    sponsorGas: process.env.NEXT_PUBLIC_THIRDWEB_AA_SPONSOR_GAS !== "false",
    factoryAddress: process.env.NEXT_PUBLIC_THIRDWEB_AA_FACTORY_ADDRESS,
  };
}
