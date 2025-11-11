/**
 * Zora Factory ABI
 * 
 * Minimal ABI for ZoraFactory contract on Base
 * 
 * @see https://docs.zora.co/coins/contracts/factory
 */

export const zoraFactoryAbi = [
  {
    type: "function",
    name: "deploy",
    inputs: [
      { name: "payoutRecipient", type: "address" },
      { name: "owners", type: "address[]" },
      { name: "uri", type: "string" },
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "poolConfig", type: "bytes" },
      { name: "platformReferrer", type: "address" },
      { name: "postDeployHook", type: "address" },
      { name: "postDeployHookData", type: "bytes" },
      { name: "coinSalt", type: "bytes32" },
    ],
    outputs: [
      { name: "coin", type: "address" },
      { name: "postDeployHookDataOut", type: "bytes" },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "coinAddress",
    inputs: [
      { name: "msgSender", type: "address" },
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "poolConfig", type: "bytes" },
      { name: "platformReferrer", type: "address" },
      { name: "coinSalt", type: "bytes32" },
    ],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "CoinCreatedV4",
    inputs: [
      { name: "caller", type: "address", indexed: true },
      { name: "payoutRecipient", type: "address", indexed: false },
      { name: "platformReferrer", type: "address", indexed: false },
      { name: "currency", type: "address", indexed: false },
      { name: "uri", type: "string", indexed: false },
      { name: "name", type: "string", indexed: false },
      { name: "symbol", type: "string", indexed: false },
      { name: "coin", type: "address", indexed: false },
      {
        name: "poolKey",
        type: "tuple",
        indexed: false,
        components: [
          { name: "currency0", type: "address" },
          { name: "currency1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "hooks", type: "address" },
        ],
      },
      { name: "poolKeyHash", type: "bytes32", indexed: false },
      { name: "version", type: "string", indexed: false },
    ],
  },
] as const;

/**
 * Re-export constants from config for convenience
 */
export { ZORA_FACTORY_ADDRESS, GNARS_CREATOR_COIN } from "@/lib/config";

/**
 * ZORA token address on Base (chainId 8453)
 * Used for rewards/hooks reference
 */
export const ZORA_TOKEN_ADDRESS = "0x1111111111166b7FE7bd91427724B487980aFc69" as const;
