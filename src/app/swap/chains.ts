import {
  arbitrum as thirdwebArbitrum,
  base as thirdwebBase,
  ethereum as thirdwebEthereum,
  optimism as thirdwebOptimism,
  type Chain as ThirdwebChain,
} from "thirdweb/chains";
import { DAO_ADDRESSES, TREASURY_TOKEN_ALLOWLIST } from "@/lib/config";

// 0x convention for the native asset slot on every chain.
export const NATIVE_TOKEN = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" as const;

export interface SwapToken {
  symbol: string;
  name: string;
  address: `0x${string}` | typeof NATIVE_TOKEN;
  decimals: number;
  logo?: string;
}

export interface SwapChain {
  id: number;
  name: string;
  shortName: string;
  thirdwebChain: ThirdwebChain;
  tokens: readonly SwapToken[];
  /** Default sell/buy symbols when the user lands on or switches to this chain. */
  defaults: { sell: string; buy: string };
}

const ETH_LOGO = "https://assets.relay.link/icons/1/light.png" as const;
const USDC_LOGO =
  "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/assets/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913/logo.png" as const;

const ETH_NATIVE: SwapToken = {
  symbol: "ETH",
  name: "Ethereum",
  address: NATIVE_TOKEN,
  decimals: 18,
  logo: ETH_LOGO,
};

export const SWAP_CHAINS: readonly SwapChain[] = [
  {
    id: 8453,
    name: "Base",
    shortName: "Base",
    thirdwebChain: thirdwebBase,
    defaults: { sell: "ETH", buy: "GNARS" },
    // First 4 tokens appear in the "Popular" chip row of the token picker.
    tokens: [
      {
        symbol: "GNARS",
        name: "Gnars",
        address: DAO_ADDRESSES.gnarsErc20 as `0x${string}`,
        decimals: 18,
        logo: "/gnars.webp",
      },
      {
        symbol: "HIGHER",
        name: "Higher",
        address: "0x0578d8a44db98b23bf096a382e016e29a5ce0ffe",
        decimals: 18,
        logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/assets/0x0578d8A44db98B23BF096A382e016e29a5Ce0ffe/logo.png",
      },
      {
        symbol: "VVV",
        name: "Venice Token",
        address: "0xacfE6019Ed1A7Dc6f7B508C02d1b04ec88cC21bf",
        decimals: 18,
        logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/assets/0xacfE6019Ed1A7Dc6f7B508C02d1b04ec88cC21bf/logo.png",
      },
      ETH_NATIVE,
      {
        symbol: "WETH",
        name: "Wrapped Ether",
        address: TREASURY_TOKEN_ALLOWLIST.WETH as `0x${string}`,
        decimals: 18,
        logo: ETH_LOGO,
      },
      {
        symbol: "USDC",
        name: "USD Coin",
        address: TREASURY_TOKEN_ALLOWLIST.USDC as `0x${string}`,
        decimals: 6,
        logo: USDC_LOGO,
      },
      {
        symbol: "DEGEN",
        name: "Degen",
        address: "0x4ed4e862860bed51a9570b96d89af5e1b0efefed",
        decimals: 18,
        logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/assets/0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed/logo.png",
      },
    ],
  },
  {
    id: 1,
    name: "Ethereum",
    shortName: "Ethereum",
    thirdwebChain: thirdwebEthereum,
    defaults: { sell: "ETH", buy: "USDC" },
    tokens: [
      ETH_NATIVE,
      {
        symbol: "WETH",
        name: "Wrapped Ether",
        address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        decimals: 18,
        logo: ETH_LOGO,
      },
      {
        symbol: "USDC",
        name: "USD Coin",
        address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        decimals: 6,
        logo: USDC_LOGO,
      },
      {
        symbol: "USDT",
        name: "Tether",
        address: "0xdac17f958d2ee523a2206206994597c13d831ec7",
        decimals: 6,
      },
      {
        symbol: "DAI",
        name: "Dai",
        address: "0x6b175474e89094c44da98b954eedeac495271d0f",
        decimals: 18,
      },
    ],
  },
  {
    id: 10,
    name: "Optimism",
    shortName: "OP",
    thirdwebChain: thirdwebOptimism,
    defaults: { sell: "ETH", buy: "USDC" },
    tokens: [
      ETH_NATIVE,
      {
        symbol: "WETH",
        name: "Wrapped Ether",
        address: "0x4200000000000000000000000000000000000006",
        decimals: 18,
        logo: ETH_LOGO,
      },
      {
        symbol: "USDC",
        name: "USD Coin",
        address: "0x0b2c639c533813f4aa9d7837caf62653d097ff85",
        decimals: 6,
        logo: USDC_LOGO,
      },
      {
        symbol: "OP",
        name: "Optimism",
        address: "0x4200000000000000000000000000000000000042",
        decimals: 18,
      },
    ],
  },
  {
    id: 42161,
    name: "Arbitrum",
    shortName: "ARB",
    thirdwebChain: thirdwebArbitrum,
    defaults: { sell: "ETH", buy: "USDC" },
    tokens: [
      ETH_NATIVE,
      {
        symbol: "WETH",
        name: "Wrapped Ether",
        address: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        decimals: 18,
        logo: ETH_LOGO,
      },
      {
        symbol: "USDC",
        name: "USD Coin",
        address: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
        decimals: 6,
        logo: USDC_LOGO,
      },
      {
        symbol: "ARB",
        name: "Arbitrum",
        address: "0x912ce59144191c1204e64559fe8253a0e49e6548",
        decimals: 18,
      },
    ],
  },
] as const;

export const DEFAULT_SWAP_CHAIN = SWAP_CHAINS[0]; // Base

/** Shape returned by /api/wallet/tokens — one entry per ERC-20 the user holds. */
export interface WalletToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  /** Raw balance as a decimal string (BigInt-safe). */
  balance: string;
  /** Human-readable balance string (e.g. "1.2345"). */
  displayBalance: string;
  logoUrl: string | null;
  /** USD value of the holding. Null when the token has no CoinGecko price. */
  usdValue: number | null;
}

export function getSwapChain(id: number): SwapChain {
  return SWAP_CHAINS.find((c) => c.id === id) ?? DEFAULT_SWAP_CHAIN;
}

export function getDefaultPair(chain: SwapChain): { sell: SwapToken; buy: SwapToken } {
  const sell = chain.tokens.find((t) => t.symbol === chain.defaults.sell) ?? chain.tokens[0];
  const buy =
    chain.tokens.find((t) => t.symbol === chain.defaults.buy) ?? chain.tokens[1] ?? chain.tokens[0];
  return { sell, buy };
}
