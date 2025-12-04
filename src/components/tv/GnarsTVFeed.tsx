"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { getProfileCoins, setApiKey, tradeCoin } from "@zoralabs/coins-sdk";
import type { TradeParameters } from "@zoralabs/coins-sdk";
import { Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { parseEther } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { Button } from "@/components/ui/button";

type TVItem = {
  id: string;
  title: string;
  creator: string;
  creatorName?: string;
  creatorAvatar?: string;
  symbol?: string;
  imageUrl?: string;
  videoUrl?: string;
  coinAddress?: string;
  marketCap?: number;
  allTimeHigh?: number;
  platformReferrer?: string;
  poolCurrencyTokenAddress?: string;
};

type CoinMedia = {
  mimeType?: string; // 👈 important: comes from mediaContent.mimeType
  previewImage?: { url?: string; medium?: string; small?: string } | string;
  previewUrl?: string;
  image?: string;
  posterUrl?: string;
  originalUri?: string;
  animationUrl?: string;
  videoUrl?: string;
  url?: string;
};

type CoinNode = {
  address?: string;
  contract?: string;
  id?: string;
  name?: string;
  displayName?: string;
  symbol?: string;
  imageUrl?: string;
  platformReferrer?: string;
  platformReferrerAddress?: string;
  marketCap?: number;
  marketCapDelta24h?: number;
  allTimeHigh?: number;
  poolCurrencyToken?: {
    address?: string;
    name?: string;
  };
  creatorProfile?: {
    handle?: string;
    avatar?: {
      previewImage?: { url?: string; medium?: string; small?: string };
    };
    socialAccounts?: {
      farcaster?: { displayName?: string };
      twitter?: { displayName?: string };
    };
  };
  mediaContent?: CoinMedia;
  media?: CoinMedia;
  coin?: {
    address?: string;
    name?: string;
    displayName?: string;
    symbol?: string;
    imageUrl?: string;
    platformReferrer?: string;
    platformReferrerAddress?: string;
    marketCap?: number;
    marketCapDelta24h?: number;
    allTimeHigh?: number;
    poolCurrencyToken?: {
      address?: string;
      name?: string;
    };
    creatorProfile?: {
      handle?: string;
      avatar?: {
        previewImage?: { url?: string; medium?: string; small?: string };
      };
      socialAccounts?: {
        farcaster?: { displayName?: string };
        twitter?: { displayName?: string };
      };
    };
    mediaContent?: CoinMedia;
    media?: CoinMedia;
  };
};

type CoinEdge = {
  node?: CoinNode | { coin?: CoinNode };
};

// TODO: Add all gnars holders/flows shredders + filters and replace with dynamic list

const CREATOR_ADDRESSES = [
  "0x41cb654d1f47913acab158a8199191d160dabe4a", //vlad
  "0x26331fda472639a54d02053a2b33dce5036c675b",
  "0xa642b91ff941fb68919d1877e9937f3e369dfd68",
  "0x2feb329b9289b60064904fa61fc347157a5aed6a", // zima
  "0xddb4938755c243a4f60a2f2f8f95df4f894c58cc", //will dias
  "0x406fdb58c6739a60bae0dd7c07ee903686344338",
  "0xc9f669e08820a0f89a5a8d4a5ce85e9236dd83b6",
  "0x1f1e8194c2dfcb3aa5cbb797d98ae83dda22c891", //humbertoperes
  "0xd1195629d9ba1168591b8ecdec9abb1721fcc7d8", // nogenta
];

const FALLBACK_ITEMS: TVItem[] = [
  {
    id: "fallback-gnars",
    title: "Gnars DAO",
    creator: CREATOR_ADDRESSES[0],
    symbol: "GNAR",
    imageUrl: "/gnars.webp",
    videoUrl: undefined,
  },
];

export function GnarsTVFeed() {
  const [items, setItems] = useState<TVItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [playCount, setPlayCount] = useState(0);
  const [isBuying, setIsBuying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const fullContainerRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);

  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const toHttp = (uri?: string | null): string | undefined => {
    if (!uri) return undefined;
    if (uri.startsWith("ipfs://")) {
      return uri.replace("ipfs://", "https://ipfs.io/ipfs/");
    }
    return uri;
  };

  // Helper to detect video-ish URLs when mimeType is missing
  const isLikelyVideoUrl = (url?: string | null) => {
    if (!url) return false;
    const lower = url.split("?")[0].toLowerCase();
    return (
      lower.endsWith(".mp4") ||
      lower.endsWith(".webm") ||
      lower.endsWith(".mov") ||
      lower.endsWith(".m4v") ||
      lower.endsWith(".ogg")
    );
  };

  // Fisher-Yates shuffle algorithm for efficient random sorting
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const mediaFromCoin = (coin: CoinNode) => {
    const media: CoinMedia =
      coin?.mediaContent || coin?.media || coin?.coin?.mediaContent || coin?.coin?.media || {};

    const mimeType = media?.mimeType;

    const previewImage = media?.previewImage;
    const previewRaw =
      (typeof previewImage === "object"
        ? previewImage?.url || previewImage?.medium || previewImage?.small
        : previewImage) ||
      media?.previewUrl ||
      media?.image ||
      media?.posterUrl ||
      coin?.imageUrl;

    const originalRaw = media?.originalUri || media?.animationUrl || media?.videoUrl || media?.url;

    const imageUrl = toHttp(previewRaw);

    let videoUrl: string | undefined;

    // ✅ Primary: trust mimeType from Zora
    if (mimeType?.startsWith("video/")) {
      videoUrl = toHttp(originalRaw || previewRaw);
    }

    // ✅ Fallback: no mimeType, but URL looks like video
    if (!videoUrl && originalRaw && isLikelyVideoUrl(originalRaw)) {
      videoUrl = toHttp(originalRaw);
    }

    return {
      imageUrl,
      videoUrl,
    };
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        if (process.env.NEXT_PUBLIC_ZORA_API_KEY) {
          setApiKey(process.env.NEXT_PUBLIC_ZORA_API_KEY);
        }

        const results = await Promise.all(
          CREATOR_ADDRESSES.map(async (creatorAddress) => {
            try {
              const response = await getProfileCoins({
                identifier: creatorAddress,
                count: 20,
              });

              const edges: CoinEdge[] =
                (response?.data?.profile?.createdCoins?.edges as CoinEdge[]) || [];

              const coins = edges
                .map((edge) => {
                  const node = edge?.node;
                  if (!node) return null;
                  return "coin" in node ? node.coin : node;
                })
                .filter((coin): coin is CoinNode => coin !== null);

              // ✅ keep only coins that actually have a video
              const videoItemsForCreator = coins
                .map((coin, idx): TVItem | null => {
                  const media = mediaFromCoin(coin);
                  if (!media.videoUrl) return null; // only REAL video coins

                  const creator = coin?.creatorProfile || coin?.coin?.creatorProfile;
                  const creatorAvatar =
                    creator?.avatar?.previewImage?.small || creator?.avatar?.previewImage?.medium;
                  const creatorName =
                    creator?.socialAccounts?.farcaster?.displayName ||
                    creator?.socialAccounts?.twitter?.displayName ||
                    creator?.handle;

                  // Calculate ATH from current marketCap + delta
                  const marketCapRaw = coin?.marketCap || coin?.coin?.marketCap;
                  const marketCapDelta24hRaw =
                    coin?.marketCapDelta24h || coin?.coin?.marketCapDelta24h;

                  // Parse as numbers and handle string/undefined cases
                  const marketCap =
                    typeof marketCapRaw === "string" ? parseFloat(marketCapRaw) : marketCapRaw || 0;
                  const marketCapDelta24h =
                    typeof marketCapDelta24hRaw === "string"
                      ? parseFloat(marketCapDelta24hRaw)
                      : marketCapDelta24hRaw || 0;

                  // ATH is current marketCap + positive delta (if delta is negative, ATH is current + abs(delta))
                  const allTimeHigh =
                    marketCap > 0 ? marketCap + Math.abs(marketCapDelta24h) : marketCap;

                  const platformReferrer = (
                    coin?.platformReferrerAddress ||
                    coin?.platformReferrer ||
                    coin?.coin?.platformReferrerAddress ||
                    coin?.coin?.platformReferrer ||
                    ""
                  ).toLowerCase();
                  const poolCurrencyTokenAddress = (
                    coin?.poolCurrencyToken?.address ||
                    coin?.coin?.poolCurrencyToken?.address ||
                    ""
                  ).toLowerCase();

                  // 🎯 LOG REFERRER AND PAIR MATCHING
                  const isGnarsReferral =
                    platformReferrer === "0x72ad986ebac0246d2b3c565ab2a1ce3a14ce6f88";
                  const isSpecialPair =
                    poolCurrencyTokenAddress === "0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b";

                  console.log(`🏷️ ${coin?.name}:`, {
                    platformReferrer,
                    poolCurrencyTokenAddress,
                    isGnarsReferral,
                    isSpecialPair,
                    willShowBadge: isGnarsReferral || isSpecialPair,
                  });

                  return {
                    id: coin?.address || coin?.contract || coin?.id || `${creatorAddress}-${idx}`,
                    title: coin?.name || coin?.displayName || "Untitled Coin",
                    creator: creatorAddress,
                    creatorName: creatorName,
                    creatorAvatar: toHttp(creatorAvatar),
                    symbol: coin?.symbol,
                    imageUrl: media.imageUrl || coin?.imageUrl,
                    videoUrl: media.videoUrl,
                    coinAddress: coin?.address || coin?.contract,
                    marketCap: marketCap,
                    allTimeHigh: allTimeHigh,
                    platformReferrer: platformReferrer,
                    poolCurrencyTokenAddress: poolCurrencyTokenAddress,
                  };
                })
                .filter((item): item is TVItem => item !== null);

              return videoItemsForCreator;
            } catch (err) {
              console.error("[gnars-tv] failed to fetch profile coins", {
                address: creatorAddress,
                err,
              });
              return [] as TVItem[];
            }
          }),
        );

        if (cancelled) return;

        const flattened = results.flat().filter(Boolean);

        // Sort items: Gnars Paired first, then Gnarly, then normal
        const sorted = flattened.sort((a, b) => {
          const aIsPaired =
            a.poolCurrencyTokenAddress === "0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b";
          const aIsGnarly = a.platformReferrer === "0x72ad986ebac0246d2b3c565ab2a1ce3a14ce6f88";
          const bIsPaired =
            b.poolCurrencyTokenAddress === "0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b";
          const bIsGnarly = b.platformReferrer === "0x72ad986ebac0246d2b3c565ab2a1ce3a14ce6f88";

          // Priority: Paired (1) > Gnarly (2) > Normal (3)
          const getPriority = (isPaired: boolean, isGnarly: boolean) => {
            if (isPaired) return 1;
            if (isGnarly) return 2;
            return 3;
          };

          const aPriority = getPriority(aIsPaired, aIsGnarly);
          const bPriority = getPriority(bIsPaired, bIsGnarly);

          return aPriority - bPriority;
        });

        // Shuffle within each priority group to mix creators
        const paired = sorted.filter(
          (item) => item.poolCurrencyTokenAddress === "0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b",
        );
        const gnarly = sorted.filter(
          (item) =>
            item.platformReferrer === "0x72ad986ebac0246d2b3c565ab2a1ce3a14ce6f88" &&
            item.poolCurrencyTokenAddress !== "0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b",
        );
        const normal = sorted.filter(
          (item) =>
            item.platformReferrer !== "0x72ad986ebac0246d2b3c565ab2a1ce3a14ce6f88" &&
            item.poolCurrencyTokenAddress !== "0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b",
        );

        // Interleave items from different creators within each group
        const interleaveByCreator = (items: TVItem[]) => {
          const byCreator = new Map<string, TVItem[]>();
          items.forEach((item) => {
            const creator = item.creator;
            if (!byCreator.has(creator)) {
              byCreator.set(creator, []);
            }
            byCreator.get(creator)!.push(item);
          });

          // Shuffle each creator's videos
          byCreator.forEach((videos, creator) => {
            byCreator.set(creator, shuffleArray(videos));
          });

          const result: TVItem[] = [];
          const creators = Array.from(byCreator.keys());
          let hasMore = true;

          while (hasMore) {
            hasMore = false;
            for (const creator of creators) {
              const videos = byCreator.get(creator)!;
              if (videos.length > 0) {
                result.push(videos.shift()!);
                hasMore = true;
              }
            }
          }

          return result;
        };

        const interleavedPaired = interleaveByCreator(paired);
        const interleavedGnarly = interleaveByCreator(gnarly);
        const interleavedNormal = interleaveByCreator(normal);

        const finalItems = [...interleavedPaired, ...interleavedGnarly, ...interleavedNormal];

        setItems(finalItems.length ? finalItems : FALLBACK_ITEMS);
      } catch (err) {
        if (cancelled) return;
        setError("Unable to load videos right now");
        setItems(FALLBACK_ITEMS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setActiveIndex(0);
    setPlayCount(0);
  }, [items]);

  // Only video items (extra safety; items are already filtered)
  const videoItems = useMemo(() => {
    return items.filter((i) => i.videoUrl);
  }, [items]);

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
            video.play().catch((err) => {
              console.log("Autoplay prevented:", err);
            });
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

  const handleVideoEnd = () => {
    if (!videoItems.length) return;
    const nextIndex = (activeIndex + 1) % videoItems.length;
    if (playCount + 1 >= 2) {
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
  };

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
    videoRefs.current.forEach((video) => {
      if (video) {
        video.muted = !isMuted;
      }
    });
  };

  const togglePlayPause = () => {
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
  };

  const handleBuyCoin = async (coinAddress: string, coinTitle: string) => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!walletClient || !publicClient) {
      toast.error("Wallet not ready");
      return;
    }

    if (!coinAddress) {
      toast.error("Coin address not available");
      return;
    }

    setIsBuying(true);
    const buyToast = toast.loading(`Buying ${coinTitle}...`);

    try {
      const tradeParameters: TradeParameters = {
        sell: { type: "eth" },
        buy: {
          type: "erc20",
          address: coinAddress as `0x${string}`,
        },
        amountIn: parseEther("0.00069"),
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
        toast.error(err instanceof Error ? err.message : "Failed to buy coin. Please try again.", {
          id: buyToast,
        });
      }
    } finally {
      setIsBuying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-black text-white">
      <div className="absolute left-0 right-0 top-0 z-50 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
        <div className="text-sm font-semibold pointer-events-auto">Gnar TV</div>
        <Button
          onClick={toggleMute}
          size="icon"
          variant="secondary"
          className="pointer-events-auto bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
        >
          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </Button>
      </div>
      <div
        ref={fullContainerRef}
        className="h-screen w-full snap-y snap-mandatory overflow-y-auto overscroll-none"
      >
        {videoItems.length === 0 ? (
          <div className="flex h-screen w-full items-center justify-center text-sm text-white/70">
            {loading ? "Loading videos..." : error || "No videos available"}
          </div>
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
                onEnded={handleVideoEnd}
                onLoadedData={() => setPlayCount(0)}
              />

              {/* Play/Pause and Mute controls */}
              <div className="absolute top-20 right-4 flex flex-col gap-2 z-30">
                <button
                  onClick={togglePlayPause}
                  className="pointer-events-auto w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-all"
                  aria-label={isPaused ? "Play" : "Pause"}
                >
                  {isPaused ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={toggleMute}
                  className="pointer-events-auto w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-all"
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>

              <div className="pointer-events-none absolute left-4 right-4 bottom-4 bg-black/90 p-3 rounded-xl backdrop-blur-md">
                {/* Title and Support Button */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="text-base font-semibold flex-1 leading-tight">{item.title}</p>
                  <div className="flex flex-col items-end gap-1.5">
                    {item.coinAddress && (
                      <button
                        onClick={() => handleBuyCoin(item.coinAddress!, item.title)}
                        disabled={isBuying || !isConnected}
                        className="pointer-events-auto px-5 py-2 rounded-full bg-white text-black text-sm font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isBuying ? (
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                            <span>Buying...</span>
                          </div>
                        ) : (
                          "Support"
                        )}
                      </button>
                    )}
                    {/* Special Badges below button */}
                    {(item.platformReferrer === "0x72ad986ebac0246d2b3c565ab2a1ce3a14ce6f88" ||
                      item.poolCurrencyTokenAddress ===
                        "0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b") && (
                      <div className="flex gap-1">
                        {item.platformReferrer === "0x72ad986ebac0246d2b3c565ab2a1ce3a14ce6f88" && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50">
                            <span className="text-amber-400 text-[9px] font-bold">⚡ GNARLY</span>
                          </div>
                        )}
                        {item.poolCurrencyTokenAddress ===
                          "0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b" && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50">
                            <span className="text-amber-400 text-[9px] font-bold">🤘 PAIRED</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Creator Info */}
                <div className="flex items-center gap-2 mb-2.5">
                  {item.creatorAvatar ? (
                    <img
                      src={item.creatorAvatar}
                      alt={item.creatorName || "Creator"}
                      width={20}
                      height={20}
                      className="rounded-full w-5 h-5 object-cover"
                      onError={(e) => {
                        console.error("Failed to load creator avatar:", item.creatorAvatar);
                        e.currentTarget.style.display = "none";
                        e.currentTarget.nextElementSibling?.classList.remove("hidden");
                      }}
                    />
                  ) : null}
                  <div
                    className={`w-5 h-5 rounded-full bg-white/20 flex-shrink-0 ${item.creatorAvatar ? "hidden" : ""}`}
                  />
                  <p className="text-xs text-white/70 truncate">
                    {item.creatorName || `${item.creator.slice(0, 6)}…${item.creator.slice(-4)}`}
                  </p>
                </div>

                {/* Market Cap with ATH Progress Bar - Zora style */}
                {item.marketCap !== undefined && item.allTimeHigh !== undefined && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="text-[#22c55e] text-xs">▲</span>
                        <span className="text-white text-xs font-semibold">
                          ${Math.round(item.marketCap).toLocaleString()}
                        </span>
                      </div>
                      <span className="text-white/50 text-xs">
                        ATH ${Math.round(item.allTimeHigh).toLocaleString()}
                      </span>
                    </div>
                    <div className="relative h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#22c55e] to-[#16a34a] rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min((item.marketCap / item.allTimeHigh) * 100, 100)}%`,
                          boxShadow: "0 0 12px rgba(34, 197, 94, 0.6)",
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
