"use client";

import { useTVFeed } from "@/components/tv/useTVFeed";
import { useState } from "react";

const GNARS_COIN_ADDRESS = "0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b";

export default function DebugTVPage() {
  const { items, loading, error } = useTVFeed({});
  const [filter, setFilter] = useState<"all" | "video" | "image" | "gnars-paired">("all");

  // Filter items based on selection
  const filteredItems = items.filter((item) => {
    if (filter === "video") return !!item.videoUrl;
    if (filter === "image") return !item.videoUrl && !!item.imageUrl;
    if (filter === "gnars-paired") {
      return item.poolCurrencyTokenAddress?.toLowerCase() === GNARS_COIN_ADDRESS;
    }
    return true;
  });

  // Stats
  const stats = {
    total: items.length,
    withVideo: items.filter((i) => i.videoUrl).length,
    withImage: items.filter((i) => !i.videoUrl && i.imageUrl).length,
    gnarsPaired: items.filter(
      (i) => i.poolCurrencyTokenAddress?.toLowerCase() === GNARS_COIN_ADDRESS
    ).length,
    droposals: items.filter((i) => i.isDroposal).length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4" />
          <p className="text-lg">Loading TV feed...</p>
          <p className="text-sm text-gray-500 mt-2">Check console for progress</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center text-red-400">
          <p className="text-lg">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Gnars TV Debug</h1>
        <p className="text-gray-400 text-sm mb-4">
          Showing all items fetched by useTVFeed hook
        </p>

        {/* Stats */}
        <div className="flex flex-wrap gap-4 mb-4 text-sm">
          <div className="bg-gray-800 rounded px-3 py-1">
            Total: <span className="text-yellow-400 font-bold">{stats.total}</span>
          </div>
          <div className="bg-gray-800 rounded px-3 py-1">
            Videos: <span className="text-green-400 font-bold">{stats.withVideo}</span>
          </div>
          <div className="bg-gray-800 rounded px-3 py-1">
            Images: <span className="text-blue-400 font-bold">{stats.withImage}</span>
          </div>
          <div className="bg-gray-800 rounded px-3 py-1">
            GNARS-Paired: <span className="text-purple-400 font-bold">{stats.gnarsPaired}</span>
          </div>
          <div className="bg-gray-800 rounded px-3 py-1">
            Droposals: <span className="text-orange-400 font-bold">{stats.droposals}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {(["all", "video", "image", "gnars-paired"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                filter === f
                  ? "bg-yellow-400 text-black font-bold"
                  : "bg-gray-700 hover:bg-gray-600"
              }`}
            >
              {f === "all" && "All"}
              {f === "video" && "Videos Only"}
              {f === "image" && "Images Only"}
              {f === "gnars-paired" && "GNARS-Paired"}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {filteredItems.map((item, index) => (
          <div
            key={item.id}
            className="bg-gray-900 rounded-lg overflow-hidden border border-gray-800 hover:border-yellow-400/50 transition-colors"
          >
            {/* Media */}
            <div className="aspect-square relative bg-gray-800">
              {item.videoUrl ? (
                <video
                  src={item.videoUrl}
                  poster={item.imageUrl}
                  className="w-full h-full object-cover"
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  onMouseEnter={(e) => e.currentTarget.play()}
                  onMouseLeave={(e) => {
                    e.currentTarget.pause();
                    e.currentTarget.currentTime = 0;
                  }}
                />
              ) : item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600">
                  No media
                </div>
              )}

              {/* Index badge */}
              <div className="absolute top-1 left-1 bg-black/70 px-1.5 py-0.5 rounded text-xs">
                #{index + 1}
              </div>

              {/* Type badges */}
              <div className="absolute top-1 right-1 flex gap-1">
                {item.videoUrl && (
                  <span className="bg-green-500/80 px-1.5 py-0.5 rounded text-xs">
                    VIDEO
                  </span>
                )}
                {item.isDroposal && (
                  <span className="bg-orange-500/80 px-1.5 py-0.5 rounded text-xs">
                    DROP
                  </span>
                )}
                {item.poolCurrencyTokenAddress?.toLowerCase() ===
                  GNARS_COIN_ADDRESS && (
                  <span className="bg-purple-500/80 px-1.5 py-0.5 rounded text-xs">
                    GNARS
                  </span>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="p-2">
              <p className="text-xs font-medium truncate" title={item.title}>
                {item.title || "Untitled"}
              </p>
              <p className="text-xs text-gray-500 truncate">
                @{item.creator}
              </p>
              {item.symbol && (
                <p className="text-xs text-yellow-400 truncate">${item.symbol}</p>
              )}
              {item.marketCap && (
                <p className="text-xs text-gray-400">
                  MC: ${(item.marketCap / 1e18).toFixed(2)}
                </p>
              )}
              {item.coinAddress && (
                <a
                  href={`https://zora.co/coin/base:${item.coinAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:underline truncate block"
                >
                  {item.coinAddress.slice(0, 6)}...{item.coinAddress.slice(-4)}
                </a>
              )}
              {/* Debug: show videoUrl */}
              {item.videoUrl && (
                <p className="text-xs text-gray-600 truncate mt-1" title={item.videoUrl}>
                  {item.videoUrl.slice(0, 30)}...
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center text-gray-500 py-12">
          No items match the current filter
        </div>
      )}
    </div>
  );
}
