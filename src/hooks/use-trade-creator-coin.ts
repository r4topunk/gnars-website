import { useState } from "react";
import { tradeCoin, setApiKey, type TradeParameters } from "@zoralabs/coins-sdk";
import { parseEther } from "viem";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { toast } from "sonner";

// Track API key configuration status
let isApiKeyConfigured = false;

// Initialize API key
if (typeof window !== "undefined") {
  const apiKey = process.env.NEXT_PUBLIC_ZORA_API_KEY;

  if (!apiKey) {
    const message =
      "Missing NEXT_PUBLIC_ZORA_API_KEY environment variable - Zora creator coin trading will not work";
    console.error(`[use-trade-creator-coin] ${message}`);
    isApiKeyConfigured = false;
  } else {
    setApiKey(apiKey);
    isApiKeyConfigured = true;
  }
}

interface TradeCreatorCoinParams {
  creatorCoinAddress: string;
  amountInEth: string; // Amount of ETH to spend (e.g., "0.001")
}

export function useTradeCreatorCoin() {
  const [isTrading, setIsTrading] = useState(false);
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const buyCreatorCoin = async ({ creatorCoinAddress, amountInEth }: TradeCreatorCoinParams) => {
    // Check API key configuration before proceeding
    if (!isApiKeyConfigured) {
      const errorMsg =
        "Zora API key not configured. Cannot process creator token trades. Please set NEXT_PUBLIC_ZORA_API_KEY.";
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }

    if (!address || !walletClient || !publicClient) {
      toast.error("Please connect your wallet");
      return;
    }

    const toastId = toast.loading(`Buying creator token...`);
    setIsTrading(true);

    try {
      const tradeParameters: TradeParameters = {
        sell: { type: "eth" },
        buy: {
          type: "erc20",
          address: creatorCoinAddress as `0x${string}`,
        },
        amountIn: parseEther(amountInEth),
        slippage: 0.05, // 5% slippage tolerance
        sender: address,
      };

      await tradeCoin({
        tradeParameters,
        walletClient,
        account: walletClient.account,
        publicClient,
      });

      toast.success("Successfully bought creator token!", { id: toastId });
      return true;
    } catch (err) {
      console.error("Failed to buy creator token:", err);
      
      // Extract error message with gnarly treatment for user rejection
      let errorMessage = "Failed to buy creator token";
      
      if (err instanceof Error) {
        const errorStr = err.message.toLowerCase();
        
        // Check for user rejection
        if (
          errorStr.includes("user rejected") ||
          errorStr.includes("user denied") ||
          errorStr.includes("rejected the request") ||
          errorStr.includes("denied transaction")
        ) {
          const gnarlyMessages = [
            "User farted and cancelled the transaction 💨",
            "Cold feet? Transaction cancelled by user 🥶",
            "User said 'nah' and bounced 🏃‍♂️",
            "Chickened out of the trade 🐔",
            "User hit the eject button ⏏️",
            "NGMI - User rejected the transaction 📉",
          ];
          errorMessage = gnarlyMessages[Math.floor(Math.random() * gnarlyMessages.length)];
        } else {
          errorMessage = err.message;
        }
      }
      
      toast.error(errorMessage, { id: toastId });
      return false;
    } finally {
      setIsTrading(false);
    }
  };

  return {
    buyCreatorCoin,
    isTrading,
  };
}
