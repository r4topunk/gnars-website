/**
 * useCreateCoin Hook
 *
 * Creates Zora Content Coins backed by Gnars Creator Coin using the
 * official @zoralabs/coins-sdk. This provides validated pool configurations
 * and proper contract interaction via the SDK.
 *
 * @see https://docs.zora.co/coins/sdk
 */

"use client";

import { useEffect, useState } from "react";
import { Address, Hex, decodeEventLog } from "viem";
import {
  useAccount,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from "wagmi";
import {
  zoraFactoryAbi,
  GNARS_CREATOR_COIN,
} from "@/lib/zora/factoryAbi";
import { PLATFORM_REFERRER } from "@/lib/config";
import {
  createMetadataBuilder,
  createZoraUploaderForCreator,
  setApiKey,
  createCoinCall,
  type CreateCoinArgs,
} from "@zoralabs/coins-sdk";
import { generateVideoThumbnail } from "@/lib/video-thumbnail";
import { getProfile } from "@zoralabs/coins-sdk";

// Type definitions for getProfile response
interface ProfileResponse {
  data?: {
    profile?: {
      id?: string;
      handle?: string;
      displayName?: string;
      avatar?: {
        small?: string;
        medium?: string;
        blurhash?: string;
      };
      creatorCoin?: {
        address?: string;
        name?: string;
        symbol?: string;
        marketCap?: string;
        marketCapDelta24h?: string;
        mediaContent?: {
          previewImage?: {
            small?: string;
            medium?: string;
            blurhash?: string;
          };
        };
      };
    };
  };
}

/**
 * Check if a wallet address has a creator coin deployed
 * Uses the Zora SDK's getProfile function to check for creator coin
 * @param address - Wallet address to check
 * @returns Promise with creator coin info or null
 */
export async function checkHasCreatorCoin(address: Address): Promise<{
  hasCreatorCoin: boolean;
  creatorCoinImage?: string;
  creatorCoinName?: string;
} | null> {
  if (!address) {
    console.log("[checkHasCreatorCoin] No address provided");
    return null;
  }
  
  console.log("[checkHasCreatorCoin] Checking creator coin for address:", address);
  
  try {
    // Use SDK's getProfile to check if user has a creator coin
    console.log("[checkHasCreatorCoin] Fetching profile via SDK...");
    const response = (await getProfile({
      identifier: address,
    })) as ProfileResponse;
    
    console.log("[checkHasCreatorCoin] Profile response:", response);
    
    const profile = response?.data?.profile;
    
    if (profile?.creatorCoin?.address) {
      const creatorCoinImage = profile.creatorCoin.mediaContent?.previewImage?.medium 
        || profile.creatorCoin.mediaContent?.previewImage?.small
        || profile.avatar?.medium
        || profile.avatar?.small;
      
      console.log("[checkHasCreatorCoin] ✅ Creator coin found:", {
        address: profile.creatorCoin.address,
        marketCap: profile.creatorCoin.marketCap,
        name: profile.creatorCoin.name,
        image: creatorCoinImage,
      });
      
      return {
        hasCreatorCoin: true,
        creatorCoinImage,
        creatorCoinName: profile.creatorCoin.name || profile.displayName,
      };
    } else {
      console.log("[checkHasCreatorCoin] ❌ No creator coin found in profile");
      return { hasCreatorCoin: false };
    }
  } catch (error) {
    console.log("[checkHasCreatorCoin] ❌ Error fetching profile:", error);
    if (error instanceof Error) {
      console.log("[checkHasCreatorCoin] Error message:", error.message);
    }
    return null;
  }
}

// Type for CoinCreatedV4 event args
interface CoinCreatedV4EventArgs {
  caller: Address;
  payoutRecipient: Address;
  platformReferrer: Address;
  currency: Address;
  uri: string;
  name: string;
  symbol: string;
  coin: Address;
  poolKey: {
    currency0: Address;
    currency1: Address;
    fee: number;
    tickSpacing: number;
    hooks: Address;
  };
  poolKeyHash: Hex;
  version: string;
}

export interface CreateCoinParams {
  name: string;
  symbol: string;
  description?: string;
  mediaFile: File;
  customThumbnail?: File;
  payoutRecipient?: Address;
  owners?: Address[];
  platformReferrer?: Address;
  startingMarketCap?: "LOW" | "HIGH";
  useUserCreatorCoin?: boolean;
}

export interface CoinDeploymentData {
  coin: Address;
  caller: Address;
  payoutRecipient: Address;
  platformReferrer: Address;
  currency: Address;
  name: string;
  symbol: string;
  poolKeyHash: Hex;
  poolKey: {
    currency0: Address;
    currency1: Address;
    fee: number;
    tickSpacing: number;
    hooks: Address;
  };
  version: string;
}

export function useCreateCoin() {
  const { address: userAddress } = useAccount();
  const { data: hash, sendTransaction, isPending: isWritePending, reset: resetTransaction } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash });

  const [deployedCoinAddress, setDeployedCoinAddress] = useState<Address | null>(null);
  const [deploymentData, setDeploymentData] = useState<CoinDeploymentData | null>(null);
  const [isPreparingTransaction, setIsPreparingTransaction] = useState(false);

  // Extract coin deployment data from transaction receipt
  useEffect(() => {
    if (isSuccess && receipt) {
      try {
        // Find and decode the CoinCreatedV4 event
        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: zoraFactoryAbi,
              data: log.data,
              topics: log.topics,
            });

            if (decoded.eventName === "CoinCreatedV4") {
              const args = decoded.args as CoinCreatedV4EventArgs;
              const data: CoinDeploymentData = {
                coin: args.coin,
                caller: args.caller,
                payoutRecipient: args.payoutRecipient,
                platformReferrer: args.platformReferrer,
                currency: args.currency,
                name: args.name,
                symbol: args.symbol,
                poolKeyHash: args.poolKeyHash,
                poolKey: args.poolKey,
                version: args.version,
              };

              setDeployedCoinAddress(data.coin);
              setDeploymentData(data);
              break;
            }
          } catch {
            continue;
          }
        }
      } catch (error) {
        console.log("Error parsing deployment event:", error); 
        // Silent error - deployment succeeded but event parsing failed
      }
    }
  }, [isSuccess, receipt]);

  const createCoin = async (params: CreateCoinParams) => {
    const {
      name,
      symbol,
      description,
      mediaFile,
      customThumbnail,
      payoutRecipient,
      owners,
      platformReferrer,
      startingMarketCap = "LOW",
      useUserCreatorCoin = false,
    } = params;

    if (!userAddress) {
      throw new Error("No wallet connected. Please connect your wallet first.");
    }

    // Set preparing state to show immediate feedback
    setIsPreparingTransaction(true);

    try {
      // Upload metadata (image/video + description) to IPFS via Zora's uploader
      const builder = createMetadataBuilder()
        .withName(name)
        .withSymbol(symbol);

      if (description) {
        builder.withDescription(description);
      }

      // Authenticate with Zora API for metadata upload
      const apiKey = process.env.NEXT_PUBLIC_ZORA_API_KEY;
      if (!apiKey) {
        throw new Error("NEXT_PUBLIC_ZORA_API_KEY environment variable is required for metadata upload");
      }
      setApiKey(apiKey);

      const zoraUploader = createZoraUploaderForCreator(userAddress);

      // Handle different media types (following SkateHive approach)
      const isImage = mediaFile.type.startsWith("image/");
      const isVideo = mediaFile.type.startsWith("video/");

      if (isImage) {
        // Use withImage for image files (SDK validates these)
        builder.withImage(mediaFile);
      } else if (isVideo) {
        // For videos, use withMedia() for the video file and withImage() for thumbnail
        // Set the video as the main media (animation_url in metadata)
        builder.withMedia(mediaFile);

        if (customThumbnail) {
          // Use the custom thumbnail selected by user
          builder.withImage(customThumbnail);
        } else {
          try {
            // Auto-generate thumbnail for video
            const thumbnail = await generateVideoThumbnail(mediaFile);
            builder.withImage(thumbnail);
          } catch (thumbnailError) {
            throw new Error(`Failed to generate video thumbnail: ${thumbnailError instanceof Error ? thumbnailError.message : String(thumbnailError)}`);
          }
        }
      } else {
        throw new Error(`Unsupported media type: ${mediaFile.type}. Please use an image or video file.`);
      }

      // Upload the metadata
      const { createMetadataParameters } = await builder.upload(zoraUploader);

      const metadataUri = createMetadataParameters.metadata.uri;

      // Prepare SDK arguments
      const finalPayoutRecipient = payoutRecipient || userAddress;
      const finalPlatformReferrer = platformReferrer || PLATFORM_REFERRER;
      const additionalOwners = owners && owners.length > 0 ? owners : undefined;

      // Determine which creator coin to use based on user selection
      // When useUserCreatorCoin is true, validate user has a creator coin before proceeding
      let selectedCreator: Address;
      
      if (useUserCreatorCoin && userAddress) {
        console.log("[createCoin] User selected their creator coin, validating...");
        
        // Validate that user actually has a deployed creator coin
        const creatorCoinCheck = await checkHasCreatorCoin(userAddress);
        
        if (creatorCoinCheck?.hasCreatorCoin) {
          console.log("[createCoin] ✅ Creator coin validated, using user's creator coin");
          selectedCreator = userAddress; // SDK will resolve to their creator coin
        } else {
          console.error("[createCoin] ❌ User selected creator coin but none exists");
          throw new Error(
            "You don't have a creator coin deployed. Please deploy a creator coin first or use $GNARS backing."
          );
        }
      } else {
        console.log("[createCoin] Using GNARS creator coin as backing currency");
        selectedCreator = GNARS_CREATOR_COIN;
      }

      // Use SDK's createCoinCall to get validated transaction parameters
      // This handles pool configuration, parameter encoding, and API communication
      const sdkArgs: CreateCoinArgs = {
        creator: selectedCreator,
        name,
        symbol,
        metadata: {
          type: "RAW_URI",
          uri: metadataUri,
        },
        currency: "CREATOR_COIN",
        chainId: 8453, // Base
        startingMarketCap,
        platformReferrer: finalPlatformReferrer,
        additionalOwners,
        payoutRecipientOverride: finalPayoutRecipient !== userAddress ? finalPayoutRecipient : undefined,
      };

      console.log("Creator Coin:", selectedCreator);

      const txParams = await createCoinCall(sdkArgs);

      if (!txParams || txParams.length === 0) {
        throw new Error("Failed to generate transaction parameters from SDK");
      }

      // Use the first transaction (SDK returns an array but we only need one for content coins)
      const { to, data, value } = txParams[0]!;

      // Clear preparing state as wallet interaction begins
      setIsPreparingTransaction(false);

      // Deploy the coin using SDK-generated parameters
      sendTransaction({
        to,
        data,
        value,
      });
    } catch (error) {
      // Clear preparing state on error
      setIsPreparingTransaction(false);
      throw error;
    }
  };

  const resetHook = () => {
    resetTransaction();
    setDeployedCoinAddress(null);
    setDeploymentData(null);
    setIsPreparingTransaction(false);
  };

  return {
    createCoin,
    isPending: isWritePending || isConfirming,
    isPreparingTransaction,
    isSuccess,
    transactionHash: hash,
    coinAddress: deployedCoinAddress,
    deploymentData,
    reset: resetHook,
  };
}
