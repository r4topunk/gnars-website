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
  symbol?: string;
  imageUrl?: string;
  videoUrl?: string;
  coinAddress?: string;
};

type CoinMedia = {
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
  mediaContent?: CoinMedia;
  media?: CoinMedia;
  coin?: {
    address?: string;
    name?: string;
    displayName?: string;
    symbol?: string;
    imageUrl?: string;
    mediaContent?: CoinMedia;
    media?: CoinMedia;
  };
};

type CoinEdge = {
  node?: CoinNode | { coin?: CoinNode };
};

const CREATOR_ADDRESSES = [
  "0x41cb654d1f47913acab158a8199191d160dabe4a",
  "0x26331fda472639a54d02053a2b33dce5036c675b",
  "0xa642b91ff941fb68919d1877e9937f3e369dfd68",
  "0x2feb329b9289b60064904fa61fc347157a5aed6a",
  "0xddb4938755c243a4f60a2f2f8f95df4f894c58cc",
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

    const previewImage = media?.previewImage;
    const preview =
      (typeof previewImage === "object"
        ? previewImage?.url || previewImage?.medium || previewImage?.small
        : previewImage) ||
      media?.previewUrl ||
      media?.image ||
      media?.posterUrl;

    const animation = media?.originalUri || media?.animationUrl || media?.videoUrl || media?.url;

    return {
      imageUrl: toHttp(preview),
      videoUrl: toHttp(animation),
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
          CREATOR_ADDRESSES.map(async (address) => {
            try {
              const response = await getProfileCoins({
                identifier: address,
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

              return coins.map((coin, idx): TVItem => {
                const media = mediaFromCoin(coin);
                return {
                  id: coin?.address || coin?.contract || coin?.id || `${address}-${idx}`,
                  title: coin?.name || coin?.displayName || "Untitled Coin",
                  creator: address,
                  symbol: coin?.symbol,
                  imageUrl: media.imageUrl || coin?.imageUrl,
                  videoUrl: media.videoUrl,
                  coinAddress: coin?.address || coin?.contract,
                };
              });
            } catch (err) {
              console.error("[gnars-tv] failed to fetch profile coins", { address, err });
              return [] as TVItem[];
            }
          }),
        );

        if (cancelled) return;

        const flattened = results.flat().filter(Boolean);
        // Shuffle the items for variety, but only once when loaded
        const shuffled = shuffleArray(flattened);
        setItems(shuffled.length ? shuffled : FALLBACK_ITEMS);
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

  // Memoize and shuffle video items for performance
  const videoItems = useMemo(() => {
    const videos = items.filter((i) => i.videoUrl);
    return videos;
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
            // Play the video when it comes into view
            video.play().catch((err) => {
              console.log("Autoplay prevented:", err);
            });
          } else {
            // Pause videos that are out of view
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
    setIsMuted(!isMuted);
    // Update all video elements
    videoRefs.current.forEach((video) => {
      if (video) {
        video.muted = !isMuted;
      }
    });
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
        amountIn: parseEther("0.00069"), // 0.00069 ETH
        slippage: 0.05, // 5% slippage tolerance
        sender: address,
      };

      const receipt = await tradeCoin({
        tradeParameters,
        walletClient,
        account: walletClient.account,
        publicClient,
      });

      toast.success(`Successfully bought ${coinTitle}!`, { id: buyToast });
    } catch (err) {
      console.error("Buy coin error:", err);

      // Check if user rejected the transaction
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
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
        <div className="text-sm font-semibold">Gnars TV</div>
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
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 pb-8">
                <p className="text-lg font-semibold">{item.title}</p>
                <p className="text-sm text-white/80 mt-1">
                  Creator {item.creator.slice(0, 6)}…{item.creator.slice(-4)}
                </p>
                {item.symbol && <p className="text-xs text-white/60 mt-1">{item.symbol}</p>}
              </div>

              {/* Mute/Unmute Button */}
              <Button
                onClick={toggleMute}
                size="icon"
                variant="secondary"
                className="pointer-events-auto absolute top-6 right-6 z-20 bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>

              {/* Buy Button with Gnars Logo */}
              {item.coinAddress && (
                <Button
                  onClick={() => handleBuyCoin(item.coinAddress!, item.title)}
                  disabled={isBuying || !isConnected}
                  className="pointer-events-auto absolute bottom-6 right-6 z-20 gap-2 text-black font-bold  shadow-lg transition-all border border-white duration-200 hover:scale-105 hover:border-amber-400 hover:text-white hover:bg-black/70 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  size="lg"
                >
                  {isBuying ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
                      <span>Buying...</span>
                    </>
                  ) : (
                    <>
                      <Image src="/gnars.webp" alt="" width={20} height={20} unoptimized />
                      <span>Support</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
