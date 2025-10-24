# 🚀 Live Feed Quick Start

Get the live feed running in 30 seconds!

## View It Now

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open your browser:**
   ```
   http://localhost:3000/feed
   ```

3. **That's it!** You should see the live feed with mock events.

## What You'll See

### Feed Display
- Real-time events (mocked for now)
- 30-50 sample events from the last 24 hours
- Various event types: proposals, votes, auctions, tokens

### Try These Features

**Filters (top of page):**
- Click "Category" → Select/deselect categories
- Click "Priority" → Filter by importance
- Click time dropdown → Change time range
- Click "With Comments" → Show only votes with comments
- Click "Reset" → Clear all filters

**Infinite Scroll:**
- Scroll down to load more events
- Loads 20 events at a time automatically

**Interactive Elements:**
- Hover over cards for hover effects
- Click action buttons ("View Proposal", etc.)
- Events show relative time ("2m ago")

## Test Different Scenarios

### 1. Filter by Category
```
Click "Category" → Uncheck all → Check only "Governance"
Result: Shows only proposal and voting events
```

### 2. High Priority Only
```
Click "Priority" → Uncheck Medium and Low
Result: Shows only important events
```

### 3. Recent Activity
```
Click time range → Select "Last Hour"
Result: Shows only very recent events
```

### 4. Commented Votes
```
Click "With Comments" button
Result: Shows only votes that have reasons/comments
```

## Page Structure

```
┌─────────────────────────────────────────┐
│  🔴 Live Feed                           │
│  Real-time activity from the Gnars DAO  │
├─────────────────────────────────────────┤
│  [Category ▼] [Priority ▼] [24h ▼]     │ ← Filters
│  [With Comments] [Reset]                │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐  │
│  │ 🗳️ Vote Cast • 2m ago             │  │ ← Event Card
│  │ alice.eth voted FOR on Prop #42   │  │
│  │ "Great proposal!"                 │  │
│  │ [View Proposal →]                 │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │ 💰 New Bid • 5m ago               │  │
│  │ bob.eth bid 4.2 ETH on Gnar #123  │  │
│  │ [View Auction →]                  │  │
│  └───────────────────────────────────┘  │
│  ... more events ...                    │
└─────────────────────────────────────────┘
```

## Event Types You'll See

### 🗳️ Governance (Blue/Green/Red)
- **New Proposal** - New proposals created
- **Vote Cast** - Member votes (with comments shown)
- **Proposal Queued** - Ready for execution
- **Proposal Executed** - Completed proposals
- **Voting Opened** - Voting period started
- **Voting Closing Soon** - Urgent voting alerts

### 💰 Auctions (Purple/Green/Amber)
- **New Auction** - Auction started
- **New Bid** - Bids placed (with amounts)
- **Auction Won** - Settled auctions
- **Auction Ending Soon** - Urgent auction alerts

### 🎨 Tokens (Purple/Blue/Indigo)
- **Token Minted** - New tokens created
- **Token Transferred** - Ownership changes
- **Delegation Changed** - Vote delegations

### ⚙️ Admin (Green/Gray/Amber)
- **Treasury Transaction** - Funds sent
- **Settings Updated** - DAO parameters changed
- **Ownership Transferred** - Contract ownership changes

## Mobile Testing

Test on mobile by:
1. Opening DevTools (F12)
2. Click device toolbar icon
3. Select mobile device
4. Navigate to `/feed`

Should work perfectly on all screen sizes!

## Common Issues

### "Page not found"
- Make sure dev server is running (`npm run dev`)
- URL is `/feed` not `/live-feed`

### "No events shown"
- Check filters - you might have filtered everything out
- Click "Reset" to clear filters
- Refresh the page

### Layout looks broken
- Clear your browser cache
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Check console for errors

### Filters not working
- Check browser console for errors
- Try refreshing the page
- Make sure JavaScript is enabled

## Next Steps

Once you've tested with mock data:

1. **Read Integration Guide**
   ```
   tasks/live-feed-events/integration-guide.md
   ```

2. **Connect Real Data**
   - Update `src/app/feed/page.tsx`
   - Replace `generateMockFeedEvents()` with real data

3. **Deploy**
   - Test with production data
   - Deploy to Vercel/your hosting
   - Share the feed with your community!

## File Locations

**Main page:** `/src/app/feed/page.tsx`  
**Components:** `/src/components/feed/`  
**Types:** `/src/lib/types/feed-events.ts`  
**Mock data:** `/src/lib/mock-data/feed-events.ts`

## Need Help?

1. Check `/src/components/feed/README.md` for detailed API docs
2. Check `/tasks/live-feed-events/IMPLEMENTATION.md` for technical details
3. Check `/tasks/live-feed-events/integration-guide.md` for integration steps

---

**Enjoy your live feed! 🎉**

