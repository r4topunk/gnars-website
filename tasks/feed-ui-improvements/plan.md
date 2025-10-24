# Plan — feed-ui-improvements

## Approach Summary
Update feed event cards to improve UX based on user feedback. Changes are isolated to UI components and one utility function for ETH formatting. No data model or API changes required.

## Steps

### 1. Update ETH Formatting Utility
- [ ] Update `formatETH` in `/src/lib/utils.ts` or `/src/lib/utils/formatting.ts`
- [ ] Change to 5 decimals and strip trailing zeros
- [ ] Update service layer bid transformation to use 5 decimals

### 2. Update GovernanceEventCard (Vote Cast)
- [ ] Modify VoteCastContent to restructure text
- [ ] Change "on Proposal #X: Title" to "voted on Proposal X" with link
- [ ] Make "Proposal X" an inline link (underlined, same text color)
- [ ] Move full title to separate line below
- [ ] Remove "New" badge from header

### 3. Update GovernanceEventCard (Proposal Created)
- [ ] Remove "New" badge
- [ ] Investigate and add proposal image/banner if available in data

### 4. Update AuctionEventCard (General)
- [ ] Remove "New" badge from header
- [ ] Update "Live" badge to only show when auction is active
- [ ] Make "Live" badge green (bg-green-600)

### 5. Update AuctionEventCard (Auction Created)
- [ ] Check if auction has ended (endTime < now)
- [ ] Show "Ended X ago" vs "Ends X from now"
- [ ] Keep "Live" badge only for active auctions

### 6. Update AuctionEventCard (Auction Settled)
- [ ] Handle zero address for winner
- [ ] Check if winner is 0x0000...0000
- [ ] Display appropriate message or fallback

### 7. Update TokenEventCard (Token Minted)
- [ ] Check if recipient is zero address
- [ ] Change title to "Token Burned" when recipient is 0x0
- [ ] Change text from "minted to" to "burned"
- [ ] Remove "New" badge

### 8. Remove All "New" Badges
- [ ] Double-check all event card components
- [ ] Remove badge rendering based on priority === "HIGH"

## File/Module Touchpoints

### Core Files to Modify
1. `/src/lib/utils.ts` or `/src/lib/utils/formatting.ts` - ETH formatting
2. `/src/services/feed-events.ts` - Update bid amount decimal places
3. `/src/components/feed/GovernanceEventCard.tsx` - Vote cast restructure, remove badges
4. `/src/components/feed/AuctionEventCard.tsx` - Live badge logic, auction status, winner handling, remove badges
5. `/src/components/feed/TokenEventCard.tsx` - Token burned handling, remove badges

## Data / API Changes
None - all changes are UI-only

## Testing Strategy
- Manually test each event type in the feed
- Verify link navigation works for vote cast
- Check auction status with past and current auctions
- Test with zero address for both auction winner and token recipient
- Verify ETH amounts display correctly with 5 decimals (no trailing zeros)

## Acceptance Criteria
✓ Vote cast shows "voted on Proposal X" with X as underlined link
✓ Proposal title appears on separate line below voter
✓ Vote comments still display correctly
✓ Auction won shows proper winner address (not "Invalid Address")
✓ ETH amounts show 5 decimals with trailing zeros removed
✓ Token minted to 0x0 shows as "Token Burned"
✓ No "New" badges appear anywhere
✓ "Live" badge only appears on active auctions
✓ "Live" badge is green
✓ Ended auctions show "Ended X ago"
✓ Active auctions show "Ends X from now"
✓ Proposal banners display (if data available)

