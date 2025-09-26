import { cookieStorage, createConfig, createStorage, http } from "wagmi";
import { base } from "wagmi/chains";
import { coinbaseWallet, metaMask, walletConnect } from "wagmi/connectors";

declare global {
  // eslint-disable-next-line no-var
  var __wagmiConfig: ReturnType<typeof createConfig> | undefined;
}

export const config =
  globalThis.__wagmiConfig ??
  (globalThis.__wagmiConfig = createConfig({
    chains: [base],
    connectors: [
      metaMask(),
      walletConnect({
        projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
      }),
      coinbaseWallet({ appName: "Gnars DAO" }),
    ],
    transports: {
      [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org"),
    },
    ssr: true,
    storage: createStorage({
      storage: cookieStorage,
    }),
  }));

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
