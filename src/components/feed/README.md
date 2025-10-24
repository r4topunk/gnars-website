# Live Feed Components

Comprehensive live feed system displaying real-time DAO activity including governance, auctions, tokens, and administrative events.

## 📁 Component Structure

```
src/components/feed/
├── FeedEventCard.tsx         # Main router component
├── GovernanceEventCard.tsx   # Governance events (proposals, votes)
├── AuctionEventCard.tsx      # Auction events (bids, settlements)
├── TokenEventCard.tsx        # Token & delegation events
├── AdminEventCard.tsx        # Treasury & admin events
├── FeedFilters.tsx           # Filter controls
├── LiveFeedView.tsx          # Main feed container
└── README.md                 # This file
```

## 🎯 Usage

### Basic Implementation

```tsx
import { LiveFeedView } from "@/components/feed/LiveFeedView";
import { generateMockFeedEvents } from "@/lib/mock-data/feed-events";

export default function FeedPage() {
  const events = await getFeedEvents(); // or use mock data
  
  return <LiveFeedView events={events} />;
}
```

### With Loading State

```tsx
<LiveFeedView 
  events={events} 
  isLoading={isLoading}
  error={error}
/>
```

## 📊 Event Types

### Governance Events (11 types)
- **ProposalCreated** - New proposal submitted
- **VoteCast** - Member voted on proposal
- **ProposalQueued** - Proposal queued for execution
- **ProposalExecuted** - Proposal executed
- **ProposalCanceled** - Proposal canceled
- **ProposalVetoed** - Proposal vetoed
- **VotingOpened** - Voting period started (computed)
- **VotingClosingSoon** - Voting ending soon (computed)

### Auction Events (4 types)
- **AuctionCreated** - New auction started
- **AuctionBid** - New bid placed
- **AuctionSettled** - Auction won
- **AuctionEndingSoon** - Auction ending (computed)

### Token Events (3 types)
- **TokenMinted** - New token minted
- **TokenTransferred** - Token ownership changed
- **DelegateChanged** - Vote delegation changed

### Admin Events (3 types)
- **TreasuryTransaction** - Treasury funds sent
- **SettingsUpdated** - DAO settings changed
- **OwnershipTransferred** - Contract ownership changed

## 🎨 Features

### Event Filtering
- **Category**: Filter by governance, auction, token, etc.
- **Priority**: High/Medium/Low priority events
- **Time Range**: 1h, 24h, 7d, 30d, all time
- **Comments**: Show only votes with comments

### Performance
- **Infinite Scroll**: Loads events incrementally
- **Virtual Scrolling**: Only renders visible events
- **Optimized Rendering**: Memoized filtering
- **Lazy Loading**: Images and components

### UI/UX
- **Responsive Design**: Mobile and desktop optimized
- **Dark Mode**: Full dark mode support
- **Hover States**: Interactive feedback
- **Loading States**: Skeleton loaders
- **Empty States**: Contextual empty messages

## 🔧 Integration Guide

### Step 1: Replace Mock Data

Current implementation uses mock data. To integrate real data:

```tsx
// src/app/feed/page.tsx
async function getFeedEvents() {
  // Replace mock data with real data sources:
  
  // Option 1: The Graph Subgraph
  const response = await fetch('YOUR_SUBGRAPH_URL', {
    method: 'POST',
    body: JSON.stringify({ query: YOUR_QUERY })
  });
  
  // Option 2: Backend API
  const response = await fetch('/api/feed/events');
  
  // Option 3: Direct blockchain events
  // Use ethers.js or viem to query events
  
  return transformToFeedEvents(response.data);
}
```

### Step 2: Add Real-time Updates

For live updates, add WebSocket or polling:

```tsx
"use client";

import { useEffect, useState } from "react";

export function LiveFeedContainer() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  
  useEffect(() => {
    // WebSocket connection
    const ws = new WebSocket('ws://your-api/feed');
    
    ws.onmessage = (msg) => {
      const newEvent = JSON.parse(msg.data);
      setEvents(prev => [newEvent, ...prev]);
    };
    
    return () => ws.close();
  }, []);
  
  return <LiveFeedView events={events} />;
}
```

### Step 3: Add Computed Events

Create a service to generate time-based events:

```tsx
// src/services/feed-computed-events.ts
export function computeTimeBasedEvents(proposals: Proposal[]): FeedEvent[] {
  const now = Math.floor(Date.now() / 1000);
  const events: FeedEvent[] = [];
  
  for (const proposal of proposals) {
    // Voting closing soon
    if (proposal.voteEnd - now <= 3600 && proposal.voteEnd > now) {
      events.push({
        type: "VotingClosingSoon",
        proposalId: proposal.id,
        // ... other fields
      });
    }
  }
  
  return events;
}
```

## 📝 Type Definitions

All type definitions are in `/src/lib/types/feed-events.ts`:

```typescript
import { FeedEvent, FeedFilters } from "@/lib/types/feed-events";

// Use union type for type-safe event handling
function handleEvent(event: FeedEvent) {
  switch (event.type) {
    case "VoteCast":
      // TypeScript knows event has voter, support, etc.
      console.log(event.voter, event.support);
      break;
    // ... other cases
  }
}
```

## 🎭 Customization

### Add New Event Type

1. Add type to `feed-events.ts`:
```typescript
export interface CustomEvent extends BaseEvent {
  type: "CustomEvent";
  category: "custom";
  customField: string;
}

export type FeedEvent = ... | CustomEvent;
```

2. Create card component:
```tsx
// CustomEventCard.tsx
export function CustomEventCard({ event }) {
  // Your implementation
}
```

3. Update router in `FeedEventCard.tsx`:
```tsx
case "custom":
  return <CustomEventCard event={event} />;
```

### Customize Filters

Modify default filters in `LiveFeedView.tsx`:

```typescript
const DEFAULT_FILTERS: FeedFilters = {
  priorities: ["HIGH"], // Show only high priority
  categories: ["governance"], // Show only governance
  timeRange: "7d", // Last 7 days
  showOnlyWithComments: true, // Only commented votes
};
```

### Customize Event Appearance

Each event card can be customized via props:

```tsx
<FeedEventCard 
  event={event} 
  compact={true} // Compact view
/>
```

Or modify the card components directly for global changes.

## 🧪 Testing with Mock Data

Use the mock data generator for development:

```tsx
import { generateMockFeedEvents } from "@/lib/mock-data/feed-events";

// Generate 24 hours of events
const events = generateMockFeedEvents(24);

// Generate specific event type
import { generateMockEvent } from "@/lib/mock-data/feed-events";
const voteEvent = generateMockEvent("VoteCast");
```

## 🔗 Related Files

- **Types**: `/src/lib/types/feed-events.ts`
- **Mock Data**: `/src/lib/mock-data/feed-events.ts`
- **Page**: `/src/app/feed/page.tsx`
- **Research**: `/tasks/live-feed-events/`

## 📱 Mobile Considerations

The feed is fully responsive with:
- Compact card layout on small screens
- Touch-friendly tap targets
- Optimized image loading
- Reduced motion support

## ♿ Accessibility

- Semantic HTML elements
- Keyboard navigation support
- Screen reader friendly
- High contrast support
- Focus visible states

## 🚀 Performance Tips

1. **Limit initial load**: Load last 24h by default
2. **Lazy load images**: Use Next.js Image component
3. **Virtualize long lists**: Consider react-virtual for 1000+ events
4. **Debounce filters**: Prevent excessive re-renders
5. **Cache data**: Use React Query or SWR for data caching

## 📄 License

Part of the Gnars DAO website codebase.

