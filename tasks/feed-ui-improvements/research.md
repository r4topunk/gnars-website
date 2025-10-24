# Research — feed-ui-improvements

## Goal
Improve the feed UI/UX based on user feedback, including fixing text formatting, address display issues, badge logic, and auction status display.

## Current Implementation

### Components Structure
- **GovernanceEventCard.tsx**: Handles proposal and vote events
- **AuctionEventCard.tsx**: Handles auction events (created, bid, settled)
- **TokenEventCard.tsx**: Handles token minting and delegation
- **feed-events.ts**: Service that transforms subgraph data into feed events

### Current Issues Identified

1. **Vote Cast Format**: Currently shows "on Proposal #102: Full Title" - needs to be "voted on Proposal #102" with the number as a link
2. **Proposal Title**: Should only show title under username (not after "on Proposal")
3. **Invalid Address**: AuctionSettledContent shows "Invalid Address" when winner is 0x0 or empty
4. **ETH Decimals**: Currently shows 4 decimals via formatETH - needs 5 decimals with trailing zeros removed
5. **Token Burned**: When recipient is 0x0 address, should say "token burned" not "minted to 0x0"
6. **New Badge**: Shows for all HIGH priority events - should be removed entirely
7. **Live Badge**: Shows for all HIGH priority auction events - should only show if auction is actually active
8. **Auction Status**: AuctionCreatedContent always says "Ends..." even if auction already ended
9. **Proposal Banner**: ProposalCreatedContent doesn't show any image/banner

## Existing Patterns

### Address Display
- Uses `AddressDisplay` component from `@/components/ui/address-display`
- Supports ENS resolution and various display modes
- Can show/hide avatar, ENS, copy, explorer

### Date Formatting
- Uses `date-fns` library with `formatDistanceToNow`
- Supports hydration-safe rendering with `suppressHydrationWarning`

### Link Styling
- Action links use: `text-xs text-primary hover:underline font-medium`
- This pattern can be adapted for inline proposal links

### ETH Formatting
- Currently uses `formatETH` from `@/lib/utils`
- Transforms service layer uses `.toFixed(4)` for bid amounts

## Required Changes

### 1. Vote Cast Link (GovernanceEventCard.tsx)
- Change text from "on Proposal #X: Title" to "voted on Proposal X"
- Make "Proposal X" a clickable link with underline
- Keep same text color but add underline decoration
- Move full title to separate line under voter info

### 2. Invalid Address Fix (AuctionEventCard.tsx)
- Check if winner address is zero address (0x0000...0000)
- Display appropriate message or handle gracefully

### 3. ETH Decimal Formatting
- Update service layer to use 5 decimals
- Create utility to strip trailing zeros
- Apply to all bid/amount displays

### 4. Token Burned Label (TokenEventCard.tsx)
- Check if recipient is zero address
- Change title from "Token Minted" to "Token Burned"
- Update text from "minted to" to "burned"

### 5. Remove New Badge
- Remove badge display from all event cards
- Keep the priority field for filtering logic

### 6. Live Badge Logic (AuctionEventCard.tsx)
- Calculate if auction is currently active (now < endTime)
- Only show "Live" badge when true
- Make badge green (like vote badges): `bg-green-600 text-white`

### 7. Auction Ended Status (AuctionEventCard.tsx)
- Check if endTime < now
- Show "Ended X ago" instead of "Ends X from now"

### 8. Proposal Banner (GovernanceEventCard.tsx)
- Add image display similar to auction cards
- Need to determine image source (from description? IPFS?)

## Open Questions
1. Where do proposal banners come from? Need to check proposal data structure
2. Should zero address be `0x0000000000000000000000000000000000000000` exactly?
3. For "Live" badge color, should we use existing green variants or create new one?

