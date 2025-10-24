# Live Feed - UI Examples

This document shows concrete examples of how each event type would appear in the live feed UI.

---

## Example Feed (Mixed Events)

```
🗳️ 2 minutes ago
alice.eth voted FOR on Proposal #42 with 15 votes
"This will be great for the community treasury management"
[View Proposal]

💰 5 minutes ago
bob.eth bid 4.2 ETH on Gnar #123
Current bid: 4.2 ETH
[View Auction]

🎯 12 minutes ago
New Proposal #42: "Treasury Diversification Strategy"
by charlie.eth
Voting starts in 2 hours
[View Details]

🎨 18 minutes ago
New auction started for Gnar #123
Ends in 23h 42m
[View Auction]

⏰ 1 hour ago
Voting closing in 6 hours for Proposal #41
Current: 89 FOR, 12 AGAINST (45% quorum reached)
[View Proposal]

🗳️ 1 hour ago
dave.eth voted AGAINST on Proposal #41 with 8 votes
"I think we need more discussion on this"
[View Proposal]

✅ 2 hours ago
Proposal #40: "Grant to Art Collective" executed
[View Proposal]

🎉 3 hours ago
Gnar #122 won by alice.eth for 3.7 ETH
[View Token]
```

---

## Event Examples by Category

### 1. Governance Events

#### Proposal Created
```
🎯 Just now
New Proposal #42: "Treasury Diversification Strategy"
by 0x1234...5678
Voting starts in 2 days
[View Details] [Share]
```

With ENS:
```
🎯 Just now
New Proposal #42: "Treasury Diversification Strategy"
by charlie.eth
Voting starts in 2 days • Ends Oct 28
[View Details] [Share]
```

#### Vote Cast (with comment)
```
🗳️ 3 minutes ago
alice.eth voted FOR on Proposal #42 with 15 votes
"This will help diversify our treasury and reduce risk exposure.
The proposed strategy is well-researched."
[View Proposal] [Reply]
```

#### Vote Cast (large vote, no comment)
```
🗳️ 5 minutes ago
🔥 whale.eth voted FOR on Proposal #42 with 127 votes
[View Proposal]
```

#### Vote Cast (regular vote, no comment - condensed)
```
🗳️ 8 minutes ago
bob.eth (8 votes) • charlie.eth (3 votes) • dave.eth (12 votes)
voted FOR on Proposal #42
[View All Votes]
```

#### Proposal State Changes
```
⏰ 2 hours ago
Proposal #42: "Treasury Diversification Strategy" is ready to queue
Result: ✅ PASSED (156 FOR, 23 AGAINST, 89% quorum)
[Queue Proposal]
```

```
✅ Just now
Proposal #40: "Grant to Art Collective" has been executed
[View Transactions]
```

```
🚫 1 hour ago
Proposal #38 has been vetoed
[View Details]
```

#### Time-based Alerts
```
⏰ Just now
Voting opens NOW for Proposal #42
"Treasury Diversification Strategy"
[Cast Your Vote]
```

```
⏰ 5 hours ago
⚠️ Last 6 hours to vote on Proposal #41
Current: 89 FOR, 12 AGAINST (45% quorum)
[Vote Now]
```

---

### 2. Auction Events

#### Auction Created
```
🎨 Just now
New auction started for Gnar #123
Reserve price: 0.1 ETH
Ends in 23h 59m
[View Auction] [Place Bid]
```

#### Auction Bid (regular)
```
💰 2 minutes ago
alice.eth bid 2.5 ETH on Gnar #123
Previous: 2.3 ETH (+8.7%)
[View Auction] [Outbid]
```

#### Auction Bid (extension)
```
💰⏱️ 30 seconds ago
bob.eth bid 4.2 ETH on Gnar #123
Auction extended by 10 minutes!
Ends in 9m 30s
[View Auction] [Place Bid]
```

#### Auction Bid (large increase)
```
💰🔥 1 minute ago
whale.eth bid 10.5 ETH on Gnar #123
Previous: 4.2 ETH (+150%!)
[View Auction]
```

#### Auction Settled
```
🎉 5 minutes ago
Gnar #123 won by alice.eth for 4.2 ETH
[View Token] [View on OpenSea]
```

#### Auction Ending Soon
```
⏰⚡ Just now
1 MINUTE LEFT for Gnar #123 auction
Current bid: 4.2 ETH by bob.eth
[Place Final Bid]
```

---

### 3. Token Events

#### Token Minted
```
🎨 Just now
Gnar #124 minted to alice.eth
[View Token]
```

#### Token Minted (Founder)
```
🎨 2 hours ago
Gnar #120 minted to founders.eth
Founder allocation (5%)
[View Token]
```

#### Token Transfer
```
🔄 15 minutes ago
Gnar #120 transferred from alice.eth to bob.eth
[View Token]
```

#### Delegation Changed
```
🤝 10 minutes ago
alice.eth delegated 15 votes to charlie.eth
[View Delegate Profile]
```

#### Delegation Changed (self-delegation)
```
🤝 5 minutes ago
bob.eth self-delegated 8 votes
[View Voter Profile]
```

---

### 4. Treasury Events

#### Transaction Executed
```
✅ 30 minutes ago
Treasury sent 50 ETH to grantee.eth
Proposal #40: "Grant to Art Collective"
[View Transaction]
```

---

### 5. Administrative Events

#### Settings Update
```
⚙️ 1 day ago
Quorum threshold updated to 15%
Previous: 10%
[View Settings]
```

#### Ownership Transfer
```
👑 2 days ago
Ownership transferred to dao.gnars.eth
Previous: deployer.eth
[View Details]
```

#### Contract Upgrade
```
🔄 3 days ago
Governor contract upgraded
Version: 2.1.0
[View Changes]
```

#### Auctions Paused
```
⏸️ 1 hour ago
Auctions paused by admin.eth
[View Status]
```

---

## Feed View Modes

### Compact View
```
🗳️ alice.eth voted FOR #42 (15 votes) • 2m ago
💰 bob.eth bid 4.2Ξ on #123 • 5m ago
🎯 New Proposal #42 by charlie.eth • 12m ago
🎨 Auction #123 started • 18m ago
⏰ 6h left for Proposal #41 • 1h ago
```

### Card View (Default)
```
┌─────────────────────────────────────────┐
│ 🗳️ 2 minutes ago                        │
│                                         │
│ alice.eth voted FOR on Proposal #42     │
│ with 15 votes                           │
│                                         │
│ "This will be great for the treasury"   │
│                                         │
│ [View Proposal] [Reply]                 │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 💰 5 minutes ago                        │
│                                         │
│ bob.eth bid 4.2 ETH on Gnar #123        │
│ Previous: 3.8 ETH (+10.5%)              │
│                                         │
│ [View Auction] [Outbid]                 │
└─────────────────────────────────────────┘
```

### Detailed View
```
┌─────────────────────────────────────────────────┐
│ 🗳️ Vote Cast                                    │
│ 2 minutes ago • Block #18,234,567               │
│                                                 │
│ alice.eth voted FOR                             │
│ Proposal #42: "Treasury Diversification"        │
│                                                 │
│ Vote Weight: 15 votes (4.2% of supply)          │
│                                                 │
│ Comment:                                        │
│ "This will help diversify our treasury and      │
│ reduce risk exposure. The proposed strategy     │
│ is well-researched and I support it fully."     │
│                                                 │
│ [View Proposal] [View Voter] [Reply] [Share]    │
│                                                 │
│ Transaction: 0xabc123...def456                  │
│ [View on Etherscan]                             │
└─────────────────────────────────────────────────┘
```

---

## Grouped Events

### Multiple Votes
```
┌─────────────────────────────────────────────────┐
│ 🗳️ 5-8 minutes ago                              │
│                                                 │
│ 3 votes cast on Proposal #42                    │
│                                                 │
│ ✅ bob.eth (8 votes)                            │
│ ✅ charlie.eth (3 votes)                        │
│ ✅ dave.eth (12 votes)                          │
│                                                 │
│ All voted FOR                                   │
│                                                 │
│ [View All Votes] [View Proposal]                │
└─────────────────────────────────────────────────┘
```

### Proposal Timeline
```
┌─────────────────────────────────────────────────┐
│ 📋 Proposal #40: "Grant to Art Collective"      │
│                                                 │
│ ✅ Just now: Executed                           │
│ ⏰ 2 hours ago: Queued                          │
│ 🗳️ 2 days ago: Voting closed (PASSED)          │
│ 🗳️ 4 days ago: Voting opened                   │
│ 🎯 6 days ago: Created by alice.eth             │
│                                                 │
│ [View Full Timeline]                            │
└─────────────────────────────────────────────────┘
```

---

## Filter Examples

### Filter Bar
```
[All Events ▼] [All Categories ▼] [All Time ▼] [🔔 Alerts Only]

Active Filters:
✕ Governance  ✕ High Priority  ✕ Last 24h
```

### Filter Options
```
Priority:
☑ High
☑ Medium
☐ Low

Category:
☑ Governance
☑ Auctions
☑ Tokens
☐ Delegation
☐ Treasury
☐ Admin

Time:
○ Last hour
● Last 24 hours
○ Last 7 days
○ Last 30 days
○ All time

Special:
☑ Show votes with comments only
☐ My activity only
☐ Tokens I own
☐ Proposals I voted on
```

---

## Mobile View

### Compact Cards
```
┌─────────────────────────┐
│ 🗳️ 2m ago               │
│ alice.eth voted FOR #42 │
│ "This will be great..." │
│ [Expand]                │
└─────────────────────────┘

┌─────────────────────────┐
│ 💰 5m ago               │
│ bob.eth: 4.2Ξ on #123   │
│ [View]                  │
└─────────────────────────┘
```

### Bottom Sheet (Expanded)
```
┌─────────────────────────────────┐
│ ━━━━━━━                         │
│                                 │
│ 🗳️ Vote Cast                    │
│ 2 minutes ago                   │
│                                 │
│ alice.eth voted FOR             │
│ Proposal #42                    │
│                                 │
│ 15 votes (4.2% of supply)       │
│                                 │
│ "This will be great for the     │
│ community treasury management   │
│ and helps diversify risk."      │
│                                 │
│ [View Proposal] [View Voter]    │
│ [Share]                         │
└─────────────────────────────────┘
```

---

## Push Notifications

### High Priority
```
🔔 Gnars DAO
New Proposal #42
"Treasury Diversification Strategy"
Tap to view • 2m ago
```

### Urgent Alert
```
🔔🔥 Gnars DAO
⏰ 1 MINUTE LEFT!
Auction for Gnar #123
Current bid: 4.2 ETH
Tap to bid • Just now
```

### Personal
```
🔔 Gnars DAO
alice.eth replied to your vote
Proposal #42: "I agree with your points"
Tap to view • 5m ago
```

---

## Empty States

### No Events
```
┌─────────────────────────────────┐
│         🔍                      │
│                                 │
│   No events found               │
│                                 │
│   Try adjusting your filters    │
│   or check back later           │
└─────────────────────────────────┘
```

### Loading
```
┌─────────────────────────────────┐
│   ⟳ Loading events...           │
│                                 │
│   [Skeleton Card]               │
│   [Skeleton Card]               │
│   [Skeleton Card]               │
└─────────────────────────────────┘
```

### Error
```
┌─────────────────────────────────┐
│         ⚠️                      │
│                                 │
│   Failed to load events         │
│                                 │
│   [Retry]                       │
└─────────────────────────────────┘
```

---

## Real-world Event Examples (Gnars DAO)

### Typical Daily Activity

**Morning (EST)**
```
🎨 8:02 AM - New auction for Gnar #234
🗳️8:15 AM - dao-member.eth voted FOR on Proposal #15 (6 votes)
💰 8:23 AM - collector.eth bid 1.5 ETH on Gnar #234
🗳️8:34 AM - skater.eth voted FOR on Proposal #15: "Sick proposal! 🛹"
💰 8:45 AM - artist.eth bid 1.8 ETH on Gnar #234
```

**Active Voting Period**
```
🗳️ 2:12 PM - member1.eth voted FOR #15 (12 votes)
🗳️ 2:15 PM - member2.eth voted FOR #15 (3 votes)
🗳️ 2:18 PM - member3.eth voted AGAINST #15 (8 votes): "Need more clarity"
🗳️ 2:23 PM - member4.eth voted FOR #15 (15 votes): "Let's do this!"
⏰ 2:30 PM - 6 hours left to vote on Proposal #15
```

**Auction Finale**
```
💰 7:45 PM - bidder1.eth bid 3.2 ETH on Gnar #234
⏰ 7:50 PM - ⚡ 10 MINUTES LEFT for Gnar #234
💰 7:52 PM - bidder2.eth bid 3.5 ETH on Gnar #234
💰⏱️ 7:58 PM - bidder1.eth bid 3.8 ETH - Auction extended!
💰 8:02 PM - bidder2.eth bid 4.1 ETH on Gnar #234
🎉 8:12 PM - Gnar #234 won by bidder2.eth for 4.1 ETH
```

---

## Interactive Elements

### Hover States
```
┌─────────────────────────────────┐
│ 🗳️ 2 minutes ago                │
│                                 │
│ alice.eth voted FOR on #42      │  ← Hover shows:
│ with 15 votes                   │    • Full address
│                                 │    • Exact timestamp
│ [View Proposal →]               │    • Block number
└─────────────────────────────────┘    • Transaction hash
```

### Action Buttons
```
[View Proposal] ← Primary action
[Share] ← Secondary action  
[⋯] ← More options:
     • Copy link
     • Report
     • Hide similar
```

### Inline Reactions (Future)
```
🗳️ alice.eth voted FOR on Proposal #42
"This will be great for the community"

👍 3  ❤️ 2  🔥 1  [+]
```

