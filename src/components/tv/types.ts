/**
 * Types for the Gnars TV feed components
 */

export type TVItem = {
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
  uniqueHolders?: number;
  createdAt?: string; // ISO date string for temporal sorting
  // Droposal-specific fields
  isDroposal?: boolean;
  priceEth?: string;
  proposalNumber?: number;
  editionSize?: string;
  description?: string;
  tokenAddress?: string; // NFT contract address, resolved lazily
  executionTransactionHash?: string; // For resolving tokenAddress from receipt
};

export type CoinMedia = {
  mimeType?: string;
  previewImage?: { url?: string; medium?: string; small?: string } | string;
  previewUrl?: string;
  image?: string;
  posterUrl?: string;
  originalUri?: string;
  animationUrl?: string;
  videoUrl?: string;
  url?: string;
};

export type CoinNode = {
  address?: string;
  contract?: string;
  id?: string;
  name?: string;
  displayName?: string;
  symbol?: string;
  imageUrl?: string;
  createdAt?: string;
  platformReferrer?: string;
  platformReferrerAddress?: string;
  marketCap?: number;
  marketCapDelta24h?: number;
  allTimeHigh?: number;
  uniqueHolders?: number;
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
    createdAt?: string;
    platformReferrer?: string;
    platformReferrerAddress?: string;
    marketCap?: number;
    marketCapDelta24h?: number;
    allTimeHigh?: number;
    uniqueHolders?: number;
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

export type CoinEdge = {
  node?: CoinNode | { coin?: CoinNode };
};

export type CreatorCursor = {
  cursor: string | null;
  hasMore: boolean;
  /** Last fetch error (transient). If present, creator is not necessarily exhausted. */
  error?: unknown;
  /** Epoch ms when `error` was recorded. */
  lastErrorAt?: number;
};

/** Balance node from getProfileBalances */
export type BalanceNode = {
  balance: string;
  id: string;
  coin?: CoinNode;
};

export type BalanceEdge = {
  node: BalanceNode;
};
