import { createPublicClient, fallback, http } from "viem";
import { base } from "viem/chains";

const BASE_RPC_URLS = [
  ...(process.env.NEXT_PUBLIC_BASE_RPC_URL ? [process.env.NEXT_PUBLIC_BASE_RPC_URL] : []),
  "https://base.api.pocket.network",
  "https://1rpc.io/base",
  "https://base.meowrpc.com",
  "https://base-rpc.publicnode.com",
  "https://api.zan.top/base-mainnet",
  "https://base.llamarpc.com",
  "https://mainnet.base.org",
];

export const serverPublicClient = createPublicClient({
  chain: base,
  transport: fallback(
    BASE_RPC_URLS.map((url) =>
      http(url, {
        timeout: 8_000,
        retryCount: 1,
        retryDelay: 500,
      }),
    ),
    {
      rank: false,
      retryCount: BASE_RPC_URLS.length,
      retryDelay: 100,
    },
  ),
});
