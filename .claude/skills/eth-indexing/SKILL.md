---
name: eth-indexing
description: How to read and query onchain data — events, The Graph subgraphs, indexing patterns. Use when working with Builder DAO subgraph queries, fetching historical DAO data (proposals, votes, auctions), or implementing data fetching for the Gnars website. Covers event design, subgraph development, multicall, and real-time updates.
---

# Onchain Data & Indexing

## What You Probably Got Wrong

**You try to query historical state via RPC calls.** You can't cheaply read past state. `eth_call` reads current state. For historical data, you need an indexer.

**You loop through blocks looking for events.** Scanning millions of blocks with `eth_getLogs` is O(n) — it will timeout or get rate-limited. Use an indexer.

**You store query results onchain.** Leaderboards, activity feeds, analytics — these belong offchain. Compute offchain, index events offchain.

**You don't know about The Graph.** The Graph turns your contract's events into a queryable GraphQL API. It's how every serious dApp reads historical data.

---

## Events Are Your API

Solidity events are cheap to emit (~375 gas base + 375 per indexed topic + 8 gas per byte) and free to read offchain. They're stored in transaction receipts, not contract storage.

### Design Contracts Event-First

Every state change should emit an event. This is how your frontend, indexer, and block explorer know what happened.

**Index the fields you'll filter by.** You get 3 indexed topics per event. Use them for addresses and IDs that you'll query.

### Reading Events Directly (Small Scale)

```typescript
import { createPublicClient, http, parseAbiItem } from 'viem';

const client = createPublicClient({
  chain: base,
  transport: http(),
});

// Get recent events (last 1000 blocks)
const logs = await client.getLogs({
  address: '0xYourContract',
  event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 tokenId)'),
  fromBlock: currentBlock - 1000n,
  toBlock: 'latest',
});
```

**This works for:** Last few thousand blocks, low-volume contracts, real-time monitoring.
**This breaks for:** Historical queries, high-volume contracts, >10K blocks.

---

## The Graph (Subgraphs)

The Graph is a decentralized indexing protocol. You define how to process events, deploy a subgraph, and get a GraphQL API.

### When to Use The Graph

- Any dApp that needs historical data (activity feeds, transaction history)
- NFT collection browsers (who owns what, transfer history)
- DAO dashboards (proposals, votes, treasury activity)
- Any query that would require scanning more than ~10K blocks

### How It Works

1. **Define a schema** — what entities you want to query
2. **Write mappings** — TypeScript handlers that process events into entities
3. **Deploy** — subgraph indexes all historical events and stays synced

### Example: NFT Subgraph

**schema.graphql:**
```graphql
type Token @entity {
  id: ID!
  tokenId: BigInt!
  owner: Bytes!
  mintedAt: BigInt!
  transfers: [Transfer!]! @derivedFrom(field: "token")
}

type Transfer @entity {
  id: ID!
  token: Token!
  from: Bytes!
  to: Bytes!
  timestamp: BigInt!
  blockNumber: BigInt!
}
```

**mapping.ts:**
```typescript
import { Transfer as TransferEvent } from './generated/MyNFT/MyNFT';
import { Token, Transfer } from './generated/schema';

export function handleTransfer(event: TransferEvent): void {
  let tokenId = event.params.tokenId.toString();
  let token = Token.load(tokenId);
  if (token == null) {
    token = new Token(tokenId);
    token.tokenId = event.params.tokenId;
    token.mintedAt = event.block.timestamp;
  }
  token.owner = event.params.to;
  token.save();

  let transfer = new Transfer(
    event.transaction.hash.toHex() + '-' + event.logIndex.toString()
  );
  transfer.token = tokenId;
  transfer.from = event.params.from;
  transfer.to = event.params.to;
  transfer.timestamp = event.block.timestamp;
  transfer.blockNumber = event.block.number;
  transfer.save();
}
```

### Deploying a Subgraph

```bash
npm install -g @graphprotocol/graph-cli
graph init --studio my-subgraph
graph codegen
graph build
graph deploy --studio my-subgraph
```

---

## Alternative Indexing Solutions

| Solution | Best for | Tradeoffs |
|----------|----------|-----------|
| **The Graph** | Production dApp backends, decentralized | GraphQL API, requires subgraph dev |
| **Goldsky** | Managed subgraph hosting | Used by Builder DAO ecosystem |
| **Dune Analytics** | Dashboards, analytics, ad-hoc SQL | Not for app backends |
| **Alchemy/QuickNode APIs** | Quick token/NFT queries | Fast but centralized |
| **Ponder** | TypeScript-first indexing | Local-first, simpler for single apps |
| **Direct RPC** | Real-time current state only | Not for historical |

---

## Reading Current State (Not Historical)

For current balances, allowances, and contract state, direct RPC reads are fine.

### Batch Reads with Multicall

For multiple reads in one RPC call, use Multicall3 (`0xcA11bde05977b3631167028862bE2a173976CA11` — same on every chain):

```typescript
const results = await client.multicall({
  contracts: [
    { address: tokenA, abi: erc20Abi, functionName: 'balanceOf', args: [user] },
    { address: tokenB, abi: erc20Abi, functionName: 'balanceOf', args: [user] },
    { address: vault, abi: vaultAbi, functionName: 'totalAssets' },
  ],
});
// One RPC call instead of three
```

### Real-Time Updates

```typescript
import { createPublicClient, webSocket } from 'viem';

const client = createPublicClient({
  chain: base,
  transport: webSocket('wss://base-mainnet.g.alchemy.com/v2/YOUR_KEY'),
});

const unwatch = client.watchContractEvent({
  address: auctionAddress,
  abi: auctionAbi,
  eventName: 'AuctionBid',
  onLogs: (logs) => {
    for (const log of logs) {
      console.log(`New bid: ${log.args.amount} from ${log.args.bidder}`);
    }
  },
});
```

---

## Common Patterns

| What you need | How to get it |
|---------------|---------------|
| DAO proposal history | Builder DAO subgraph (Goldsky) |
| Auction bid history | Subgraph or event logs |
| Token balances | Multicall or Alchemy `getTokenBalances` |
| NFT collection data | Subgraph or Alchemy `getNftsForContract` |
| Real-time new bids | WebSocket subscription via viem |
| Treasury activity | Subgraph + `getAssetTransfers` |
| Analytics dashboard | Dune Analytics (SQL + charts) |

Source: https://ethskills.com/indexing/SKILL.md
