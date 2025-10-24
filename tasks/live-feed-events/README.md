# Live Feed Events Research

This folder contains comprehensive research on all possible events from Nouns Builder contracts that can be used to create a live activity feed for the DAO website.

## 📁 Documents

### 1. `research.md` - Detailed Research
Complete analysis of all contract events with:
- Event descriptions and parameters
- When each event is emitted
- Sample display text
- Priority classifications (HIGH/MEDIUM/LOW)
- Implementation considerations
- Performance and technical notes

**Use this for**: Understanding what events exist and how they work

### 2. `events-quick-reference.md` - Quick Lookup
Summary tables and reference guide with:
- Complete event list with priorities
- Event parameters reference
- Display templates
- Filtering recommendations
- Common configurations

**Use this for**: Quick lookups during implementation

### 3. `feed-examples.md` - UI Examples
Visual examples showing how events appear in the UI:
- Example feed layouts
- Card designs for each event type
- Mobile views
- Grouped events
- Filter interfaces
- Real-world scenarios

**Use this for**: UI/UX design and implementation

## 📊 Summary

### Total Events Identified

**Contract Events**: 35+ events across 5 contracts
- **Governance**: 11 events (proposals, voting, settings)
- **Auction**: 9 events (bidding, settlements, config)
- **Token**: 9 events (minting, transfers, delegation)
- **Treasury**: 5 events (transactions, timelock)
- **Admin/Ownership**: 4 events (all contracts)

**Computed Events**: 7 time-based events
- Proposal state transitions (voting opens/closes/ready)
- Auction ending alerts
- Proposal expiration warnings

### Priority Breakdown

- **HIGH Priority**: 14 events - Core DAO activity
- **MEDIUM Priority**: 12 events - Important but less urgent
- **LOW Priority**: 16 events - Admin and config changes

## 🎯 Key Findings

### Most Important Events for Feed

1. **ProposalCreated** - New proposals
2. **VoteCast** (with comments) - Member voting activity
3. **AuctionBid** - Live bidding activity
4. **AuctionSettled** - Auction winners
5. **ProposalExecuted** - Proposals taking effect
6. **Transfer** (mints) - New tokens entering circulation
7. Time-based alerts (voting/auction deadlines)

### Implementation Recommendations

**Data Source**: Use The Graph subgraph + WebSocket for real-time
- Graph for historical data and complex queries
- WebSocket for instant new events
- Polling as fallback

**Event Volume**: Filter strategically
- Group similar events (multiple votes)
- Show votes with comments prominently
- Collapse admin/config events into "Settings" section

**User Experience**: Multiple view modes
- Default: HIGH + selected MEDIUM events
- Compact: Condensed for mobile
- Detailed: Full event information
- Personalized: User-specific activity

## 🔍 Contract Sources

Research based on Nouns Builder contracts:
- `Governor.json` - Governance events
- `Auction.json` - Auction events  
- `Token.json` - Token and delegation events
- `Treasury.json` - Treasury timelock events
- `Manager.json` - Deployment events

Subgraph handlers analyzed:
- `governor.ts` - Proposal and vote processing
- `auction.ts` - Auction lifecycle
- `token.ts` - Token transfers and delegation

## 📝 Event Categories

### By Function
- **Governance** (proposals, votes, execution)
- **Auction** (bidding, settlements)
- **Token** (minting, transfers)
- **Delegation** (vote delegation)
- **Treasury** (fund management)
- **Admin** (ownership, upgrades)
- **Settings** (parameter changes)

### By Priority
- **HIGH**: User-facing activity (proposals, votes, bids)
- **MEDIUM**: Important changes (delegation, admin actions)
- **LOW**: Configuration and technical updates

### By Source
- **On-chain Events**: Direct from smart contracts
- **Computed Events**: Derived from on-chain data + time

## 🎨 UI Recommendations

### Feed Sections (Optional)
1. **Live Activity** - Real-time events as they happen
2. **Proposals** - All proposal-related activity
3. **Auctions** - Bidding and settlements
4. **Community** - Votes, delegations, mints
5. **Admin** - Settings and administrative changes

### Filtering
- By event type/category
- By priority level
- By time range
- By user involvement
- Show comments only

### Display Modes
- **Cards** (default) - Rich information with actions
- **Compact** - Dense list view
- **Timeline** - Grouped by proposal/auction
- **Notifications** - Personal alerts only

## 🚀 Next Steps

1. **Architecture Decision**
   - Choose data source strategy (Graph vs direct vs hybrid)
   - Design real-time subscription system
   - Plan caching and performance

2. **Implementation Planning**
   - Create feed component architecture
   - Design event card components
   - Build filtering system
   - Add pagination/infinite scroll

3. **UI/UX Design**
   - Design feed layout and cards
   - Create responsive mobile views
   - Design filter interface
   - Plan notification system

4. **Features**
   - Real-time updates
   - Event grouping
   - User preferences
   - Push notifications
   - Social features (reactions, comments)

## 💡 Future Enhancements

- Event reactions and social engagement
- Personalized feed algorithm
- Email/Discord notifications
- Event search and export
- Analytics dashboard
- RSS feed
- Event replay (historical view)

## 📚 Related Documentation

- Nouns Builder contracts: `/references/nouns-builder/`
- The Graph schema: `/references/nouns-builder/apps/subgraph/schema.graphql`
- Existing proposal components: `/src/components/proposals/`
- Auction components: `/src/components/auctions/`

## ⚠️ Important Notes

### Performance Considerations
- VoteCast events can be very frequent
- Consider rate limiting and grouping
- Cache event data client-side
- Implement virtual scrolling for long feeds

### User Experience
- Auto-scroll for new events (with pause option)
- Highlight time-sensitive events
- Group related events intelligently
- Provide clear CTAs (vote, bid, view)

### Data Accuracy
- Handle blockchain reorgs
- Account for indexing delays (~1-2 blocks)
- Show relative timestamps ("2m ago")
- Provide absolute times on hover

## 🤔 Open Questions for Implementation

1. **Scope**: Full history or rolling window (last 7 days)?
2. **Votes**: Show all votes or only significant ones?
3. **Grouping**: How to group related events?
4. **Notifications**: Push, email, both, or neither?
5. **Mobile**: Separate mobile feed design?
6. **Realtime**: WebSocket mandatory or progressive enhancement?
7. **Social**: Enable reactions/comments on events?

---

**Research Date**: October 24, 2025  
**Contracts Version**: Nouns Builder (latest from references)  
**Status**: ✅ Research Complete - Ready for Planning Phase

