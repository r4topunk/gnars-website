"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { tradeCoin } from "@zoralabs/coins-sdk";
import type { TradeParameters } from "@zoralabs/coins-sdk";
import { toast } from "sonner";
import { createPublicClient, http, parseEther } from "viem";
import { base } from "viem/chains";
import {
  useAccount,
  usePublicClient,
  useSwitchChain,
  useWalletClient,
  useWriteContract,
} from "wagmi";
import { useMiniApp } from "@/components/miniapp/MiniAppProvider";
import { GNARS_ADDRESSES } from "@/lib/config";
import { ZORA_PROTOCOL_REWARD, zoraNftMintAbi } from "@/utils/abis/zoraNftMintAbi";
import { TVControls } from "./TVControls";
import { TVHeader } from "./TVHeader";
import { TVEmptyState, TVEndOfFeed, TVLoadingMore } from "./TVLoadingStates";
import { TVVideoCardInfo } from "./TVVideoCardInfo";
import { TVVideoPlayer } from "./TVVideoPlayer";
import type { TVItem } from "./types";
import { usePreloadTrigger, useTVFeed } from "./useTVFeed";
import { useVideoPreloader, useRenderBuffer } from "./useVideoPreloader";

// Treasury receives referral rewards
const MINT_REFERRAL = GNARS_ADDRESSES.treasury as `0x${string}`;

interface GnarsTVFeedProps {
  priorityCoinAddress?: string;
}

/**
 * Full-screen TikTok-style video feed for Gnars TV
 * Displays content coins from curated creators with buying functionality
 * 
 * Performance optimizations:
 * - Virtualized rendering: only mounts videos within buffer distance
 * - Intelligent preloading: preloads next videos based on connection quality
 * - Smooth transitions: poster → video with fade animations
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
  const containerRefs = useRef<Array<HTMLDivElement | null>>([]);
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

  // Get render buffer based on connection quality
  const renderBuffer = useRenderBuffer();

  // Preload upcoming videos
  useVideoPreloader(videoItems, activeIndex, !loading);

  // Trigger preload when near end
  usePreloadTrigger(activeIndex, videoItems.length, hasMoreContent, loadingMore, loading, loadMore);

  // Optimize scroll detection with Intersection Observer
  // This is more performant than scroll events and works better on mobile
  // Based on MDN best practices: https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
  useEffect(() => {
    const containers = containerRefs.current;
    if (containers.length === 0 || !fullContainerRef.current) return;

    // Observer options optimized for vertical video feed
    const observerOptions: IntersectionObserverInit = {
      root: fullContainerRef.current,
      // Small negative margin ensures video is considered active slightly before fully visible
      // This provides smoother transitions on fast scrolling
      rootMargin: "-10% 0px -10% 0px",
      // 0.5 threshold means callback fires when 50% of video is visible
      // Perfect for snap scrolling - video becomes active when centered
      threshold: 0.5,
    };

    // Callback runs on main thread - keep it fast!
    // Use requestIdleCallback for non-critical work if available
    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      // Process entries in order of intersection ratio (most visible first)
      // This ensures the most visible video becomes active first
      const sortedEntries = [...entries].sort(
        (a, b) => b.intersectionRatio - a.intersectionRatio
      );

      sortedEntries.forEach((entry) => {
        // Only consider entries that are actually intersecting
        // entry.isIntersecting is more reliable than checking ratio > 0
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          const idx = parseInt(entry.target.getAttribute("data-index") || "0", 10);
          
          // Use requestIdleCallback for state updates if available
          // Falls back to immediate execution on browsers that don't support it
          const updateState = () => {
            setActiveIndex((current) => {
              // Only update if actually changed to prevent unnecessary re-renders
              if (current !== idx) {
                setPlayCount(0);
                return idx;
              }
              return current;
            });
          };

          // For the active video index, responsiveness matters more than saving a tiny
          // amount of main-thread work; update immediately.
          updateState();
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersection, observerOptions);

    // Observe all video containers
    // Note: observer.observe() is called immediately for each element
    // The callback will fire for each element's initial intersection state
    containers.forEach((container) => {
      if (container) {
        observer.observe(container);
      }
    });

    // Cleanup: Always disconnect observer to prevent memory leaks
    return () => {
      observer.disconnect();
    };
  }, [videoItems]);

  // Helper to check if a video should be rendered
  const shouldRenderVideo = useCallback(
    (index: number) => Math.abs(index - activeIndex) <= renderBuffer,
    [activeIndex, renderBuffer]
  );

  // Reset index when items change
  useEffect(() => {
    setActiveIndex(0);
    setPlayCount(0);
  }, [items.length]);

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

  // Mute toggle - just update state, TVVideoPlayer handles the rest
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  // Play/pause toggle - find video element in active container
  const togglePlayPause = useCallback(() => {
    const container = containerRefs.current[activeIndex];
    const video = container?.querySelector("video");
    if (video) {
      if (video.paused) {
        video.play();
        setIsPaused(false);
      } else {
        video.pause();
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
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
        setIsAutoplayMode(false);
      }
    } catch {
      // Silently ignore fullscreen errors (often due to browser gesture policies)
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
        // Recursively extract all error messages from the cause chain
        const extractErrorMessages = (error: unknown): string => {
          const messages: string[] = [];
          let current = error;
          
          while (current) {
            if (current instanceof Error) {
              messages.push(current.message);
              current = 'cause' in current ? current.cause : null;
            } else {
              messages.push(String(current));
              break;
            }
          }
          
          return messages.join(' ').toLowerCase();
        };
        
        const fullError = extractErrorMessages(err);
        
        // Detect common error types - check rejection FIRST and be comprehensive
        const isUserRejection =
          fullError.includes("user denied") ||
          fullError.includes("user rejected") ||
          fullError.includes("rejected") ||
          fullError.includes("cancelled") ||
          fullError.includes("canceled") ||
          fullError.includes("action_rejected") ||
          fullError.includes("user cancelled");

        const isInsufficientFunds =
          fullError.includes("insufficient funds") ||
          fullError.includes("insufficient balance");

        const isNetworkError =
          !isUserRejection && // Don't match network if it's a rejection
          (fullError.includes("network") ||
           fullError.includes("rpc") ||
           fullError.includes("unknown rpc error"));

        const isGasError =
          !isUserRejection && // Don't match gas if it's a rejection
          (fullError.includes("intrinsic gas too low") ||
           (fullError.includes("gas") && fullError.includes("insufficient")));

        // Show friendly error messages
        if (isUserRejection) {
          toast.error("Transaction cancelled", {
            id: buyToast,
            description: "You rejected the transaction in your wallet.",
          });
        } else if (isInsufficientFunds) {
          toast.error("Insufficient balance", {
            id: buyToast,
            description: "You don't have enough ETH to complete this purchase.",
          });
        } else if (isGasError) {
          toast.error("Gas issue", {
            id: buyToast,
            description: "Not enough ETH to pay for gas fees.",
          });
        } else if (isNetworkError) {
          toast.error("Network error", {
            id: buyToast,
            description: "Unable to connect to network. Please try again.",
          });
        } else {
          // Generic error - show a simplified message
          toast.error("Transaction failed", {
            id: buyToast,
            description: "Unable to complete purchase. Please try again.",
          });
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
    } catch {
      // If token address resolution fails, treat as unresolved.
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
        style={{
          // Hardware acceleration for smoother scrolling
          WebkitOverflowScrolling: "touch",
          // Optimize scroll performance
          willChange: "scroll-position",
          // Contain layout to improve paint performance
          contain: "layout style paint",
        }}
      >
        {videoItems.length === 0 ? (
          <TVEmptyState loading={loading} error={error} />
        ) : (
          videoItems.map((item, idx) => {
            const isActive = idx === activeIndex;
            const shouldRender = shouldRenderVideo(idx);

            return (
              <div
                key={item.id}
                ref={(el) => {
                  containerRefs.current[idx] = el;
                }}
                data-index={idx}
                className="relative h-screen w-full flex-shrink-0 snap-start snap-always"
              >
                {/* Optimized video player with virtualization */}
                <TVVideoPlayer
                  src={item.videoUrl!}
                  poster={item.imageUrl}
                  isActive={isActive}
                  isMuted={isMuted}
                  shouldRender={shouldRender}
                  onEnded={handleVideoEnd}
                  onLoadedData={() => setPlayCount(0)}
                  index={idx}
                />

                {/* Only render controls and info for nearby videos */}
                {shouldRender && (
                  <>
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
                  </>
                )}
              </div>
            );
          })
        )}

        {loadingMore && <TVLoadingMore />}

        {!hasMoreContent && videoItems.length > 0 && !loading && (
          <TVEndOfFeed totalVideos={videoItems.length} />
        )}
      </div>
    </div>
  );
}
