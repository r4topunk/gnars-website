/**
 * Gnars TV Components
 *
 * TikTok-style video feed for displaying content coins from curated creators
 * and droposals (NFT drops) from the DAO.
 *
 * Supports infinite scroll, priority ordering (Gnars Paired > Gnarly > Normal),
 * buying coins directly from the feed, and linking to droposal pages for minting.
 *
 * Performance optimizations:
 * - Virtualized rendering: only mounts videos within buffer distance
 * - Intelligent preloading: uses <link rel="preload"> based on connection quality
 * - Smooth transitions: poster → video with fade animations
 * - Connection-aware: adapts preload strategy for slow connections
 *
 * Components:
 * - GnarsTVFeed: Main feed container with virtualization
 * - TVVideoPlayer: Optimized video player with loading states
 * - TVHeader: Top bar with title and mute
 * - TVControls: Side controls (fullscreen, play/pause, mute, share)
 * - TVVideoCardInfo: Overlay with title, creator, market cap/price, buy/mint button
 * - TVLoadingStates: Loading/empty/end-of-feed indicators
 *
 * Hooks:
 * - useTVFeed: Fetches and manages feed content with pagination (coins + droposals)
 * - usePreloadTrigger: Triggers loading more content before reaching end
 * - useVideoPreloader: Intelligent video preloading based on connection
 * - useRenderBuffer: Connection-aware virtualization buffer
 */

export { GnarsTVFeed } from "./GnarsTVFeed";
export { TVVideoPlayer } from "./TVVideoPlayer";
export { TVHeader } from "./TVHeader";
export { TVControls } from "./TVControls";
export { TVVideoCardInfo } from "./TVVideoCardInfo";
export { TVEmptyState, TVLoadingMore, TVEndOfFeed } from "./TVLoadingStates";
export { useTVFeed, usePreloadTrigger } from "./useTVFeed";
export { useVideoPreloader, useRenderBuffer, useShouldRenderVideo } from "./useVideoPreloader";
export * from "./types";
export * from "./utils";
