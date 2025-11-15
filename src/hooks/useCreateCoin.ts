/**
 * useCreateCoin Hook
 * 
 * Direct contract interaction hook for creating Zora Content Coins
 * backed by Gnars Creator Coin. Uses viem to call ZoraFactory.deploy()
 * instead of the Zora SDK.
 * 
 * This replaces useCreateZoraCoin with direct onchain calls.
 * 
 * @see https://docs.zora.co/coins/contracts/factory
 */

"use client";

import { useEffect, useState } from "react";
import { Address, Hex, keccak256, toBytes, decodeEventLog } from "viem";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import {
  zoraFactoryAbi,
  ZORA_FACTORY_ADDRESS,
  GNARS_CREATOR_COIN,
} from "@/lib/zora/factoryAbi";
import { encodeContentPoolConfigForCreator } from "@/lib/zora/poolConfig";
import { PLATFORM_REFERRER } from "@/lib/config";

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
import { 
  createMetadataBuilder, 
  createZoraUploaderForCreator,
  setApiKey 
} from "@zoralabs/coins-sdk";
import { generateVideoThumbnail } from "@/lib/video-thumbnail";

export interface CreateCoinParams {
  name: string;
  symbol: string;
  description?: string;
  mediaFile: File;
  customThumbnail?: File;
  payoutRecipient?: Address;
  owners?: Address[];
  platformReferrer?: Address;
  salt?: Hex;
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
  const publicClient = usePublicClient();
  const { data: hash, writeContract, isPending: isWritePending, reset: resetWriteContract } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash });

  const [predictedCoinAddress, setPredictedCoinAddress] = useState<Address | null>(null);
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
      salt,
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

      // Generate deterministic salt for CREATE2 address prediction
      const saltBytes = salt || keccak256(toBytes(`${name}-${symbol}-${Date.now()}`));

      // Prepare deployment parameters with defaults
      const finalPayoutRecipient = payoutRecipient || userAddress;
      const finalOwners = owners || [userAddress];
      const finalPlatformReferrer = platformReferrer || PLATFORM_REFERRER;
      
      // Encode pool configuration for Doppler Multi-Curve Uni V4
      // Uses Gnars Creator Coin as backing currency
      const poolConfig = encodeContentPoolConfigForCreator(GNARS_CREATOR_COIN);
      
      // Attempt to predict deployment address (optional - will get from event if this fails)
      try {
        const predicted = await publicClient?.readContract({
          address: ZORA_FACTORY_ADDRESS,
          abi: zoraFactoryAbi,
          functionName: "coinAddress",
          args: [
            userAddress,              // msgSender
            name,                     // name
            symbol,                   // symbol
            poolConfig,               // poolConfig
            finalPlatformReferrer,    // platformReferrer
            saltBytes,                // coinSalt
          ],
        });

        if (predicted) {
          setPredictedCoinAddress(predicted);
        }
      } catch (error) {
        console.log("Address prediction failed:", error);
        // Address prediction failed - will get actual address from deployment event
      }

      // Simulate transaction to validate it will succeed before sending
      try {
        await publicClient?.simulateContract({
          account: userAddress,
          address: ZORA_FACTORY_ADDRESS,
          abi: zoraFactoryAbi,
          functionName: "deploy",
          args: [
            finalPayoutRecipient,
            finalOwners,
            metadataUri,
            name,
            symbol,
            poolConfig,
            finalPlatformReferrer,
            "0x0000000000000000000000000000000000000000" as Address,
            "0x" as Hex,
            saltBytes,
          ],
          value: 0n,
        });
      } catch (simulationError: unknown) {
        const errorMessage = simulationError instanceof Error ? simulationError.message : String(simulationError);
        throw new Error(`Transaction would fail: ${errorMessage}`);
      }

      // Deploy the coin contract via ZoraFactory
      // Clear preparing state as wallet interaction begins
      setIsPreparingTransaction(false);
      
      writeContract({
        address: ZORA_FACTORY_ADDRESS,
        abi: zoraFactoryAbi,
        functionName: "deploy",
        args: [
          finalPayoutRecipient,              // payoutRecipient
          finalOwners,                       // owners[]
          metadataUri,                       // uri
          name,                              // name
          symbol,                            // symbol
          poolConfig,                        // poolConfig
          finalPlatformReferrer,             // platformReferrer
          "0x0000000000000000000000000000000000000000" as Address, // postDeployHook (none)
          "0x" as Hex,                       // postDeployHookData (empty)
          saltBytes,                         // coinSalt
        ],
        value: 0n,
      });
    } catch (error) {
      // Clear preparing state on error
      setIsPreparingTransaction(false);
      throw error;
    }
  };

  const resetHook = () => {
    resetWriteContract();
    setPredictedCoinAddress(null);
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
    predictedCoinAddress,
    coinAddress: deployedCoinAddress || predictedCoinAddress,
    deploymentData,
    reset: resetHook,
  };
}
