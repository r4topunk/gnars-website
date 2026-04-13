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

import { useState } from "react";
import { type Address, decodeEventLog, encodeFunctionData, type Hex, keccak256, toBytes } from "viem";
import { prepareTransaction, waitForReceipt } from "thirdweb";
import { base } from "thirdweb/chains";
import { useSendTransaction } from "thirdweb/react";
import { useUserAddress } from "@/hooks/use-user-address";
import {
  createCoinCall,
  createMetadataBuilder,
  createZoraUploaderForCreator,
  getProfile,
  setApiKey,
  type CreateCoinArgs,
} from "@zoralabs/coins-sdk";
import { GNARS_CREATOR_COIN, PLATFORM_REFERRER } from "@/lib/config";
import { getThirdwebClient } from "@/lib/thirdweb";
import { zoraFactoryAbi, ZORA_FACTORY_ADDRESS } from "@/lib/zora/factoryAbi";
import { encodeContentPoolConfigForCreator } from "@/lib/zora/poolConfig";
import { generateVideoThumbnail } from "@/lib/video-thumbnail";

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
 * Check if a wallet address has a creator coin deployed.
 * Uses the Zora SDK's getProfile function to check for creator coin.
 */
export async function checkHasCreatorCoin(address: Address): Promise<{
  hasCreatorCoin: boolean;
  creatorCoinImage?: string;
  creatorCoinName?: string;
} | null> {
  if (!address) {
    return null;
  }

  try {
    const response = (await getProfile({
      identifier: address,
    })) as ProfileResponse;

    const profile = response?.data?.profile;

    if (profile?.creatorCoin?.address) {
      const creatorCoinImage =
        profile.creatorCoin.mediaContent?.previewImage?.medium ||
        profile.creatorCoin.mediaContent?.previewImage?.small ||
        profile.avatar?.medium ||
        profile.avatar?.small;

      return {
        hasCreatorCoin: true,
        creatorCoinImage,
        creatorCoinName: profile.creatorCoin.name || profile.displayName,
      };
    }
    return { hasCreatorCoin: false };
  } catch {
    return null;
  }
}

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
  const { address: userAddress } = useUserAddress();
  const sendTx = useSendTransaction();

  const [deployedCoinAddress, setDeployedCoinAddress] = useState<Address | null>(null);
  const [deploymentData, setDeploymentData] = useState<CoinDeploymentData | null>(null);
  const [transactionHash, setTransactionHash] = useState<Hex | undefined>(undefined);
  const [isPreparingTransaction, setIsPreparingTransaction] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

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

    const client = getThirdwebClient();
    if (!client) {
      throw new Error("Thirdweb client not configured.");
    }

    setIsPreparingTransaction(true);
    setIsSuccess(false);
    setDeployedCoinAddress(null);
    setDeploymentData(null);
    setTransactionHash(undefined);

    try {
      const builder = createMetadataBuilder().withName(name).withSymbol(symbol);

      if (description) {
        builder.withDescription(description);
      }

      const apiKey = process.env.NEXT_PUBLIC_ZORA_API_KEY;
      if (!apiKey) {
        throw new Error(
          "NEXT_PUBLIC_ZORA_API_KEY environment variable is required for metadata upload",
        );
      }
      setApiKey(apiKey);

      const zoraUploader = createZoraUploaderForCreator(userAddress);

      const isImage = mediaFile.type.startsWith("image/");
      const isVideo = mediaFile.type.startsWith("video/");

      if (isImage) {
        builder.withImage(mediaFile);
      } else if (isVideo) {
        builder.withMedia(mediaFile);
        if (customThumbnail) {
          builder.withImage(customThumbnail);
        } else {
          try {
            const thumbnail = await generateVideoThumbnail(mediaFile);
            builder.withImage(thumbnail);
          } catch (thumbnailError) {
            throw new Error(
              `Failed to generate video thumbnail: ${
                thumbnailError instanceof Error ? thumbnailError.message : String(thumbnailError)
              }`,
            );
          }
        }
      } else {
        throw new Error(
          `Unsupported media type: ${mediaFile.type}. Please use an image or video file.`,
        );
      }

      const { createMetadataParameters } = await builder.upload(zoraUploader);
      const metadataUri = createMetadataParameters.metadata.uri;

      const finalPayoutRecipient = payoutRecipient || userAddress;
      const finalPlatformReferrer = platformReferrer || PLATFORM_REFERRER;
      const additionalOwners = owners && owners.length > 0 ? owners : undefined;

      let to: Address;
      let data: Hex;
      let value: bigint;

      if (useUserCreatorCoin && userAddress) {
        const creatorCoinCheck = await checkHasCreatorCoin(userAddress);

        if (!creatorCoinCheck?.hasCreatorCoin) {
          console.error("[createCoin] User selected creator coin but none exists");
          throw new Error(
            "You don't have a creator coin deployed. Please deploy a creator coin first or use $GNARS backing.",
          );
        }

        const sdkArgs: CreateCoinArgs = {
          creator: userAddress,
          name,
          symbol,
          metadata: {
            type: "RAW_URI",
            uri: metadataUri,
          },
          currency: "CREATOR_COIN",
          chainId: 8453,
          startingMarketCap,
          platformReferrer: finalPlatformReferrer,
          additionalOwners,
          payoutRecipientOverride:
            finalPayoutRecipient !== userAddress ? finalPayoutRecipient : undefined,
        };

        const txParams = await createCoinCall(sdkArgs);

        if (!txParams || txParams.length === 0) {
          throw new Error("Failed to generate transaction parameters from SDK");
        }

        ({ to, data, value } = txParams[0]!);
      } else {
        const poolConfig = encodeContentPoolConfigForCreator(GNARS_CREATOR_COIN);

        const coinSalt = keccak256(
          toBytes(`${userAddress}-${name}-${symbol}-${Date.now()}`),
        );

        const ownersArray: Address[] = additionalOwners
          ? [userAddress, ...additionalOwners]
          : [userAddress];

        data = encodeFunctionData({
          abi: zoraFactoryAbi,
          functionName: "deploy",
          args: [
            finalPayoutRecipient,
            ownersArray,
            metadataUri,
            name,
            symbol,
            poolConfig,
            finalPlatformReferrer,
            "0x0000000000000000000000000000000000000000" as Address,
            "0x" as Hex,
            coinSalt,
          ],
        });

        to = ZORA_FACTORY_ADDRESS;
        value = 0n;
      }

      setIsPreparingTransaction(false);

      const tx = prepareTransaction({
        chain: base,
        to,
        data,
        value,
        client,
      });

      const sendResult = await sendTx.mutateAsync(tx);
      const txHash = sendResult.transactionHash as Hex;
      setTransactionHash(txHash);

      setIsConfirming(true);
      const receipt = await waitForReceipt({
        client,
        chain: base,
        transactionHash: txHash,
      });
      setIsConfirming(false);
      setIsSuccess(true);

      // Decode the CoinCreatedV4 event from the receipt logs
      try {
        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: zoraFactoryAbi,
              data: log.data,
              topics: log.topics,
            });

            if (decoded.eventName === "CoinCreatedV4") {
              const args = decoded.args as CoinCreatedV4EventArgs;
              const deployment: CoinDeploymentData = {
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

              setDeployedCoinAddress(deployment.coin);
              setDeploymentData(deployment);
              break;
            }
          } catch {
            continue;
          }
        }
      } catch {
        // Silent - deployment succeeded but event parsing failed
      }
    } catch (error) {
      setIsPreparingTransaction(false);
      setIsConfirming(false);
      throw error;
    }
  };

  const resetHook = () => {
    sendTx.reset();
    setDeployedCoinAddress(null);
    setDeploymentData(null);
    setTransactionHash(undefined);
    setIsPreparingTransaction(false);
    setIsConfirming(false);
    setIsSuccess(false);
  };

  return {
    createCoin,
    isPending: sendTx.isPending || isConfirming,
    isPreparingTransaction,
    isSuccess,
    transactionHash,
    coinAddress: deployedCoinAddress,
    deploymentData,
    reset: resetHook,
  };
}
