/**
 * Pool Configuration Debug Utilities
 * 
 * Utilities to extract and display current pool configuration parameters
 * for debugging and comparison with Zora API recommendations.
 */

import { Address, decodeAbiParameters, Hex } from "viem";
import { GNARS_CREATOR_COIN } from "@/lib/config";
import { encodeContentPoolConfigForCreator } from "./poolConfig";

export interface PoolConfigDebugInfo {
  version: number;
  currency: Address;
  tickLower: readonly number[];
  tickUpper: readonly number[];
  numDiscoveryPositions: readonly number[];
  maxDiscoverySupplyShare: readonly bigint[];
  encodedConfig: Hex;
  readableSupplyShare: string[];
}

/**
 * Gets the current pool configuration that would be used for coin creation
 * @param creatorCoin - The creator coin address (defaults to GNARS_CREATOR_COIN)
 * @param customParams - Optional custom parameters to override defaults
 */
export function getCurrentPoolConfig(
  creatorCoin: Address = GNARS_CREATOR_COIN,
  customParams?: {
    tickLower?: number[];
    tickUpper?: number[];
    numDiscoveryPositions?: number[];
    maxDiscoverySupplyShare?: bigint[];
  }
): PoolConfigDebugInfo {
  // Get the encoded pool config using current implementation
  const encodedConfig = encodeContentPoolConfigForCreator(creatorCoin, customParams);
  
  // Decode it back to extract the actual parameters
  const decoded = decodeAbiParameters(
    [
      { type: "uint8" },      // version
      { type: "address" },    // currency
      { type: "int24[]" },    // tickLower
      { type: "int24[]" },    // tickUpper
      { type: "uint16[]" },   // numDiscoveryPositions
      { type: "uint256[]" },  // maxDiscoverySupplyShare
    ],
    encodedConfig
  );

  const [version, currency, tickLower, tickUpper, numDiscoveryPositions, maxDiscoverySupplyShare] = decoded;

  return {
    version,
    currency,
    tickLower,
    tickUpper,
    numDiscoveryPositions,
    maxDiscoverySupplyShare,
    encodedConfig,
    readableSupplyShare: maxDiscoverySupplyShare.map(share => {
      // Convert from wei to percentage (e.g., 100000000000000000n = 10%)
      const percentage = (Number(share) / Number(1e18)) * 100;
      return `${percentage}%`;
    }),
  };
}

/**
 * Calculates the price range implications of tick values
 * Note: This is a simplified approximation for display purposes
 */
export function getTickPriceInfo(tickLower: number[], tickUpper: number[]) {
  return tickLower.map((lower, index) => {
    const upper = tickUpper[index];
    // Simplified tick-to-price calculation (actual formula is more complex)
    const lowerPrice = Math.pow(1.0001, lower);
    const upperPrice = Math.pow(1.0001, upper);
    const range = upperPrice - lowerPrice;
    
    return {
      tickLower: lower,
      tickUpper: upper,
      priceRangeLower: lowerPrice.toExponential(3),
      priceRangeUpper: upperPrice.toExponential(3),
      rangeWidth: range.toExponential(3),
    };
  });
}