# Live Feed Integration Guide

Step-by-step guide to integrate the live feed with real blockchain data.

## Option 1: The Graph Subgraph (Recommended)

### Step 1: Create GraphQL Queries

Create `/src/services/feed-events.ts`:

```typescript
import { request, gql } from 'graphql-request';
import { FeedEvent } from '@/lib/types/feed-events';

const SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/gnars-dao/...';

// Query for proposal events
const PROPOSAL_EVENTS_QUERY = gql`
  query GetProposalEvents($first: Int!, $skip: Int!, $timestamp: BigInt!) {
    proposals(
      first: $first
      skip: $skip
      orderBy: timeCreated
      orderDirection: desc
      where: { timeCreated_gt: $timestamp }
    ) {
      id
      proposalNumber
      proposalId
      title
      proposer
      timeCreated
      voteStart
      voteEnd
      quorumVotes
      executed
      canceled
      vetoed
      transactionHash
    }
    
    proposalVotes(
      first: $first
      skip: $skip
      orderBy: timestamp
      orderDirection: desc
      where: { timestamp_gt: $timestamp }
    ) {
      id
      voter
      support
      weight
      reason
      timestamp
      transactionHash
      proposal {
        proposalNumber
        title
      }
    }
  }
`;

// Query for auction events
const AUCTION_EVENTS_QUERY = gql`
  query GetAuctionEvents($first: Int!, $skip: Int!, $timestamp: BigInt!) {
    auctions(
      first: $first
      skip: $skip
      orderBy: startTime
      orderDirection: desc
      where: { startTime_gt: $timestamp }
    ) {
      id
      token {
        tokenId
      }
      startTime
      endTime
      settled
      transactionHash
    }
    
    auctionBids(
      first: $first
      skip: $skip
      orderBy: bidTime
      orderDirection: desc
      where: { bidTime_gt: $timestamp }
    ) {
      id
      bidder
      amount
      extended
      bidTime
      transactionHash
      auction {
        token {
          tokenId
        }
        endTime
      }
    }
  }
`;

export async function fetchFeedEvents(
  hours: number = 24
): Promise<FeedEvent[]> {
  const timestamp = Math.floor(Date.now() / 1000) - (hours * 3600);
  
  // Fetch from subgraph
  const [proposalData, auctionData] = await Promise.all([
    request(SUBGRAPH_URL, PROPOSAL_EVENTS_QUERY, {
      first: 100,
      skip: 0,
      timestamp,
    }),
    request(SUBGRAPH_URL, AUCTION_EVENTS_QUERY, {
      first: 100,
      skip: 0,
      timestamp,
    }),
  ]);
  
  // Transform to FeedEvent[]
  const events: FeedEvent[] = [];
  
  // Transform proposals
  for (const proposal of proposalData.proposals) {
    events.push({
      id: `proposal-${proposal.id}`,
      type: 'ProposalCreated',
      category: 'governance',
      priority: 'HIGH',
      timestamp: Number(proposal.timeCreated),
      blockNumber: 0, // Get from transaction if needed
      transactionHash: proposal.transactionHash,
      proposalId: proposal.proposalId,
      proposalNumber: proposal.proposalNumber,
      title: proposal.title,
      description: '',
      proposer: proposal.proposer,
      voteStart: Number(proposal.voteStart),
      voteEnd: Number(proposal.voteEnd),
      quorumVotes: Number(proposal.quorumVotes),
    });
  }
  
  // Transform votes
  for (const vote of proposalData.proposalVotes) {
    events.push({
      id: `vote-${vote.id}`,
      type: 'VoteCast',
      category: 'governance',
      priority: vote.reason ? 'HIGH' : 'MEDIUM',
      timestamp: Number(vote.timestamp),
      blockNumber: 0,
      transactionHash: vote.transactionHash,
      proposalId: vote.proposal.id,
      proposalNumber: vote.proposal.proposalNumber,
      proposalTitle: vote.proposal.title,
      voter: vote.voter,
      support: vote.support,
      weight: Number(vote.weight),
      reason: vote.reason || undefined,
    });
  }
  
  // Transform auction bids
  for (const bid of auctionData.auctionBids) {
    events.push({
      id: `bid-${bid.id}`,
      type: 'AuctionBid',
      category: 'auction',
      priority: 'HIGH',
      timestamp: Number(bid.bidTime),
      blockNumber: 0,
      transactionHash: bid.transactionHash,
      tokenId: Number(bid.auction.token.tokenId),
      bidder: bid.bidder,
      amount: bid.amount,
      extended: bid.extended,
      endTime: Number(bid.auction.endTime),
    });
  }
  
  // Sort by timestamp descending
  return events.sort((a, b) => b.timestamp - a.timestamp);
}
```

### Step 2: Update Page to Use Real Data

Update `/src/app/feed/page.tsx`:

```typescript
import { fetchFeedEvents } from '@/services/feed-events';

async function getFeedEvents() {
  try {
    // Use real data instead of mock
    return await fetchFeedEvents(24);
  } catch (error) {
    console.error("Failed to fetch feed events:", error);
    // Fallback to mock data or empty array
    return [];
  }
}
```

### Step 3: Add Computed Events

Create `/src/services/feed-computed-events.ts`:

```typescript
import { FeedEvent } from '@/lib/types/feed-events';
import { listProposals } from '@/services/proposals';

export async function generateComputedEvents(): Promise<FeedEvent[]> {
  const events: FeedEvent[] = [];
  const now = Math.floor(Date.now() / 1000);
  
  // Get active proposals
  const proposals = await listProposals(50, 0);
  
  for (const proposal of proposals) {
    // Voting opened
    if (proposal.voteStart <= now && proposal.voteStart > now - 3600) {
      events.push({
        id: `voting-open-${proposal.proposalId}`,
        type: 'VotingOpened',
        category: 'governance',
        priority: 'HIGH',
        timestamp: proposal.voteStart,
        blockNumber: 0,
        transactionHash: '',
        proposalId: proposal.proposalId,
        proposalNumber: proposal.proposalNumber,
        proposalTitle: proposal.title,
        voteEnd: proposal.voteEnd,
      });
    }
    
    // Voting closing soon (within 6 hours)
    const hoursLeft = (proposal.voteEnd - now) / 3600;
    if (hoursLeft > 0 && hoursLeft <= 6) {
      events.push({
        id: `voting-closing-${proposal.proposalId}`,
        type: 'VotingClosingSoon',
        category: 'governance',
        priority: 'HIGH',
        timestamp: now,
        blockNumber: 0,
        transactionHash: '',
        proposalId: proposal.proposalId,
        proposalNumber: proposal.proposalNumber,
        proposalTitle: proposal.title,
        voteEnd: proposal.voteEnd,
        hoursLeft: Math.floor(hoursLeft),
      });
    }
  }
  
  return events;
}
```

### Step 4: Combine Data Sources

```typescript
async function getFeedEvents() {
  const [blockchainEvents, computedEvents] = await Promise.all([
    fetchFeedEvents(24),
    generateComputedEvents(),
  ]);
  
  return [...blockchainEvents, ...computedEvents]
    .sort((a, b) => b.timestamp - a.timestamp);
}
```

---

## Option 2: Direct Blockchain Events

### Using Viem/Ethers

```typescript
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

const client = createPublicClient({
  chain: mainnet,
  transport: http(),
});

export async function fetchBlockchainEvents() {
  const governorAddress = '0x...';
  const auctionAddress = '0x...';
  
  // Get proposal events
  const proposalLogs = await client.getLogs({
    address: governorAddress,
    event: {
      name: 'ProposalCreated',
      inputs: [/* ABI inputs */],
    },
    fromBlock: 'latest' - 10000n,
    toBlock: 'latest',
  });
  
  // Transform logs to FeedEvent[]
  return transformLogs(proposalLogs);
}
```

---

## Option 3: Backend API

### Create API Route

Create `/src/app/api/feed/events/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { fetchFeedEvents } from '@/services/feed-events';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hours = parseInt(searchParams.get('hours') || '24');
  
  try {
    const events = await fetchFeedEvents(hours);
    return NextResponse.json(events);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
```

### Client-side Fetching

```typescript
"use client";

import { useQuery } from '@tanstack/react-query';

export function LiveFeedContainer() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['feed-events'],
    queryFn: () => fetch('/api/feed/events').then(r => r.json()),
    refetchInterval: 10000, // Refetch every 10 seconds
  });
  
  return <LiveFeedView events={data || []} isLoading={isLoading} error={error} />;
}
```

---

## Real-time Updates

### Option 1: WebSocket

```typescript
"use client";

import { useEffect, useState } from 'react';

export function LiveFeedWithWebSocket() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  
  useEffect(() => {
    const ws = new WebSocket('wss://api.example.com/feed');
    
    ws.onmessage = (message) => {
      const newEvent = JSON.parse(message.data);
      setEvents(prev => [newEvent, ...prev]);
    };
    
    return () => ws.close();
  }, []);
  
  return <LiveFeedView events={events} />;
}
```

### Option 2: The Graph Subscriptions

```typescript
import { useSubscription } from '@apollo/client';

const FEED_SUBSCRIPTION = gql`
  subscription OnNewEvents {
    proposals(orderBy: timeCreated, orderDirection: desc) {
      id
      proposalNumber
      # ... fields
    }
  }
`;

export function LiveFeedWithSubscription() {
  const { data } = useSubscription(FEED_SUBSCRIPTION);
  
  return <LiveFeedView events={transformData(data)} />;
}
```

---

## Caching Strategy

### React Query

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10000, // 10 seconds
      cacheTime: 300000, // 5 minutes
    },
  },
});

export function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

---

## Performance Optimization

### 1. Pagination

```typescript
async function fetchFeedEvents(page: number = 0, pageSize: number = 50) {
  const skip = page * pageSize;
  
  const data = await request(SUBGRAPH_URL, QUERY, {
    first: pageSize,
    skip,
  });
  
  return transformData(data);
}
```

### 2. Incremental Loading

```typescript
export function LiveFeedView() {
  const [page, setPage] = useState(0);
  const { data, fetchNextPage } = useInfiniteQuery({
    queryKey: ['feed-events'],
    queryFn: ({ pageParam = 0 }) => fetchFeedEvents(pageParam),
    getNextPageParam: (lastPage, pages) => pages.length,
  });
}
```

### 3. Event Deduplication

```typescript
function deduplicateEvents(events: FeedEvent[]): FeedEvent[] {
  const seen = new Set<string>();
  return events.filter(event => {
    if (seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  });
}
```

---

## Testing

### Test with Real Data

1. Update `.env.local`:
```bash
NEXT_PUBLIC_SUBGRAPH_URL=https://api.thegraph.com/...
```

2. Test queries:
```bash
npm run dev
# Navigate to /feed
```

3. Verify:
- Events load correctly
- Filters work
- Real-time updates appear
- Performance is acceptable

---

## Monitoring

### Add Analytics

```typescript
import { track } from '@/lib/analytics';

export function FeedEventCard({ event }) {
  const handleClick = () => {
    track('Feed Event Clicked', {
      eventType: event.type,
      category: event.category,
      priority: event.priority,
    });
  };
  
  return (
    <Card onClick={handleClick}>
      {/* ... */}
    </Card>
  );
}
```

---

## Deployment Checklist

- [ ] Update environment variables
- [ ] Test with real blockchain data
- [ ] Verify rate limits
- [ ] Add error boundaries
- [ ] Set up monitoring
- [ ] Test performance with large datasets
- [ ] Verify mobile responsiveness
- [ ] Test real-time updates
- [ ] Add loading states for slow networks
- [ ] Set up error logging (Sentry, etc.)

---

## Resources

- The Graph Docs: https://thegraph.com/docs
- Viem Docs: https://viem.sh
- React Query: https://tanstack.com/query
- Gnars Subgraph: [Add your subgraph URL]

