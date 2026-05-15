# Auction Bids Modal with Calldata Comments

**Date**: 2026-03-24
**Status**: Approved
**Related Trello**: [Feature] Bid with comment via tx calldata (shortLink: yDdcCBsa)

## Problem

Bids with on-chain comments (UTF-8 bytes appended to `createBid` calldata) exist on Base but have no UI to display them. The home page's `AuctionSpotlight` only shows the highest bid — there's no way to see bid history or comments.

## Solution

A responsive modal (Dialog on desktop, bottom Drawer on mobile) showing all bids for the current auction with decoded calldata comments.

## Design Decisions

| Decision          | Choice                               | Why                                                                         |
| ----------------- | ------------------------------------ | --------------------------------------------------------------------------- |
| Container         | Responsive Dialog/Drawer             | Best UX across devices — Shadcn pattern with Vaul                           |
| Trigger           | "View X bids" link below highest bid | Discoverable, shows bid count as teaser                                     |
| Comment source    | RPC `eth_getTransactionByHash`       | Subgraph doesn't index calldata comments; direct RPC is simplest for MVP    |
| Decoding          | Client-side                          | No new API route needed; decode UTF-8 from calldata suffix                  |
| Real-time updates | Poll every 10s + highlight new bids  | Active auctions are time-sensitive; highlighting draws attention to changes |

## Architecture

### Data Flow

```
AuctionSpotlight (trigger: "View X bids")
    |
    v
BidHistoryModal (responsive container)
    |
    v
useAuctionBids(tokenId)
    |-- Subgraph query: auctionBids for current tokenId
    |-- Returns: bidder, amount, timestamp, transactionHash
    |-- Polls every 10s while modal is open
    |
    v
useBidComments(txHashes[])
    |-- RPC: eth_getTransactionByHash per hash
    |-- Decode: slice off selector (4B) + tokenId param (32B)
    |-- Remaining bytes -> UTF-8 decode -> comment string
    |-- Cache decoded comments by txHash
    |
    v
BidList -> BidItem[] (with optional comment block)
```

### Comment Decoding Logic

Bids are submitted via `createBid(uint256 tokenId)`. Comments are appended as raw UTF-8 bytes after the standard calldata:

```
| 4 bytes (selector) | 32 bytes (tokenId) | N bytes (UTF-8 comment) |
```

Decoding:

```typescript
const input = tx.input; // hex string with 0x prefix
const commentHex = input.slice(2 + 8 + 64); // skip 0x + selector + param
if (commentHex.length > 0) {
  const comment = new TextDecoder().decode(hexToBytes(commentHex));
}
```

Edge cases:

- Empty `commentHex` = no comment (normal bid)
- Invalid UTF-8 bytes = skip/ignore comment
- Excessive length = truncate display at 140 chars (matches input limit)

## Components

### New Files

| File                                         | Purpose                                                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/components/auction/BidHistoryModal.tsx` | Responsive container: Dialog (desktop) / Drawer (mobile). Manages open/close state.               |
| `src/components/auction/BidItem.tsx`         | Single bid row: avatar, address/ENS, amount, relative timestamp, optional comment block.          |
| `src/hooks/use-auction-bids.ts`              | Fetches bids from subgraph for a given tokenId. Polls every 10s while enabled.                    |
| `src/hooks/use-bid-comments.ts`              | Takes txHash array, fetches transaction input via RPC, decodes calldata comments. Caches results. |

### Modified Files

| File                                       | Change                                                       |
| ------------------------------------------ | ------------------------------------------------------------ |
| `src/components/hero/AuctionSpotlight.tsx` | Add "View X bids" trigger link + BidHistoryModal integration |

### Component Details

#### BidHistoryModal

- Uses `useMediaQuery("(min-width: 768px)")` to switch between Dialog and Drawer
- Dialog: centered, max-width ~480px, scrollable content area
- Drawer: bottom sheet via Vaul, drag handle, snap points
- Header: "Bids for Gnar #XXX" + close button
- Content: `<BidList>` with scroll area

#### BidItem

- Layout: flex row with bidder info left, amount right
- Bidder: avatar (colored circle or ENS avatar) + address (truncated or ENS name)
- Amount: green bold, formatted ETH
- Timestamp: gray, relative format ("2 min ago")
- Comment (conditional): indented block below bid row, left border accent (indigo/purple), slightly muted text
- New bid animation: brief highlight/glow that fades after ~2s

#### useAuctionBids

```typescript
function useAuctionBids(tokenId: string, enabled: boolean) {
  // Subgraph query for auctionBids where auction tokenId matches
  // Returns: { bidder, amount, bidTime, transactionHash }[]
  // Polls every 10s when enabled=true (modal open)
  // Sorts by bidTime descending (newest first)
}
```

#### useBidComments

```typescript
function useBidComments(txHashes: string[]) {
  // For each txHash not already cached:
  //   - Call eth_getTransactionByHash via public RPC
  //   - Decode calldata comment
  //   - Cache result (Map<txHash, string | null>)
  // Returns: Map<txHash, string | null>
  // Fetches incrementally as new txHashes appear (from polling)
}
```

## UI Behavior

### Trigger

- Text link: "View {count} bids" (or "View bids" if count unavailable)
- Positioned below the current highest bid display in AuctionSpotlight
- Only shown when auction is active or recently settled

### Modal State

- Opens: user clicks trigger
- Closes: click outside, X button, ESC key, swipe down (mobile)
- While open: polls for new bids every 10s

### New Bid Highlighting

- When poll returns bids not in previous list:
  - New bids inserted at top of list
  - Brief glow/fade-in animation (~2s)
  - No sound or intrusive notification

### Empty State

- If no bids yet: centered message "No bids yet" with subtle icon

### Loading State

- Skeleton loader for bid list while subgraph query loads
- Comments load independently — bid rows appear first, comments fade in as RPC calls resolve

## Dependencies

- **Existing**: Shadcn Dialog, Shadcn Drawer (Vaul), wagmi/viem (for RPC), subgraph client
- **New**: None. May need to install `vaul` if Shadcn Drawer isn't already set up (check `src/components/ui/drawer.tsx`)
- **RPC**: Uses `NEXT_PUBLIC_BASE_RPC_URL` for `eth_getTransactionByHash` calls

## Risks

| Risk                                            | Mitigation                                               |
| ----------------------------------------------- | -------------------------------------------------------- |
| RPC rate limiting (many bids = many tx fetches) | Cache decoded comments by txHash; fetch incrementally    |
| Invalid/corrupted calldata comments             | Try-catch decode, skip invalid, show bid without comment |
| Subgraph latency for new bids                   | 10s poll is best-effort; bids appear when indexed        |
| Vaul/Drawer not installed                       | Check and install if needed before implementation        |

## Out of Scope

- Historical bid browsing across past auctions (future enhancement)
- Server-side caching/API route for comments
- Bid notifications outside the modal
- Comment display in the activity feed
