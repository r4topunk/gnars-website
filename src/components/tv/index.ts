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
 * - Intelligent preloading: uses <link rel="preload"> based on measured performance
 * - Smooth transitions: poster → video with fade animations
 * - Adaptive strategy: learns from real load times to optimize preloading
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
 * - useVideoPreloader: Intelligent video preloading based on measured performance
 * - useRenderBuffer: Adaptive virtualization buffer (learns from real load times)
 */

export { GnarsTVFeed } from "./GnarsTVFeed";
export { TVVideoPlayer } from "./TVVideoPlayer";
export { TVHeader } from "./TVHeader";
export { TVControls } from "./TVControls";
export { TVVideoCardInfo } from "./TVVideoCardInfo";
export { TVEmptyState, TVLoadingMore, TVEndOfFeed } from "./TVLoadingStates";
export { FaultyTerminal } from "./FaultyTerminal";
export { FuzzyText } from "./FuzzyText";
export { TVInfiniteMenu } from "./TVInfiniteMenu";
export { useTVFeed, usePreloadTrigger } from "./useTVFeed";
export { useVideoPreloader, useRenderBuffer } from "./useVideoPreloader";
export * from "./types";
export * from "./utils";
export { Gnar3DTV } from "./Gnar3DTV";
export { Gnar3DTVScene } from "./Gnar3DTVScene";
export { TV3DModel } from "./TV3DModel";
