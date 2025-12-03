"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { getProfileCoins, setApiKey } from "@zoralabs/coins-sdk";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type TVItem = {
  id: string;
  title: string;
  creator: string;
  symbol?: string;
  imageUrl?: string;
  videoUrl?: string;
};

const CREATOR_ADDRESSES = ["0x41cb654d1f47913acab158a8199191d160dabe4a"];

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
  const [viewMode, setViewMode] = useState<"feed" | "full">("feed");
  const [activeIndex, setActiveIndex] = useState(0);
  const [playCount, setPlayCount] = useState(0);

  const fullContainerRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);

  const toHttp = (uri?: string | null): string | undefined => {
    if (!uri) return undefined;
    if (uri.startsWith("ipfs://")) {
      return uri.replace("ipfs://", "https://ipfs.io/ipfs/");
    }
    return uri;
  };

  const mediaFromCoin = (coin: any) => {
    const media =
      coin?.mediaContent || coin?.media || coin?.coin?.mediaContent || coin?.coin?.media || {};

    const preview =
      media?.previewImage?.url ||
      media?.previewImage?.medium ||
      media?.previewImage?.small ||
      media?.previewImage ||
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
              const response = (await getProfileCoins({
                identifier: address,
                count: 20,
              })) as any;

              const edges: any[] =
                response?.data?.profile?.createdCoins?.edges ||
                response?.data?.profile?.coinBalances?.edges ||
                [];

              const coins = edges.map((edge) => edge?.node?.coin || edge?.node).filter(Boolean);

              return coins.map((coin: any, idx: number): TVItem => {
                const media = mediaFromCoin(coin);
                return {
                  id: coin?.address || coin?.contract || coin?.id || `${address}-${idx}`,
                  title: coin?.name || coin?.displayName || "Untitled Coin",
                  creator: address,
                  symbol: coin?.symbol,
                  imageUrl: media.imageUrl || coin?.imageUrl,
                  videoUrl: media.videoUrl,
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
        setItems(flattened.length ? flattened : FALLBACK_ITEMS);
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
  }, [viewMode, items]);

  const videoItems = useMemo(() => items.filter((i) => i.videoUrl), [items]);

  useEffect(() => {
    if (viewMode !== "full" || !videoItems.length) return;

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
  }, [viewMode, videoItems.length]);

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

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="space-y-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-3 rounded-2xl bg-card/70 p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-[320px] w-full rounded-xl" />
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {items.map((item) => (
          <article
            key={item.id}
            className="space-y-3 rounded-2xl bg-card/70 p-3 shadow-sm border border-border/60"
            style={{ minHeight: 520 }}
          >
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 overflow-hidden rounded-full bg-muted">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="40px"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                    {item.symbol?.slice(0, 3) || "TV"}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{item.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  Creator {item.creator.slice(0, 6)}…{item.creator.slice(-4)}
                </p>
              </div>
              <div className="ml-auto text-xs text-muted-foreground">{item.symbol}</div>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-border/60 bg-black aspect-[9/16]">
              {item.videoUrl ? (
                <video
                  src={item.videoUrl}
                  poster={item.imageUrl}
                  className="h-full w-full object-cover"
                  controls
                  playsInline
                  preload="metadata"
                  muted
                />
              ) : item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  width={1080}
                  height={1920}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex aspect-[9/16] items-center justify-center text-muted-foreground">
                  No media available
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Powered by Zora Coins</span>
              <Button variant="ghost" size="sm" className="text-xs">
                View Coin
              </Button>
            </div>
          </article>
        ))}
      </div>
    );
  }, [items, loading]);

  if (viewMode === "full") {
    return (
      <div className="fixed inset-0 z-40 bg-black text-white">
        <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
          <div className="text-sm font-semibold">Gnars TV</div>
          <Button
            variant="secondary"
            size="sm"
            className="bg-white/10 text-white backdrop-blur hover:bg-white/20"
            onClick={() => setViewMode("feed")}
          >
            Exit
          </Button>
        </div>
        <div
          ref={fullContainerRef}
          className="h-screen w-full snap-y snap-mandatory overflow-y-auto overscroll-none"
          style={{ scrollSnapType: "y mandatory" }}
        >
          {videoItems.length === 0 ? (
            <div className="flex h-screen w-full items-center justify-center text-sm text-white/70">
              No videos available
            </div>
          ) : (
            videoItems.map((item, idx) => (
              <div
                key={item.id}
                className="relative h-screen w-full flex-shrink-0"
                style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
              >
                <video
                  ref={(el) => {
                    videoRefs.current[idx] = el;
                  }}
                  data-index={idx}
                  src={item.videoUrl}
                  poster={item.imageUrl}
                  className="absolute inset-0 h-full w-full object-contain bg-black"
                  muted
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
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 pb-12 pt-4 sm:max-w-2xl">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">Gnars TV</p>
          <h1 className="text-xl font-bold">Curated creator coins</h1>
          <p className="text-sm text-muted-foreground">
            Vertical feed, optimized for miniapp and mobile. Pulls coin media from Zora profiles.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <div className="shrink-0">
          <Button variant="outline" size="sm" onClick={() => setViewMode("full")}>
            Fullscreen
          </Button>
        </div>
      </div>

      {content}
    </div>
  );
}
