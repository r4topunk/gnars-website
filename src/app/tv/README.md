# Gnars TV Route

This route hosts **Gnar TV**, a TikTok-style feed that lets the DAO surface video-first creator coins and executed droposals from across the Gnars ecosystem. It gives DAO members and visitors a wallet-native place to watch clips, buy Zora creator coins, and mint fresh Gnars-funded NFT drops with referral rewards flowing back to the treasury.

## High-Level Behavior

- `/tv` renders `GnarsTVFeed` inside `src/app/tv/page.tsx`, wrapped by `src/app/tv/layout.tsx` which injects Open Graph, Twitter, and Farcaster mini-app metadata derived from `TV_MINIAPP_CONFIG`.
- `/tv/[coinAddress]` deep links to a specific creator coin. The page fetches metadata for the address, rewrites IPFS image URLs to HTTP, updates Farcaster frame + mini-app tags, and passes the address to `GnarsTVFeed` so the coin is pinned to the top of the feed.
- Both routes are marked `dynamic = "force-dynamic"` so fresh data is streamed from the Zora APIs on every request.

## Why It Matters for the DAO

- Creator coins that were spawned with the Gnars treasury as the platform referrer automatically surface higher in the feed; coins paired with the Gnars Creator Coin (backed by the DAO) are prioritized first. This keeps attention and swap volume on Gnars-aligned assets.
- Droposals that were executed by DAO governance (fetched from the subgraph) appear alongside coins so every funded drop has an always-on video showcase with a one-click mint, sending referral rewards (`MINT_REFERRAL`) back to `GNARS_ADDRESSES.treasury`.
- The feed doubles as a Farcaster mini-app (`TV_MINIAPP_CONFIG`) so DAO-native content can live inside frames, channels, and casts without custom integrations.

## Data Flow

### Sources

1. **Zora coins** via `@zoralabs/coins-sdk` (`src/components/tv/useTVFeed.ts`):
   - `CREATOR_ADDRESSES` defines the curated Base addresses (Gnars artists, Skatehive, etc.) whose created coins are eligible for the feed.
   - `getProfileCoins` is called per creator with cursor-based pagination. `INITIAL_COINS_PER_CREATOR` items are grabbed on first load and `LOAD_MORE_COINS_PER_CREATOR` when preloading more.
   - When a coin slug (`/tv/[coinAddress]`) is requested, `getCoin` runs upfront and the resulting `TVItem` is pinned to the top of the merged feed.
2. **Droposals** via `fetchDroposals` (`src/services/droposals.ts`):
   - Pulls executed proposals targeting the droposal factory (`DROPOSAL_TARGET.base`) out of the Gnars Builder subgraph.
   - `decodeDroposalParams` extracts sale config, media URIs, and deployment transaction hashes so the feed can show prices and later resolve the ERC-721 address for minting.
   - Droposals without playable video, or with known-bad contracts/proposal numbers, are skipped.

### Assembly & Prioritization

- `mapCoinToTVItem` normalizes media, market data, creator profile info, and referral metadata. Only entries with a video (`mimeType` starts with `video/`) become feed items.
- Duplicate coin addresses are filtered out via `loadedCoinAddressesRef` so pagination can be aggressive without repeating content.
- `sortByPriority` splits items into:
  1. **Paired** — liquidity pools backed by `GNARS_CREATOR_COIN`.
  2. **Gnarly** — platform referrer equals the Gnars treasury.
  3. **Normal** — everything else.
  Each bucket is shuffled per creator (`interleaveByCreator`) to avoid clumping by account.
- On initial load droposals are shuffled and interleaved every `interval` coins so governance-funded drops show up regularly without overwhelming the feed.
- `usePreloadTrigger` monitors the IntersectionObserver-driven `activeIndex`; when the user is within `PRELOAD_THRESHOLD` of the end it fetches more coins across all creators. `hasMoreContent` mirrors whether at least one creator still has next-page data.
- Errors (API issues, empty feeds) fall back to `FALLBACK_ITEMS` so the UI still renders and invites the user to try again.

## Client & Player Behavior (`src/components/tv/GnarsTVFeed.tsx`)

- Uses `IntersectionObserver` in snap-scroll container to keep track of the active card without scroll events; this powers the autoplay logic, preloading, and `usePreloadTrigger`.
- `useVideoPreloader` + `useRenderBuffer` learn real load times and adapt how many videos are preloaded or even mounted (virtualization) to keep scrolling smooth on mobile/Safari.
- `TVVideoPlayer` keeps the poster image visible until the first frame is shown, fades seamlessly to the playing video, shows progress for slow connections, and retries on error.
- `TVControls` adds mute, play/pause, fullscreen, and share actions. Sharing prefers Farcaster mini-app share, then the native Web Share API, then clipboard fallback.
- `TVVideoCardInfo` overlays GNAR-specific market data: badges for Paired/Gnarly/Skatehive items, market-cap progress bars, holder counts, droposal mint prices, and quick links to BaseScan or `/droposals/[proposalNumber]`.

## Trade & Mint Actions

- **Buy coin** (`handleBuyCoin`):
  - Requires the user to connect a wallet via Wagmi.
  - Builds `tradeCoin` params with ETH as `sell` and the coin ERC-20 as `buy`, using the support amount chosen via the dropdown (defaults to 0.00042 ETH).
  - Applies 5% slippage, surfaces human-friendly errors (user rejection, insufficient funds, gas, network) via `sonner` toasts.
  - Any Zora platform referral rewards are already encoded in the coin’s metadata, so buys from the TV route directly benefit the DAO when applicable.
- **Mint droposal** (`handleMintDroposal`):
  - Forces the wallet onto Base (switches chain if necessary).
  - Resolves the ERC-721 address lazily either from the droposal metadata or by reading the execution transaction receipt (`resolveTokenAddress` using Viem public client).
  - Calls `mintWithRewards` on the drop contract with `GNARS_ADDRESSES.treasury` as the referral so the DAO earns the protocol reward.
  - Calculates total ETH due as `(price + ZORA_PROTOCOL_REWARD) * quantity`, provides instant feedback, and links to BaseScan.

## Metadata & Mini-App Integration

- `src/app/tv/layout.tsx` injects OG/Twitter tags plus `fc:miniapp` metadata from `TV_MINIAPP_CONFIG` so the `/tv` route can be embedded inside Farcaster clients or other platforms that read those tags.
- The `[coinAddress]` page dynamically rewrites OG/Twitter/Frame content per coin, swapping in the coin’s poster image and a frame button pointing back to `/tv/[coinAddress]`.
- `TV_MINIAPP_EMBED_CONFIG` ensures any share from the feed includes a mini-app preview with `tv-og.gif` so casts show motion.

## Environment & Configuration

- `BASE_URL` (from `NEXT_PUBLIC_SITE_URL`) must be set so metadata, Farcaster manifests, and share links resolve correctly.
- `NEXT_PUBLIC_ZORA_API_KEY` is optional but recommended; if present it is passed to `setApiKey` before calling the Zora Coins SDK to unlock higher rate limits.
- Goldsky subgraph access uses `NEXT_PUBLIC_GOLDSKY_PROJECT_ID` for droposal queries.
- Wallet interactions assume Wagmi is already configured with the Base chain (see `src/lib/config.ts`).

## Extending or Debugging

- Add or remove creator feeds by editing `CREATOR_ADDRESSES` in `src/components/tv/utils.ts`. The order in that array implicitly determines whose content is fetched/paginated first.
- Tune feed pacing by adjusting `INITIAL_COINS_PER_CREATOR`, `LOAD_MORE_COINS_PER_CREATOR`, or `PRELOAD_THRESHOLD`.
- To feature additional DAO-specific badge logic, extend `utils.ts` with a predicate similar to `isGnarsPaired`, then render a badge inside `TVVideoCardInfo`.
- If the feed looks empty in production, check:
  1. API key availability/logs around `[gnars-tv]` errors in `useTVFeed`.
  2. Droposal decoding failures (e.g., new droposal ABI) inside `fetchDroposals`.
  3. Environment settings for `BASE_URL` so the mini-app manifest is correct.

This README should give contributors enough context to modify or extend the TV route without reverse engineering the feed each time. If you add new behaviors (e.g., different referrer programs, additional chains, or new sharing endpoints) please update this document so the DAO keeps a canonical reference of how Gnar TV works.
