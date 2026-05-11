"use client";

import { useState } from "react";
import { setApiKey, tradeCoin, type TradeParameters } from "@zoralabs/coins-sdk";
import { toast } from "sonner";
import { viemAdapter } from "thirdweb/adapters/viem";
import { base } from "thirdweb/chains";
import { useActiveAccount, useActiveWallet } from "thirdweb/react";
import { parseEther, type PublicClient, type WalletClient } from "viem";
import { getThirdwebClient } from "@/lib/thirdweb";
import { normalizeTxError } from "@/lib/thirdweb-tx";

let isApiKeyConfigured = false;

if (typeof window !== "undefined") {
  const apiKey = process.env.NEXT_PUBLIC_ZORA_API_KEY;
  if (!apiKey) {
    console.error(
      "[use-trade-creator-coin] Missing NEXT_PUBLIC_ZORA_API_KEY environment variable - Zora creator coin trading will not work",
    );
    isApiKeyConfigured = false;
  } else {
    setApiKey(apiKey);
    isApiKeyConfigured = true;
  }
}

interface TradeCreatorCoinParams {
  creatorCoinAddress: string;
  amountInEth: string;
}

export function useTradeCreatorCoin() {
  const [isTrading, setIsTrading] = useState(false);
  const account = useActiveAccount();
  const wallet = useActiveWallet();

  const buyCreatorCoin = async ({ creatorCoinAddress, amountInEth }: TradeCreatorCoinParams) => {
    if (!isApiKeyConfigured) {
      const errorMsg =
        "Zora API key not configured. Cannot process creator token trades. Please set NEXT_PUBLIC_ZORA_API_KEY.";
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }

    const client = getThirdwebClient();
    if (!client) {
      toast.error("Thirdweb client not configured");
      throw new Error("Thirdweb client not configured");
    }

    if (!account || !wallet) {
      toast.error("Please connect your wallet");
      return;
    }

    const toastId = toast.loading("Buying creator token...");
    setIsTrading(true);

    try {
      // viemAdapter returns clients typed against thirdweb's bundled viem;
      // cast via unknown so the Zora SDK (which consumes the project's viem
      // types) accepts them. Structurally compatible at runtime.
      const walletClient = viemAdapter.wallet.toViem({
        wallet,
        chain: base,
        client,
      }) as unknown as WalletClient;
      const publicClient = viemAdapter.publicClient.toViem({
        chain: base,
        client,
      }) as unknown as PublicClient;

      const tradeParameters: TradeParameters = {
        sell: { type: "eth" },
        buy: {
          type: "erc20",
          address: creatorCoinAddress as `0x${string}`,
        },
        amountIn: parseEther(amountInEth),
        slippage: 0.05,
        sender: account.address as `0x${string}`,
      };

      await tradeCoin({
        tradeParameters,
        walletClient,
        account: walletClient.account!,
        publicClient,
      });

      toast.success("Successfully bought creator token!", { id: toastId });
      return true;
    } catch (err) {
      console.error("Failed to buy creator token:", err);

      const { category, message } = normalizeTxError(err);
      let errorMessage = message || "Failed to buy creator token";

      if (category === "user-rejected") {
        const gnarlyMessages = [
          "User farted and cancelled the transaction 💨",
          "Cold feet? Transaction cancelled by user 🥶",
          "User said 'nah' and bounced 🏃‍♂️",
          "Chickened out of the trade 🐔",
          "User hit the eject button ⏏️",
          "NGMI - User rejected the transaction 📉",
        ];
        errorMessage = gnarlyMessages[Math.floor(Math.random() * gnarlyMessages.length)];
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
