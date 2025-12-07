"use client";

/**
 * Loading and status indicators for the TV feed
 */
export function TVEmptyState({ loading, error }: { loading: boolean; error: string | null }) {
  return (
    <div className="flex h-screen w-full items-center justify-center text-sm text-white/70">
      {loading ? "Loading videos..." : error || "No videos available"}
    </div>
  );
}

export function TVLoadingMore() {
  return (
    <div className="flex h-24 w-full items-center justify-center text-sm text-white/70">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        <span>Loading more videos...</span>
      </div>
    </div>
  );
}

export function TVEndOfFeed({ totalVideos }: { totalVideos: number }) {
  return (
    <div className="flex h-24 w-full items-center justify-center text-sm text-white/50">
      You&apos;ve seen all {totalVideos} videos 🎬
    </div>
  );
}
