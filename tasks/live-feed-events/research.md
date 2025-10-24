# Research — Live Feed Events

## Goal

Identify all possible contract events from Nouns Builder that can be used to create a comprehensive live feed feature for the DAO website. This will show real-time activity including governance, auctions, token transfers, and administrative actions.

## Contracts Reviewed

Based on the Nouns Builder reference implementation, the following contracts emit events:

1. **Governor Contract** - Governance and voting
2. **Auction Contract** - NFT auctions
3. **Token Contract** - NFT minting and delegation
4. **Treasury Contract** - Timelock and execution
5. **Manager Contract** - DAO deployment and configuration

---

## Event Categories

### 1. GOVERNANCE EVENTS (Governor Contract)

#### 1.1 Proposal Lifecycle Events

**ProposalCreated**
- **When**: A new proposal is submitted
- **Data**: 
  - `proposalId` (bytes32)
  - `targets` (address[]) - Contract addresses to call
  - `values` (uint256[]) - ETH values to send
  - `calldatas` (bytes[]) - Function call data
  - `description` (string) - Proposal title and description
  - `descriptionHash` (bytes32)
  - Full proposal struct with:
    - `proposer` (address)
    - `timeCreated` (uint32)
    - `voteStart` (uint32)
    - `voteEnd` (uint32)
    - `proposalThreshold` (uint32)
    - `quorumVotes` (uint32)
    - Vote counts (for, against, abstain)
    - Status flags (executed, canceled, vetoed)
- **Feed Display**: "🎯 New Proposal #{number}: {title} by {proposer}"
- **Priority**: HIGH

**ProposalQueued**
- **When**: A successful proposal is queued for execution
- **Data**:
  - `proposalId` (bytes32)
  - `eta` (uint256) - Timestamp when it can be executed
- **Feed Display**: "⏰ Proposal #{number} queued for execution at {eta}"
- **Priority**: HIGH

**ProposalExecuted**
- **When**: A queued proposal is executed
- **Data**:
  - `proposalId` (bytes32)
- **Feed Display**: "✅ Proposal #{number}: {title} has been executed"
- **Priority**: HIGH

**ProposalCanceled**
- **When**: A proposal is canceled (by proposer or lack of threshold)
- **Data**:
  - `proposalId` (bytes32)
- **Feed Display**: "❌ Proposal #{number} has been canceled"
- **Priority**: MEDIUM

**ProposalVetoed**
- **When**: A proposal is vetoed by the vetoer
- **Data**:
  - `proposalId` (bytes32)
- **Feed Display**: "🚫 Proposal #{number} has been vetoed"
- **Priority**: HIGH

#### 1.2 Voting Events

**VoteCast**
- **When**: A member casts a vote on a proposal
- **Data**:
  - `voter` (address)
  - `proposalId` (bytes32)
  - `support` (uint256) - 0=Against, 1=For, 2=Abstain
  - `weight` (uint256) - Number of votes
  - `reason` (string) - Optional voting comment
- **Feed Display**: "🗳️ {voter} voted {support} on Proposal #{number} with {weight} votes: {reason}"
- **Priority**: HIGH
- **Note**: Can filter to show only votes with comments, or only large votes

#### 1.3 Governance Settings Events

**VotingDelayUpdated**
- **When**: Voting delay is changed
- **Data**:
  - `prevVotingDelay` (uint256)
  - `newVotingDelay` (uint256)
- **Feed Display**: "⚙️ Voting delay updated from {prev} to {new} blocks"
- **Priority**: LOW

**VotingPeriodUpdated**
- **When**: Voting period is changed
- **Data**:
  - `prevVotingPeriod` (uint256)
  - `newVotingPeriod` (uint256)
- **Feed Display**: "⚙️ Voting period updated from {prev} to {new} blocks"
- **Priority**: LOW

**ProposalThresholdBpsUpdated**
- **When**: Proposal threshold is changed
- **Data**:
  - `prevBps` (uint256)
  - `newBps` (uint256)
- **Feed Display**: "⚙️ Proposal threshold updated to {newBps/100}%"
- **Priority**: LOW

**QuorumVotesBpsUpdated**
- **When**: Quorum threshold is changed
- **Data**:
  - `prevBps` (uint256)
  - `newBps` (uint256)
- **Feed Display**: "⚙️ Quorum threshold updated to {newBps/100}%"
- **Priority**: LOW

**VetoerUpdated**
- **When**: Vetoer address is changed
- **Data**:
  - `prevVetoer` (address)
  - `newVetoer` (address)
- **Feed Display**: "⚙️ Vetoer updated to {newVetoer}"
- **Priority**: MEDIUM

---

### 2. AUCTION EVENTS (Auction Contract)

#### 2.1 Auction Lifecycle Events

**AuctionCreated**
- **When**: A new auction starts for a token
- **Data**:
  - `tokenId` (uint256)
  - `startTime` (uint256)
  - `endTime` (uint256)
- **Feed Display**: "🎨 New auction started for Token #{tokenId}"
- **Priority**: HIGH

**AuctionBid**
- **When**: Someone places a bid
- **Data**:
  - `tokenId` (uint256)
  - `bidder` (address)
  - `amount` (uint256)
  - `extended` (bool) - Whether auction was extended
  - `endTime` (uint256)
- **Feed Display**: "💰 {bidder} bid {amount} ETH on Token #{tokenId}"
- **Priority**: HIGH
- **Note**: Can add special styling for large bids or auction extensions

**AuctionSettled**
- **When**: An auction is settled and token transferred
- **Data**:
  - `tokenId` (uint256)
  - `winner` (address)
  - `amount` (uint256)
- **Feed Display**: "🎉 Token #{tokenId} won by {winner} for {amount} ETH"
- **Priority**: HIGH

#### 2.2 Auction Configuration Events

**DurationUpdated**
- **When**: Auction duration is changed
- **Data**:
  - `duration` (uint256)
- **Feed Display**: "⚙️ Auction duration updated to {duration} seconds"
- **Priority**: LOW

**ReservePriceUpdated**
- **When**: Reserve price is changed
- **Data**:
  - `reservePrice` (uint256)
- **Feed Display**: "⚙️ Reserve price updated to {reservePrice} ETH"
- **Priority**: LOW

**MinBidIncrementPercentageUpdated**
- **When**: Minimum bid increment is changed
- **Data**:
  - `minBidIncrementPercentage` (uint256)
- **Feed Display**: "⚙️ Min bid increment updated to {percentage}%"
- **Priority**: LOW

**TimeBufferUpdated**
- **When**: Time buffer for auction extension is changed
- **Data**:
  - `timeBuffer` (uint256)
- **Feed Display**: "⚙️ Time buffer updated to {timeBuffer} seconds"
- **Priority**: LOW

**Paused**
- **When**: Auctions are paused
- **Data**:
  - `user` (address) - Who paused it
- **Feed Display**: "⏸️ Auctions paused by {user}"
- **Priority**: MEDIUM

**Unpaused**
- **When**: Auctions are unpaused
- **Data**:
  - `user` (address) - Who unpaused it
- **Feed Display**: "▶️ Auctions resumed by {user}"
- **Priority**: MEDIUM

---

### 3. TOKEN EVENTS (Token Contract)

#### 3.1 Token Transfer Events

**Transfer**
- **When**: Token ownership changes (mint, transfer, burn)
- **Data**:
  - `from` (address)
  - `to` (address)
  - `tokenId` (uint256)
- **Feed Display**: 
  - Mint: "🎨 Token #{tokenId} minted to {to}"
  - Transfer: "🔄 Token #{tokenId} transferred from {from} to {to}"
  - Burn: "🔥 Token #{tokenId} burned by {from}"
- **Priority**: MEDIUM
- **Note**: Mint events (from zero address) are HIGH priority

#### 3.2 Delegation Events

**DelegateChanged**
- **When**: A token holder changes their delegate
- **Data**:
  - `delegator` (address)
  - `from` (address) - Previous delegate
  - `to` (address) - New delegate
- **Feed Display**: "🤝 {delegator} delegated votes to {to}"
- **Priority**: MEDIUM

**DelegateVotesChanged**
- **When**: A delegate's vote count changes
- **Data**:
  - `delegate` (address)
  - `prevTotalVotes` (uint256)
  - `newTotalVotes` (uint256)
- **Feed Display**: "📊 {delegate} voting power changed to {newTotalVotes} votes"
- **Priority**: LOW
- **Note**: Might be noisy, consider filtering for significant changes

#### 3.3 Token Management Events

**MintScheduled**
- **When**: A founder token mint is scheduled
- **Data**:
  - `baseTokenId` (uint256)
  - `founderId` (uint256)
  - `founder` (struct) - wallet, ownershipPct, vestExpiry
- **Feed Display**: "📅 Founder mint scheduled for Token #{baseTokenId}"
- **Priority**: LOW

**MintUnscheduled**
- **When**: A founder token mint is unscheduled
- **Data**:
  - `baseTokenId` (uint256)
  - `founderId` (uint256)
  - `founder` (struct)
- **Feed Display**: "🚫 Founder mint unscheduled for Token #{baseTokenId}"
- **Priority**: LOW

**MinterUpdated**
- **When**: Minter permissions are changed
- **Data**:
  - `minter` (address)
  - `allowed` (bool)
- **Feed Display**: "⚙️ Minter {minter} {allowed ? 'added' : 'removed'}"
- **Priority**: LOW

**FounderAllocationsCleared**
- **When**: Founder allocations are cleared
- **Data**:
  - `newFounders` (struct[])
- **Feed Display**: "⚙️ Founder allocations updated"
- **Priority**: MEDIUM

---

### 4. TREASURY EVENTS (Treasury Contract)

#### 4.1 Transaction Events

**TransactionScheduled**
- **When**: A transaction is scheduled in the timelock
- **Data**:
  - `proposalId` (bytes32)
  - `timestamp` (uint256) - When it can be executed
- **Feed Display**: "⏰ Transaction scheduled for execution"
- **Priority**: MEDIUM
- **Note**: Often redundant with ProposalQueued, might skip

**TransactionExecuted**
- **When**: A transaction is executed from the timelock
- **Data**:
  - `proposalId` (bytes32)
  - `targets` (address[])
  - `values` (uint256[])
  - `payloads` (bytes[])
- **Feed Display**: "✅ Treasury transaction executed"
- **Priority**: MEDIUM
- **Note**: Often redundant with ProposalExecuted, might skip

**TransactionCanceled**
- **When**: A scheduled transaction is canceled
- **Data**:
  - `proposalId` (bytes32)
- **Feed Display**: "❌ Treasury transaction canceled"
- **Priority**: MEDIUM

#### 4.2 Treasury Configuration Events

**DelayUpdated**
- **When**: Timelock delay is changed
- **Data**:
  - `prevDelay` (uint256)
  - `newDelay` (uint256)
- **Feed Display**: "⚙️ Timelock delay updated to {newDelay} seconds"
- **Priority**: LOW

**GracePeriodUpdated**
- **When**: Grace period is changed
- **Data**:
  - `prevGracePeriod` (uint256)
  - `newGracePeriod` (uint256)
- **Feed Display**: "⚙️ Grace period updated to {newGracePeriod} seconds"
- **Priority**: LOW

---

### 5. OWNERSHIP EVENTS (All Contracts)

These events exist on all contracts and indicate administrative changes:

**OwnerUpdated**
- **When**: Contract ownership is transferred
- **Data**:
  - `prevOwner` (address)
  - `newOwner` (address)
- **Feed Display**: "👑 Ownership transferred to {newOwner}"
- **Priority**: HIGH

**OwnerPending**
- **When**: Ownership transfer is initiated (two-step)
- **Data**:
  - `owner` (address)
  - `pendingOwner` (address)
- **Feed Display**: "⏳ Ownership transfer initiated to {pendingOwner}"
- **Priority**: MEDIUM

**OwnerCanceled**
- **When**: Pending ownership transfer is canceled
- **Data**:
  - `owner` (address)
  - `canceledOwner` (address)
- **Feed Display**: "❌ Ownership transfer to {canceledOwner} canceled"
- **Priority**: MEDIUM

**Upgraded**
- **When**: Contract implementation is upgraded
- **Data**:
  - `impl` (address)
- **Feed Display**: "🔄 Contract upgraded to {impl}"
- **Priority**: MEDIUM

---

## Computed/Time-Based Events (Not from contracts)

These would need to be computed client-side or via a backend service:

### Proposal State Transitions

**Voting Opens**
- **When**: Current timestamp reaches `voteStart`
- **Compute**: Check proposals where `voteStart <= now < voteEnd`
- **Feed Display**: "🗳️ Voting opened for Proposal #{number}: {title}"
- **Priority**: HIGH

**Voting Closing Soon**
- **When**: Within X hours of `voteEnd`
- **Compute**: Check proposals where `voteEnd - now <= threshold`
- **Feed Display**: "⏰ {timeLeft} until voting closes for Proposal #{number}"
- **Priority**: HIGH
- **Suggested Thresholds**: 24h, 6h, 1h

**Voting Closed**
- **When**: Current timestamp reaches `voteEnd`
- **Compute**: Check proposals where `voteEnd <= now`
- **Feed Display**: "🔒 Voting closed for Proposal #{number}"
- **Priority**: HIGH

**Proposal Ready for Queueing**
- **When**: Voting closed and proposal succeeded
- **Compute**: Check executed=false, canceled=false, vetoed=false, forVotes >= quorum
- **Feed Display**: "✨ Proposal #{number} passed and ready to queue"
- **Priority**: HIGH

**Proposal Ready for Execution**
- **When**: Queued proposal reached its ETA
- **Compute**: Check queued proposals where `eta <= now`
- **Feed Display**: "⚡ Proposal #{number} ready for execution"
- **Priority**: HIGH

**Proposal Expiring Soon**
- **When**: Queued proposal approaching expiration
- **Compute**: Check queued proposals where `expiresAt - now <= threshold`
- **Feed Display**: "⚠️ Proposal #{number} expires in {timeLeft}"
- **Priority**: MEDIUM

### Auction Events

**Auction Ending Soon**
- **When**: Within X minutes of auction end
- **Compute**: Check current auction where `endTime - now <= threshold`
- **Feed Display**: "⏰ {timeLeft} until auction ends for Token #{tokenId}"
- **Priority**: HIGH
- **Suggested Thresholds**: 30min, 10min, 5min, 1min

**Auction Extended**
- **When**: Bid placed within time buffer
- **Compute**: Detected via `extended` flag in AuctionBid event
- **Feed Display**: "⏱️ Auction extended to {newEndTime}"
- **Priority**: MEDIUM

### Delegate Changes

**New Top Delegate**
- **When**: A delegate becomes top 10 by voting power
- **Compute**: Track delegate voting power changes
- **Feed Display**: "🌟 {delegate} entered top 10 delegates with {votes} votes"
- **Priority**: LOW

---

## Event Priority Classification

### HIGH Priority (Always Show)
- Proposal created, queued, executed, vetoed
- Voting opens/closes alerts
- Vote cast (with comments or large votes)
- Auction created, bid, settled
- New auction ending soon alerts
- Token minted
- Ownership transferred

### MEDIUM Priority (Configurable)
- Proposal canceled
- Delegation changes
- Administrative updates (vetoer, founders)
- Auction/treasury paused states
- Pending ownership transfers

### LOW Priority (Optional/Settings)
- Parameter updates (voting delay, quorum, etc.)
- Auction config changes
- Treasury timelock updates
- Delegate vote count changes
- Scheduled/unscheduled mints

---

## Data Sources

### Primary: Smart Contract Events
- Listen to contract events via WebSocket or polling
- Use event logs from Ethereum nodes
- Consider using The Graph subgraph for historical data

### Secondary: Computed Data
- Backend service or client-side computation
- Check timestamps against current time
- Calculate proposal states based on on-chain data

---

## Implementation Considerations

### Real-time Updates
1. **WebSocket Connection**: Listen to new blocks and filter events
2. **The Graph Subscriptions**: Real-time subgraph subscriptions
3. **Polling**: Periodic checks for new events (fallback)

### Historical Data
1. **The Graph**: Query subgraph for past events
2. **Event Logs**: Query past logs from RPC endpoints
3. **Indexed Database**: Cache events in backend database

### Event Filtering
- Allow users to filter by event type
- Filter by priority level
- Search/filter by address or proposal ID
- Date range filtering

### Notifications
- Push notifications for HIGH priority events
- Email digests option
- Discord/Twitter bot integration

### Performance
- Limit events shown (e.g., last 100)
- Pagination for older events
- Lazy loading as user scrolls
- Cache frequently accessed data

---

## Existing Patterns

The subgraph implementation shows:
- Events are indexed and stored in entities
- Relationships between proposals, votes, auctions, and tokens
- Vote counting and aggregation is done
- Proposal state is tracked through multiple events
- DAO metrics (totalSupply, ownerCount, voterCount, etc.) are maintained

---

## Open Questions

1. Should we show ALL vote events or only meaningful ones (with comments, large votes)?
2. How far back should the feed go? (Last 24h, 7 days, 30 days?)
3. Should low-priority config events be in a separate "admin log"?
4. Real-time vs polling interval tradeoffs?
5. Should we group related events (e.g., all votes on same proposal)?
6. Mobile push notifications scope?

---

## Risks / Constraints

1. **Event Volume**: Popular DAOs may generate many events (especially votes)
2. **RPC Limits**: Free RPC providers have rate limits
3. **WebSocket Reliability**: Connections can drop, need reconnection logic
4. **Timestamp Accuracy**: Blockchain timestamps are approximate
5. **Reorgs**: Chain reorganizations could invalidate recent events
6. **Gas Costs**: Fetching historical logs can be expensive
7. **Indexing Delay**: The Graph has ~1-2 block delay

---

## Next Steps

1. Create implementation plan for live feed architecture
2. Design UI/UX for feed display with different priority levels
3. Decide on data source strategy (Graph vs direct events vs hybrid)
4. Plan alert/notification system
5. Define filtering and personalization options

