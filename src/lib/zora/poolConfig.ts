/**
 * Pool Configuration Encoder for Zora Content Coins
 * 
 * This encodes poolConfig for direct ZoraFactory.deploy() calls.
 * poolConfig chooses: version, backing currency (ETH/ZORA/Creator Coin), and liquidity curves.
 * 
 * ⚠️  IMPORTANT: curveParams placeholder
 * In production, replace the zero-length curveParams with validated bytes from Zora's 
 * configuration API. The placeholder allows compilation but may not reflect optimal curves.
 * 
 * @see https://docs.zora.co/coins/contracts/factory
 */

import { Address, Hex, encodeAbiParameters } from "viem";

/**
 * Pool version constants
 * Must match CoinConfigurationVersions.sol
 */
export const POOL_VERSION = {
  DOPPLER_MULTICURVE_UNI_V4: 4,
} as const;

/**
 * Backing currency types
 * 0 = ETH
 * 1 = ZORA
 * 2 = CREATOR_COIN
 */
export const BACKING = {
  ETH: 0,
  ZORA: 1,
  CREATOR_COIN: 2,
} as const;

export type BackingType = (typeof BACKING)[keyof typeof BACKING];

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
  }
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
      { type: "uint8" },      // version (must be 4 for DOPPLER_MULTICURVE_UNI_V4)
      { type: "address" },    // currency (backing creator coin)
      { type: "int24[]" },    // tickLower
      { type: "int24[]" },    // tickUpper
      { type: "uint16[]" },   // numDiscoveryPositions
      { type: "uint256[]" },  // maxDiscoverySupplyShare
    ],
    [
      POOL_VERSION.DOPPLER_MULTICURVE_UNI_V4,  // version = 4 (uint8)
      creatorCoin,                              // currency
      tickLower,                                // tickLower
      tickUpper,                                // tickUpper
      numDiscoveryPositions,                    // numDiscoveryPositions
      maxDiscoverySupplyShare,                  // maxDiscoverySupplyShare
    ]
  );
}

/**
 * Encodes poolConfig for a Content Coin backed by ETH
 */
export function encodeContentPoolConfigForETH(opts?: {
  tickLower?: number[];
  tickUpper?: number[];
  numDiscoveryPositions?: number[];
  maxDiscoverySupplyShare?: bigint[];
}): Hex {
  const tickLower = opts?.tickLower ?? [-250_000];
  const tickUpper = opts?.tickUpper ?? [-195_000];
  const numDiscoveryPositions = opts?.numDiscoveryPositions ?? [11];
  const maxDiscoverySupplyShare = opts?.maxDiscoverySupplyShare ?? [50000000000000000n]; // 0.05e18

  return encodeAbiParameters(
    [
      { type: "uint8" },
      { type: "address" },
      { type: "int24[]" },
      { type: "int24[]" },
      { type: "uint16[]" },
      { type: "uint256[]" },
    ],
    [
      POOL_VERSION.DOPPLER_MULTICURVE_UNI_V4,
      "0x0000000000000000000000000000000000000000" as Address, // ETH = address(0)
      tickLower,
      tickUpper,
      numDiscoveryPositions,
      maxDiscoverySupplyShare,
    ]
  );
}

/**
 * Encodes poolConfig for a Content Coin backed by ZORA token
 * 
 * @param zoraTokenAddress - Address of ZORA token (0x1111111111166b7FE7bd91427724B487980aFc69 on Base)
 */
export function encodeContentPoolConfigForZORA(
  zoraTokenAddress: Address,
  opts?: {
    tickLower?: number[];
    tickUpper?: number[];
    numDiscoveryPositions?: number[];
    maxDiscoverySupplyShare?: bigint[];
  }
): Hex {
  const tickLower = opts?.tickLower ?? [-138_000];
  const tickUpper = opts?.tickUpper ?? [-81_000];
  const numDiscoveryPositions = opts?.numDiscoveryPositions ?? [11];
  const maxDiscoverySupplyShare = opts?.maxDiscoverySupplyShare ?? [50000000000000000n]; // 0.05e18

  return encodeAbiParameters(
    [
      { type: "uint8" },
      { type: "address" },
      { type: "int24[]" },
      { type: "int24[]" },
      { type: "uint16[]" },
      { type: "uint256[]" },
    ],
    [
      POOL_VERSION.DOPPLER_MULTICURVE_UNI_V4,
      zoraTokenAddress,
      tickLower,
      tickUpper,
      numDiscoveryPositions,
      maxDiscoverySupplyShare,
    ]
  );
}
