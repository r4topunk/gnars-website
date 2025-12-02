import { sdk } from "@farcaster/miniapp-sdk";
import { custom, type EIP1193Provider } from "viem";
import { createConnector } from "wagmi";

/**
 * Farcaster Mini App Wallet Connector
 *
 * This connector uses the Farcaster SDK's wallet provider when running
 * inside a Farcaster mini app context. It provides seamless wallet
 * integration for users viewing the app within Warpcast or the Base app.
 *
 * The Farcaster wallet is an embedded smart wallet that:
 * - Doesn't require seed phrases or browser extensions
 * - Uses passkey authentication
 * - Is automatically available in mini app context
 *
 * Usage:
 * Add to wagmi connectors array:
 * ```ts
 * connectors: [
 *   farcasterWallet(),
 *   // ... other connectors
 * ]
 * ```
 */
export function farcasterWallet() {
  type Provider = EIP1193Provider;
  let provider: Provider | undefined;

  return createConnector<Provider>((config) => ({
    id: "farcaster",
    name: "Farcaster Wallet",
    type: "farcaster" as const,

    async setup() {
      // Check if we're in a mini app context on setup
      try {
        const isInMiniApp = await sdk.isInMiniApp();
        if (isInMiniApp) {
          provider = (await sdk.wallet.getEthereumProvider()) as Provider;
        }
      } catch {
        // Not in mini app context
      }
    },

    async connect({ chainId } = {}) {
      try {
        const ethProvider = await sdk.wallet.getEthereumProvider();
        if (!ethProvider) {
          throw new Error("Farcaster wallet not available");
        }

        provider = ethProvider as Provider;

        const accounts = (await provider.request({
          method: "eth_requestAccounts",
        })) as `0x${string}`[];

        let currentChainId = await this.getChainId();

        // Switch chain if needed
        if (chainId && currentChainId !== chainId) {
          const chain = await this.switchChain?.({ chainId });
          currentChainId = chain?.id ?? currentChainId;
        }

        return {
          accounts,
          chainId: currentChainId,
        };
      } catch (error) {
        console.error("Failed to connect Farcaster wallet:", error);
        throw error;
      }
    },

    async disconnect() {
      provider = undefined;
    },

    async getAccounts() {
      if (!provider) {
        return [];
      }
      const accounts = (await provider.request({
        method: "eth_accounts",
      })) as `0x${string}`[];
      return accounts;
    },

    async getChainId() {
      if (!provider) {
        return config.chains[0].id;
      }
      const chainId = await provider.request({ method: "eth_chainId" });
      return Number(chainId);
    },

    async getProvider() {
      if (!provider) {
        const ethProvider = await sdk.wallet.getEthereumProvider();
        if (ethProvider) {
          provider = ethProvider as Provider;
        }
      }
      if (!provider) {
        throw new Error("Farcaster wallet provider not available");
      }
      return provider;
    },

    async isAuthorized() {
      try {
        const isInMiniApp = await sdk.isInMiniApp();
        if (!isInMiniApp) return false;

        const accounts = await this.getAccounts();
        return accounts.length > 0;
      } catch {
        return false;
      }
    },

    async switchChain({ chainId }) {
      if (!provider) {
        throw new Error("Provider not available");
      }

      const chain = config.chains.find((c) => c.id === chainId);
      if (!chain) {
        throw new Error(`Chain ${chainId} not configured`);
      }

      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${chainId.toString(16)}` }],
        });
      } catch (error: unknown) {
        // Chain not added, try to add it
        if ((error as { code?: number })?.code === 4902) {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${chainId.toString(16)}`,
                chainName: chain.name,
                nativeCurrency: chain.nativeCurrency,
                rpcUrls: chain.rpcUrls.default.http,
                blockExplorerUrls: chain.blockExplorers
                  ? [chain.blockExplorers.default.url]
                  : undefined,
              },
            ],
          });
        } else {
          throw error;
        }
      }

      config.emitter.emit("change", { chainId });
      return chain;
    },

    onAccountsChanged(accounts) {
      if (accounts.length === 0) {
        config.emitter.emit("disconnect");
      } else {
        config.emitter.emit("change", {
          accounts: accounts as `0x${string}`[],
        });
      }
    },

    onChainChanged(chainId) {
      config.emitter.emit("change", { chainId: Number(chainId) });
    },

    onDisconnect() {
      config.emitter.emit("disconnect");
    },
  }));
}

/**
 * Get a viem transport for the Farcaster wallet provider
 * Useful for creating wallet clients directly with viem
 */
export async function getFarcasterTransport() {
  const provider = await sdk.wallet.getEthereumProvider();
  if (!provider) {
    throw new Error("Farcaster wallet not available");
  }
  return custom(provider as EIP1193Provider);
}
