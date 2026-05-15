/**
 * Pool Configuration Encoder for Zora Content Coins
 *
 * This encodes poolConfig for direct ZoraFactory.deploy() calls.
 * poolConfig chooses: version, backing currency (ETH/ZORA/Creator Coin), and liquidity curves.
 *
 * ⚠️  NOTE: Fallback only
 * These functions are now primarily used as fallbacks when Zora's API is unavailable.
 * The recommended approach is to use `getCreateContentPoolConfig()` from @zoralabs/coins-sdk
 * which provides validated, optimal pool configurations.
 *
 * The hardcoded tick ranges here are placeholders and may not be optimal for production use.
 *
 * @see https://docs.zora.co/coins/contracts/factory
 */

import { Address, encodeAbiParameters, Hex } from "viem";

/**
 * Pool version constants
 * Must match CoinConfigurationVersions.sol
 */
const POOL_VERSION = {
  DOPPLER_MULTICURVE_UNI_V4: 4,
} as const;

/**
 * Encodes poolConfig for a Content Coin backed by a Creator Coin
 *
 * @param creatorCoin - The ERC-20 address of the creator coin (e.g., Gnars Creator Coin)
 * @param opts - Optional configuration
 * @param opts.tickLower - Array of lower ticks for liquidity curves (default: placeholder)
 * @param opts.tickUpper - Array of upper ticks for liquidity curves (default: placeholder)
 * @param opts.numDiscoveryPositions - Array of discovery positions per curve (default: placeholder)
 * @param opts.maxDiscoverySupplyShare - Array of max supply share per curve (default: placeholder)
 * @returns Hex-encoded poolConfig
 */
export function encodeContentPoolConfigForCreator(
  creatorCoin: Address,
  opts?: {
    tickLower?: number[];
    tickUpper?: number[];
    numDiscoveryPositions?: number[];
    maxDiscoverySupplyShare?: bigint[];
  },
): Hex {
  // Default to a simple single-curve configuration
  // These are placeholder values - in production, use Zora's configuration API
  const tickLower = opts?.tickLower ?? [-328_000];
  const tickUpper = opts?.tickUpper ?? [-300_000];
  const numDiscoveryPositions = opts?.numDiscoveryPositions ?? [2];
  const maxDiscoverySupplyShare = opts?.maxDiscoverySupplyShare ?? [100000000000000000n]; // 0.1e18

  // ABI encoding for: (uint8 version, address currency, int24[] tickLower, int24[] tickUpper, uint16[] numDiscoveryPositions, uint256[] maxDiscoverySupplyShare)
  return encodeAbiParameters(
    [
      { type: "uint8" }, // version (must be 4 for DOPPLER_MULTICURVE_UNI_V4)
      { type: "address" }, // currency (backing creator coin)
      { type: "int24[]" }, // tickLower
      { type: "int24[]" }, // tickUpper
      { type: "uint16[]" }, // numDiscoveryPositions
      { type: "uint256[]" }, // maxDiscoverySupplyShare
    ],
    [
      POOL_VERSION.DOPPLER_MULTICURVE_UNI_V4, // version = 4 (uint8)
      creatorCoin, // currency
      tickLower, // tickLower
      tickUpper, // tickUpper
      numDiscoveryPositions, // numDiscoveryPositions
      maxDiscoverySupplyShare, // maxDiscoverySupplyShare
    ],
  );
}
