import { Address, Hex } from "viem";
import { GNARS_CREATOR_COIN, PLATFORM_REFERRER } from "./config";

// Default constants for the API
export const DEFAULT_CONTENT_COIN = GNARS_CREATOR_COIN;
export const DEFAULT_PLATFORM_REFERRER = PLATFORM_REFERRER;

// API-specific CreateCoinParams interface (simpler than the hook version)
export interface CreateCoinParams {
  creator: Address;
  name: string;
  symbol: string;
  metadata: {
    type: "RAW_URI";
    uri: string;
  };
  currency?: Address;
  startingMarketCap?: bigint;
  platformReferrer?: Address;
}

// API response interface
export interface CreateCoinCallData {
  to: Address;
  data: Hex;
  value: bigint;
}

/**
 * Generate call data for creating a Zora content coin
 * This is a simplified version for the API route that returns the raw call data
 * instead of executing the transaction directly.
 */
export async function getCreateCoinCallData(params: CreateCoinParams): Promise<CreateCoinCallData> {
  const {
    creator,
    name,
    symbol,
    metadata,
    currency = DEFAULT_CONTENT_COIN,
    platformReferrer = DEFAULT_PLATFORM_REFERRER,
  } = params;

  // Import the factory ABI and address here to avoid circular dependencies
  const { zoraFactoryAbi, ZORA_FACTORY_ADDRESS } = await import("./zora/factoryAbi");
  const { encodeContentPoolConfigForCreator } = await import("./zora/poolConfig");
  const { encodeFunctionData } = await import("viem");

  try {
    // Encode pool configuration for Doppler Multi-Curve Uni V4
    // Uses the specified currency (default: Gnars Creator Coin) as backing currency
    const poolConfig = encodeContentPoolConfigForCreator(currency);

    // Generate call data for the deploy function
    const data = encodeFunctionData({
      abi: zoraFactoryAbi,
      functionName: "deploy",
      args: [
        creator,                                               // payoutRecipient
        [creator],                                             // owners[]
        metadata.uri,                                          // uri
        name,                                                  // name
        symbol,                                                // symbol
        poolConfig,                                            // poolConfig
        platformReferrer,                                      // platformReferrer
        "0x0000000000000000000000000000000000000000" as Address, // postDeployHook (none)
        "0x" as Hex,                                           // postDeployHookData (empty)
        "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex, // coinSalt (default)
      ],
    });

    return {
      to: ZORA_FACTORY_ADDRESS,
      data,
      value: 0n,
    };
  } catch (error) {
    throw new Error(`Failed to generate create coin call data: ${error instanceof Error ? error.message : String(error)}`);
  }
}