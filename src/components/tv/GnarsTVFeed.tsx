"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { tradeCoin } from "@zoralabs/coins-sdk";
import type { TradeParameters } from "@zoralabs/coins-sdk";
import { toast } from "sonner";
import { parseEther } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { useMiniApp } from "@/components/miniapp/MiniAppProvider";
import { TVControls } from "./TVControls";
import { TVHeader } from "./TVHeader";
import { TVEmptyState, TVEndOfFeed, TVLoadingMore } from "./TVLoadingStates";
import { TVVideoCardInfo } from "./TVVideoCardInfo";
import type { TVItem } from "./types";
import { usePreloadTrigger, useTVFeed } from "./useTVFeed";

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

  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { isInMiniApp, share: miniAppShare } = useMiniApp();

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

  // Mint droposal handler - opens droposal page for full minting experience
  const handleMintDroposal = useCallback((item: TVItem, quantity: number) => {
    if (!item.proposalNumber) {
      toast.error("Unable to find droposal details");
      return;
    }

    // Open droposal detail page in new tab for full mint experience
    // This leverages existing infrastructure and allows user to see full details
    const url = `/droposals/${item.proposalNumber}`;

    toast.info(`Opening droposal #${item.proposalNumber}...`, {
      description: `Mint ${quantity} NFT${quantity > 1 ? "s" : ""} on the detail page`,
    });

    window.open(url, "_blank");
  }, []);

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
