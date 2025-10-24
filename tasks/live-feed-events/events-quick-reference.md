# Live Feed Events - Quick Reference

This document provides a quick lookup table for all available events that can be displayed in the live feed.

## Events Summary Table

| Event Name | Contract | Priority | Category | Has User Comment |
|------------|----------|----------|----------|------------------|
| **ProposalCreated** | Governor | HIGH | Governance | ❌ |
| **ProposalQueued** | Governor | HIGH | Governance | ❌ |
| **ProposalExecuted** | Governor | HIGH | Governance | ❌ |
| **ProposalCanceled** | Governor | MEDIUM | Governance | ❌ |
| **ProposalVetoed** | Governor | HIGH | Governance | ❌ |
| **VoteCast** | Governor | HIGH | Governance | ✅ (reason field) |
| **VotingDelayUpdated** | Governor | LOW | Settings | ❌ |
| **VotingPeriodUpdated** | Governor | LOW | Settings | ❌ |
| **ProposalThresholdBpsUpdated** | Governor | LOW | Settings | ❌ |
| **QuorumVotesBpsUpdated** | Governor | LOW | Settings | ❌ |
| **VetoerUpdated** | Governor | MEDIUM | Settings | ❌ |
| **AuctionCreated** | Auction | HIGH | Auction | ❌ |
| **AuctionBid** | Auction | HIGH | Auction | ❌ |
| **AuctionSettled** | Auction | HIGH | Auction | ❌ |
| **DurationUpdated** | Auction | LOW | Settings | ❌ |
| **ReservePriceUpdated** | Auction | LOW | Settings | ❌ |
| **MinBidIncrementPercentageUpdated** | Auction | LOW | Settings | ❌ |
| **TimeBufferUpdated** | Auction | LOW | Settings | ❌ |
| **Paused** | Auction | MEDIUM | Admin | ❌ |
| **Unpaused** | Auction | MEDIUM | Admin | ❌ |
| **Transfer** | Token | MEDIUM | Token | ❌ |
| **DelegateChanged** | Token | MEDIUM | Delegation | ❌ |
| **DelegateVotesChanged** | Token | LOW | Delegation | ❌ |
| **MintScheduled** | Token | LOW | Admin | ❌ |
| **MintUnscheduled** | Token | LOW | Admin | ❌ |
| **MinterUpdated** | Token | LOW | Admin | ❌ |
| **FounderAllocationsCleared** | Token | MEDIUM | Admin | ❌ |
| **TransactionScheduled** | Treasury | MEDIUM | Treasury | ❌ |
| **TransactionExecuted** | Treasury | MEDIUM | Treasury | ❌ |
| **TransactionCanceled** | Treasury | MEDIUM | Treasury | ❌ |
| **DelayUpdated** | Treasury | LOW | Settings | ❌ |
| **GracePeriodUpdated** | Treasury | LOW | Settings | ❌ |
| **OwnerUpdated** | All | HIGH | Admin | ❌ |
| **OwnerPending** | All | MEDIUM | Admin | ❌ |
| **OwnerCanceled** | All | MEDIUM | Admin | ❌ |
| **Upgraded** | All | MEDIUM | Admin | ❌ |

## Computed Events (Time-based)

These events are computed based on on-chain data and current time:

| Event Name | Priority | Trigger Condition | Category |
|------------|----------|-------------------|----------|
| **Voting Opens** | HIGH | `block.timestamp >= voteStart` | Governance |
| **Voting Closing Soon** | HIGH | `voteEnd - block.timestamp <= threshold` | Governance |
| **Voting Closed** | HIGH | `block.timestamp >= voteEnd` | Governance |
| **Proposal Ready to Queue** | HIGH | Voting closed + succeeded + not queued | Governance |
| **Proposal Ready to Execute** | HIGH | `block.timestamp >= eta` | Governance |
| **Proposal Expiring Soon** | MEDIUM | `expiresAt - block.timestamp <= threshold` | Governance |
| **Auction Ending Soon** | HIGH | `endTime - block.timestamp <= threshold` | Auction |

## Event Parameters Reference

### Governance Events

#### ProposalCreated
```typescript
{
  proposalId: bytes32
  targets: address[]
  values: uint256[]
  calldatas: bytes[]
  description: string
  descriptionHash: bytes32
  proposal: {
    proposer: address
    timeCreated: uint32
    againstVotes: uint32
    forVotes: uint32
    abstainVotes: uint32
    voteStart: uint32
    voteEnd: uint32
    proposalThreshold: uint32
    quorumVotes: uint32
    executed: bool
    canceled: bool
    vetoed: bool
  }
}
```

#### VoteCast
```typescript
{
  voter: address
  proposalId: bytes32
  support: uint256  // 0=Against, 1=For, 2=Abstain
  weight: uint256
  reason: string
}
```

### Auction Events

#### AuctionBid
```typescript
{
  tokenId: uint256
  bidder: address
  amount: uint256
  extended: bool
  endTime: uint256
}
```

#### AuctionSettled
```typescript
{
  tokenId: uint256
  winner: address
  amount: uint256
}
```

### Token Events

#### Transfer
```typescript
{
  from: address  // 0x0 for mints
  to: address    // 0x0 for burns
  tokenId: uint256
}
```

#### DelegateChanged
```typescript
{
  delegator: address
  from: address  // Previous delegate
  to: address    // New delegate
}
```

## Feed Display Templates

### Governance
- **ProposalCreated**: "🎯 New Proposal #{number}: {title} by {proposer}"
- **VoteCast** (with comment): "🗳️ {voter} voted {support} on Proposal #{number}: {reason}"
- **VoteCast** (no comment): "🗳️ {voter} voted {support} on Proposal #{number} with {weight} votes"
- **ProposalQueued**: "⏰ Proposal #{number} queued for execution"
- **ProposalExecuted**: "✅ Proposal #{number} executed"

### Auction
- **AuctionCreated**: "🎨 New auction started for Token #{tokenId}"
- **AuctionBid**: "💰 {bidder} bid {amount} ETH on Token #{tokenId}"
- **AuctionBid** (extended): "⏱️ {bidder} bid {amount} ETH - Auction extended!"
- **AuctionSettled**: "🎉 Token #{tokenId} won by {winner} for {amount} ETH"

### Token
- **Transfer** (mint): "🎨 Token #{tokenId} minted to {to}"
- **Transfer** (transfer): "🔄 Token #{tokenId} transferred to {to}"
- **DelegateChanged**: "🤝 {delegator} delegated votes to {to}"

### Time-based
- **Voting Opens**: "🗳️ Voting opened for Proposal #{number}"
- **Voting Closing Soon**: "⏰ {timeLeft} until voting closes for Proposal #{number}"
- **Auction Ending Soon**: "⏰ {timeLeft} until auction ends for Token #{tokenId}"

## Event Filtering Options

### By Priority
- HIGH: Critical events that users should always see
- MEDIUM: Important but less urgent events
- LOW: Administrative and configuration changes

### By Category
- **Governance**: Proposals and voting
- **Auction**: Auction lifecycle and bidding
- **Token**: Minting and transfers
- **Delegation**: Vote delegation changes
- **Treasury**: Treasury transactions
- **Admin**: Administrative actions
- **Settings**: Configuration changes

### By User Involvement
- Events involving connected wallet
- Events the user voted on
- Tokens the user owns
- Proposals the user created

## Recommended Feed Configurations

### Default Feed (All Users)
- All HIGH priority events
- MEDIUM priority: ProposalCanceled, DelegateChanged, Paused/Unpaused
- Filter out most LOW priority events

### Power User Feed
- All HIGH and MEDIUM priority events
- Selected LOW priority events (threshold changes)
- Show all votes (not just with comments)

### Admin/Dev Feed
- All events including LOW priority
- Show technical details
- Include contract upgrade events

### Mobile Feed (Limited Space)
- Only HIGH priority events
- Collapsible vote threads
- Push notifications for selected events

## Implementation Notes

### Event Listeners
All events can be listened to via:
1. **WebSocket** to Ethereum node
2. **The Graph** subgraph subscriptions  
3. **Polling** RPC event logs

### Data Enrichment
Some events need additional data lookups:
- Proposal numbers (not in event, need counter)
- ENS names for addresses
- Token metadata/images
- Historical vote counts

### Performance Considerations
- **VoteCast** can be very frequent on active proposals
- Consider throttling or grouping vote events
- Cache proposal and token metadata
- Lazy load older events

### Real-time Alerts
Suggested alert thresholds for computed events:
- Voting closing: 24h, 6h, 1h
- Auction ending: 30min, 10min, 5min, 1min
- Proposal expiring: 24h, 1h

