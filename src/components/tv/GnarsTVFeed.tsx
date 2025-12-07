"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { tradeCoin } from "@zoralabs/coins-sdk";
import type { TradeParameters } from "@zoralabs/coins-sdk";
import { toast } from "sonner";
import { createPublicClient, http, parseEther } from "viem";
import { base } from "viem/chains";
import { useAccount, usePublicClient, useWalletClient, useWriteContract, useSwitchChain } from "wagmi";
import { useMiniApp } from "@/components/miniapp/MiniAppProvider";
import { GNARS_ADDRESSES } from "@/lib/config";
import { zoraNftMintAbi, ZORA_PROTOCOL_REWARD } from "@/utils/abis/zoraNftMintAbi";
import { TVControls } from "./TVControls";
import { TVHeader } from "./TVHeader";
import { TVEmptyState, TVEndOfFeed, TVLoadingMore } from "./TVLoadingStates";
import { TVVideoCardInfo } from "./TVVideoCardInfo";
import type { TVItem } from "./types";
import { usePreloadTrigger, useTVFeed } from "./useTVFeed";

// Treasury receives referral rewards
const MINT_REFERRAL = GNARS_ADDRESSES.treasury as `0x${string}`;

interface GnarsTVFeedProps {
  priorityCoinAddress?: string;
}

/**
 * Full-screen TikTok-style video feed for Gnars TV
 * Displays content coins from curated creators with buying functionality
 */
export function GnarsTVFeed({ priorityCoinAddress }: GnarsTVFeedProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [playCount, setPlayCount] = useState(0);
  const [isBuying, setIsBuying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [supportAmount, setSupportAmount] = useState("0.00042");
  const [showAmountMenu, setShowAmountMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAutoplayMode, setIsAutoplayMode] = useState(false);
  const [mintQuantity, setMintQuantity] = useState(1);

  const fullContainerRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  // Cache for resolved token addresses (droposal ID -> token address)
  const tokenAddressCacheRef = useRef<Map<string, string>>(new Map());

  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { isInMiniApp, share: miniAppShare } = useMiniApp();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  // Fetch TV feed data
  const { items, loading, loadingMore, error, hasMoreContent, loadMore } = useTVFeed({
    priorityCoinAddress,
  });

  // Filter to only video items
  const videoItems = useMemo(() => items.filter((i) => i.videoUrl), [items]);

  // Trigger preload when near end
  usePreloadTrigger(activeIndex, videoItems.length, hasMoreContent, loadingMore, loading, loadMore);

  // Reset index when items change
  useEffect(() => {
    setActiveIndex(0);
    setPlayCount(0);
  }, [items.length]);

  // Intersection observer for video playback
  useEffect(() => {
    if (!videoItems.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          const idx = Number(video.dataset.index || "0");

          if (entry.isIntersecting) {
            setActiveIndex(idx);
            setPlayCount(0);
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.6 },
    );

    videoRefs.current.forEach((el) => el && observer.observe(el));

    return () => observer.disconnect();
  }, [videoItems.length]);

  // Handle video end - play twice then advance
  const handleVideoEnd = useCallback(() => {
    if (!videoItems.length) return;
    const nextIndex = (activeIndex + 1) % videoItems.length;

    if (isAutoplayMode || playCount + 1 >= 2) {
      setPlayCount(0);
      setActiveIndex(nextIndex);

      const container = fullContainerRef.current;
      if (container) {
        const targetTop = nextIndex * container.clientHeight;
        container.scrollTo({ top: targetTop, behavior: "smooth" });
      }
    } else {
      setPlayCount((prev) => prev + 1);
    }
  }, [videoItems.length, activeIndex, isAutoplayMode, playCount]);

  // Mute toggle
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const newMuted = !prev;
      videoRefs.current.forEach((video) => {
        if (video) video.muted = newMuted;
      });
      return newMuted;
    });
  }, []);

  // Play/pause toggle
  const togglePlayPause = useCallback(() => {
    const currentVideo = videoRefs.current[activeIndex];
    if (currentVideo) {
      if (currentVideo.paused) {
        currentVideo.play();
        setIsPaused(false);
      } else {
        currentVideo.pause();
        setIsPaused(true);
      }
    }
  }, [activeIndex]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(async () => {
    const container = fullContainerRef.current?.parentElement;
    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
        setIsFullscreen(true);
        setIsAutoplayMode(true);
        setIsMuted(false);
        videoRefs.current.forEach((video) => {
          if (video) video.muted = false;
        });
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
        setIsAutoplayMode(false);
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  }, []);

  // Listen for fullscreen exit
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
        setIsAutoplayMode(false);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Share handler
  const handleShare = useCallback(async () => {
    const item = videoItems[activeIndex];
    const url = item?.coinAddress
      ? `${window.location.origin}/tv/${item.coinAddress}`
      : `${window.location.origin}/tv`;

    const shareData = {
      title: item?.title || "Gnars TV",
      text: item?.title || "Watch on Gnars TV",
      url,
    };

    try {
      if (isInMiniApp) {
        await miniAppShare({ text: shareData.text, url: shareData.url });
      } else if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;

      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(url);
          toast.success("Link copied to clipboard");
        } else {
          toast.error("Unable to share right now");
        }
      } catch {
        toast.error("Unable to share right now");
      }
    }
  }, [videoItems, activeIndex, isInMiniApp, miniAppShare]);

  // Buy coin handler
  const handleBuyCoin = useCallback(
    async (coinAddress: string, coinTitle: string) => {
      if (!isConnected || !address) {
        toast.error("Please connect your wallet first");
        return;
      }

      if (!walletClient || !publicClient) {
        toast.error("Wallet not ready");
        return;
      }

      setIsBuying(true);
      const buyToast = toast.loading(`Buying ${coinTitle}...`);

      try {
        const tradeParameters: TradeParameters = {
          sell: { type: "eth" },
          buy: { type: "erc20", address: coinAddress as `0x${string}` },
          amountIn: parseEther(supportAmount),
          slippage: 0.05,
          sender: address,
        };

        await tradeCoin({
          tradeParameters,
          walletClient,
          account: walletClient.account,
          publicClient,
        });

        toast.success(`Successfully bought ${coinTitle}!`, { id: buyToast });
      } catch (err) {
        console.error("Buy coin error:", err);

        const errorMessage = err instanceof Error ? err.message : String(err);
        const isUserRejection =
          errorMessage.includes("User denied") ||
          errorMessage.includes("User rejected") ||
          errorMessage.includes("user rejected");

        if (isUserRejection) {
          toast.error("Such a tease...rejected the transaction 😢", { id: buyToast });
        } else {
          toast.error(
            err instanceof Error ? err.message : "Failed to buy coin. Please try again.",
            { id: buyToast },
          );
        }
      } finally {
        setIsBuying(false);
      }
    },
    [isConnected, address, walletClient, publicClient, supportAmount],
  );

  // Resolve token address from execution transaction hash
  const resolveTokenAddress = useCallback(async (item: TVItem): Promise<string | null> => {
    // Check cache first
    const cached = tokenAddressCacheRef.current.get(item.id);
    if (cached) return cached;

    // If already have tokenAddress, cache and return
    if (item.tokenAddress) {
      tokenAddressCacheRef.current.set(item.id, item.tokenAddress);
      return item.tokenAddress;
    }

    // Need to resolve from execution transaction hash
    if (!item.executionTransactionHash) {
      return null;
    }

    try {
      const client = createPublicClient({ chain: base, transport: http() });
      const receipt = await client.getTransactionReceipt({
        hash: item.executionTransactionHash as `0x${string}`,
      });

      if (receipt.logs && receipt.logs.length > 0) {
        const tokenAddr = receipt.logs[0]?.address;
        if (tokenAddr) {
          tokenAddressCacheRef.current.set(item.id, tokenAddr);
          return tokenAddr;
        }
      }
    } catch (err) {
      console.error("[gnars-tv] Failed to resolve token address:", err);
    }

    return null;
  }, []);

  // Mint droposal handler - mints directly from TV feed
  const handleMintDroposal = useCallback(
    async (item: TVItem, quantity: number) => {
      if (!isConnected || !address) {
        toast.error("Please connect your wallet first");
        return;
      }

      const mintToast = toast.loading(`Preparing to mint ${item.title}...`);
      setIsBuying(true);

      try {
        // Check if on correct network, switch if needed
        if (chain?.id !== base.id) {
          toast.loading("Switching to Base network...", { id: mintToast });
          await switchChainAsync({ chainId: base.id });
        }

        // Resolve token address (may need to fetch from execution receipt)
        toast.loading("Resolving NFT contract...", { id: mintToast });
        const tokenAddress = await resolveTokenAddress(item);

        if (!tokenAddress) {
          toast.error("Unable to find NFT contract", {
            id: mintToast,
            description: "This droposal may not be ready for minting yet.",
          });
          return;
        }

        // Calculate total price with protocol reward
        const priceEth = item.priceEth ? parseFloat(item.priceEth) : 0;
        const salePrice = priceEth * quantity;
        const protocolReward = ZORA_PROTOCOL_REWARD * quantity;
        const totalPrice = parseEther((salePrice + protocolReward).toFixed(18));

        // Wait for wallet confirmation
        toast.loading("Confirm in your wallet...", {
          id: mintToast,
          description: `Minting ${quantity} NFT${quantity > 1 ? "s" : ""} for ${(salePrice + protocolReward).toFixed(5)} ETH`,
        });

        // Execute mint transaction
        const txHash = await writeContractAsync({
          abi: zoraNftMintAbi,
          address: tokenAddress as `0x${string}`,
          functionName: "mintWithRewards",
          args: [
            address, // recipient
            BigInt(quantity), // quantity
            "", // comment
            MINT_REFERRAL, // mintReferral (treasury)
          ],
          value: totalPrice,
          chainId: base.id,
        });

        toast.success(`Successfully minted ${item.title}!`, {
          id: mintToast,
          description: `Transaction: ${txHash.slice(0, 10)}…${txHash.slice(-4)}`,
        });
      } catch (err) {
        console.error("Mint droposal error:", err);

        const errorMessage = err instanceof Error ? err.message : String(err);
        const isUserRejection =
          errorMessage.includes("rejected") ||
          errorMessage.includes("denied") ||
          errorMessage.includes("User rejected");

        if (isUserRejection) {
          toast.error("Transaction cancelled", {
            id: mintToast,
            description: "You rejected the transaction in your wallet.",
          });
        } else if (errorMessage.includes("insufficient funds")) {
          toast.error("Insufficient funds", {
            id: mintToast,
            description: "You don't have enough ETH to complete this mint.",
          });
        } else if (
          errorMessage.includes("Sale_Inactive") ||
          errorMessage.includes("sale not active")
        ) {
          toast.error("Sale not active", {
            id: mintToast,
            description: "The sale is not currently active.",
          });
        } else {
          toast.error("Mint failed", {
            id: mintToast,
            description: errorMessage.slice(0, 100),
          });
        }
      } finally {
        setIsBuying(false);
      }
    },
    [isConnected, address, chain, switchChainAsync, writeContractAsync, resolveTokenAddress],
  );

  return (
    <div className="fixed inset-0 z-40 bg-black text-white">
      <TVHeader isMuted={isMuted} onToggleMute={toggleMute} />

      <div
        ref={fullContainerRef}
        className="h-screen w-full snap-y snap-mandatory overflow-y-auto overscroll-none"
      >
        {videoItems.length === 0 ? (
          <TVEmptyState loading={loading} error={error} />
        ) : (
          videoItems.map((item, idx) => (
            <div
              key={item.id}
              className="relative h-screen w-full flex-shrink-0 snap-start snap-always"
            >
              <video
                ref={(el) => {
                  videoRefs.current[idx] = el;
                }}
                data-index={idx}
                src={item.videoUrl}
                poster={item.imageUrl}
                className="absolute inset-0 h-full w-full object-contain bg-black"
                muted={isMuted}
                playsInline
                loop={false}
                controls={false}
                preload="metadata"
                onEnded={handleVideoEnd}
                onLoadedData={() => setPlayCount(0)}
              />

              <TVControls
                isMuted={isMuted}
                isPaused={isPaused}
                isFullscreen={isFullscreen}
                onToggleMute={toggleMute}
                onTogglePlayPause={togglePlayPause}
                onToggleFullscreen={toggleFullscreen}
                onShare={handleShare}
              />

              <TVVideoCardInfo
                item={item}
                isBuying={isBuying}
                isConnected={isConnected}
                supportAmount={supportAmount}
                showAmountMenu={showAmountMenu}
                mintQuantity={mintQuantity}
                onBuy={handleBuyCoin}
                onMint={handleMintDroposal}
                onAmountMenuToggle={setShowAmountMenu}
                onAmountSelect={setSupportAmount}
                onQuantitySelect={setMintQuantity}
              />
            </div>
          ))
        )}

        {loadingMore && <TVLoadingMore />}

        {!hasMoreContent && videoItems.length > 0 && !loading && (
          <TVEndOfFeed totalVideos={videoItems.length} />
        )}
      </div>
    </div>
  );
}
