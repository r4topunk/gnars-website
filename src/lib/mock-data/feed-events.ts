/**
 * Mock data generator for live feed events
 * 
 * Generates realistic event data for development and testing.
 * Replace with actual data fetching in production.
 */

import { FeedEvent, EventPriority } from "@/lib/types/feed-events";

const SAMPLE_ADDRESSES = [
  "0x1234567890123456789012345678901234567890",
  "0x2345678901234567890123456789012345678901",
  "0x3456789012345678901234567890123456789012",
  "0x4567890123456789012345678901234567890123",
  "0x5678901234567890123456789012345678901234",
];

const SAMPLE_ENS_NAMES = [
  "alice.eth",
  "bob.eth",
  "charlie.eth",
  "skater.eth",
  "artist.eth",
];

const SAMPLE_PROPOSAL_TITLES = [
  "Treasury Diversification Strategy",
  "Grant to Art Collective",
  "Improve DAO Governance Process",
  "Community Event Funding",
  "Protocol Upgrade Proposal",
];

const SAMPLE_VOTE_REASONS = [
  "This will be great for the community treasury management and helps diversify risk.",
  "I think we need more discussion on this before moving forward.",
  "Fully support this initiative! Let's go! 🛹",
  "The numbers look good, voting yes.",
  "Not convinced this is the right approach yet.",
  "",
  "",
  "",
];

let eventIdCounter = 0;
const now = Math.floor(Date.now() / 1000);

function randomAddress(): string {
  return SAMPLE_ADDRESSES[Math.floor(Math.random() * SAMPLE_ADDRESSES.length)];
}

// Unused for now but kept for future ENS resolution feature
// function randomENS(): string {
//   return SAMPLE_ENS_NAMES[Math.floor(Math.random() * SAMPLE_ENS_NAMES.length)];
// }

function randomAmount(): string {
  return (Math.random() * 5 + 0.5).toFixed(2);
}

function randomHash(): string {
  return "0x" + Math.random().toString(16).substring(2, 66);
}

/**
 * Generate mock feed events for the last N hours
 */
export function generateMockFeedEvents(hours: number = 24): FeedEvent[] {
  const events: FeedEvent[] = [];
  const timeSpan = hours * 3600;
  
  // Generate 30-50 events distributed over the time span
  const eventCount = Math.floor(Math.random() * 20) + 30;
  
  for (let i = 0; i < eventCount; i++) {
    const timestamp = now - Math.floor(Math.random() * timeSpan);
    const blockNumber = 18000000 + Math.floor((now - timestamp) / 12);
    
    // Randomly select event type
    const rand = Math.random();
    
    if (rand < 0.15) {
      // Vote cast event (most common)
      const proposalNumber = Math.floor(Math.random() * 50) + 1;
      const hasReason = Math.random() > 0.5;
      events.push({
        id: `vote-${eventIdCounter++}`,
        type: "VoteCast",
        category: "governance",
        priority: hasReason ? "HIGH" : "MEDIUM" as EventPriority,
        timestamp,
        blockNumber,
        transactionHash: randomHash(),
        proposalId: randomHash(),
        proposalNumber,
        proposalTitle: SAMPLE_PROPOSAL_TITLES[proposalNumber % SAMPLE_PROPOSAL_TITLES.length],
        voter: randomAddress(),
        support: Math.random() > 0.2 ? "FOR" : Math.random() > 0.5 ? "AGAINST" : "ABSTAIN",
        weight: Math.floor(Math.random() * 50) + 1,
        reason: hasReason ? SAMPLE_VOTE_REASONS[Math.floor(Math.random() * SAMPLE_VOTE_REASONS.length)] : undefined,
      });
    } else if (rand < 0.25) {
      // Auction bid event
      const tokenId = Math.floor(Math.random() * 200) + 100;
      const amount = randomAmount();
      events.push({
        id: `bid-${eventIdCounter++}`,
        type: "AuctionBid",
        category: "auction",
        priority: "HIGH",
        timestamp,
        blockNumber,
        transactionHash: randomHash(),
        tokenId,
        bidder: randomAddress(),
        amount,
        extended: Math.random() > 0.8,
        endTime: timestamp + 3600,
        previousBid: (parseFloat(amount) - Math.random() * 0.5).toFixed(2),
      });
    } else if (rand < 0.3) {
      // Proposal created
      const proposalNumber = Math.floor(Math.random() * 50) + 1;
      events.push({
        id: `proposal-${eventIdCounter++}`,
        type: "ProposalCreated",
        category: "governance",
        priority: "HIGH",
        timestamp,
        blockNumber,
        transactionHash: randomHash(),
        proposalId: randomHash(),
        proposalNumber,
        title: SAMPLE_PROPOSAL_TITLES[proposalNumber % SAMPLE_PROPOSAL_TITLES.length],
        description: "Detailed proposal description here...",
        proposer: randomAddress(),
        voteStart: timestamp + 7200,
        voteEnd: timestamp + 86400,
        quorumVotes: 100,
      });
    } else if (rand < 0.35) {
      // Auction settled
      const tokenId = Math.floor(Math.random() * 200) + 100;
      events.push({
        id: `settled-${eventIdCounter++}`,
        type: "AuctionSettled",
        category: "auction",
        priority: "HIGH",
        timestamp,
        blockNumber,
        transactionHash: randomHash(),
        tokenId,
        winner: randomAddress(),
        amount: randomAmount(),
      });
    } else if (rand < 0.4) {
      // Auction created
      const tokenId = Math.floor(Math.random() * 200) + 100;
      events.push({
        id: `auction-${eventIdCounter++}`,
        type: "AuctionCreated",
        category: "auction",
        priority: "HIGH",
        timestamp,
        blockNumber,
        transactionHash: randomHash(),
        tokenId,
        startTime: timestamp,
        endTime: timestamp + 86400,
      });
    } else if (rand < 0.5) {
      // Token minted
      const tokenId = Math.floor(Math.random() * 200) + 100;
      events.push({
        id: `mint-${eventIdCounter++}`,
        type: "TokenMinted",
        category: "token",
        priority: "HIGH",
        timestamp,
        blockNumber,
        transactionHash: randomHash(),
        tokenId,
        recipient: randomAddress(),
        isFounder: Math.random() > 0.9,
      });
    } else if (rand < 0.6) {
      // Delegate changed
      events.push({
        id: `delegate-${eventIdCounter++}`,
        type: "DelegateChanged",
        category: "delegation",
        priority: "MEDIUM",
        timestamp,
        blockNumber,
        transactionHash: randomHash(),
        delegator: randomAddress(),
        fromDelegate: randomAddress(),
        toDelegate: randomAddress(),
        tokenCount: Math.floor(Math.random() * 10) + 1,
      });
    } else if (rand < 0.65) {
      // Proposal executed
      const proposalNumber = Math.floor(Math.random() * 50) + 1;
      events.push({
        id: `executed-${eventIdCounter++}`,
        type: "ProposalExecuted",
        category: "governance",
        priority: "HIGH",
        timestamp,
        blockNumber,
        transactionHash: randomHash(),
        proposalId: randomHash(),
        proposalNumber,
        proposalTitle: SAMPLE_PROPOSAL_TITLES[proposalNumber % SAMPLE_PROPOSAL_TITLES.length],
      });
    } else if (rand < 0.7) {
      // Voting opened (computed event)
      const proposalNumber = Math.floor(Math.random() * 50) + 1;
      events.push({
        id: `voting-open-${eventIdCounter++}`,
        type: "VotingOpened",
        category: "governance",
        priority: "HIGH",
        timestamp,
        blockNumber,
        transactionHash: randomHash(),
        proposalId: randomHash(),
        proposalNumber,
        proposalTitle: SAMPLE_PROPOSAL_TITLES[proposalNumber % SAMPLE_PROPOSAL_TITLES.length],
        voteEnd: timestamp + 86400,
      });
    } else if (rand < 0.75) {
      // Voting closing soon
      const proposalNumber = Math.floor(Math.random() * 50) + 1;
      events.push({
        id: `voting-closing-${eventIdCounter++}`,
        type: "VotingClosingSoon",
        category: "governance",
        priority: "HIGH",
        timestamp,
        blockNumber,
        transactionHash: randomHash(),
        proposalId: randomHash(),
        proposalNumber,
        proposalTitle: SAMPLE_PROPOSAL_TITLES[proposalNumber % SAMPLE_PROPOSAL_TITLES.length],
        voteEnd: timestamp + 3600,
        hoursLeft: 1,
      });
    } else {
      // Settings updated
      const settings = ["Voting Delay", "Quorum Threshold", "Reserve Price"];
      const setting = settings[Math.floor(Math.random() * settings.length)];
      events.push({
        id: `settings-${eventIdCounter++}`,
        type: "SettingsUpdated",
        category: "settings",
        priority: "LOW",
        timestamp,
        blockNumber,
        transactionHash: randomHash(),
        setting,
        oldValue: Math.floor(Math.random() * 100),
        newValue: Math.floor(Math.random() * 100),
      });
    }
  }
  
  // Sort by timestamp descending (newest first)
  return events.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Get a single mock event for testing
 */
export function generateMockEvent(type: FeedEvent["type"]): FeedEvent {
  const events = generateMockFeedEvents(1);
  const matchingEvent = events.find(e => e.type === type);
  return matchingEvent || events[0];
}

