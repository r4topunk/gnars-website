/**
 * Live Feed Event Types
 * 
 * Comprehensive type definitions for all DAO events that appear in the live feed.
 * Events are categorized by contract source (Governor, Auction, Token, Treasury).
 */

// Event priority levels determine feed filtering and display prominence
export type EventPriority = "HIGH" | "MEDIUM" | "LOW";

// Event categories for filtering
export type EventCategory = 
  | "governance" 
  | "auction" 
  | "token" 
  | "delegation" 
  | "treasury" 
  | "admin" 
  | "settings";

// Base event interface - all events extend this
export interface BaseEvent {
  id: string;
  timestamp: number;
  blockNumber: number;
  transactionHash: string;
  category: EventCategory;
  priority: EventPriority;
  type: string;
}

// Governance Events
export interface ProposalCreatedEvent extends BaseEvent {
  type: "ProposalCreated";
  category: "governance";
  proposalId: string;
  proposalNumber: number;
  title: string;
  description: string;
  proposer: string;
  voteStart: number;
  voteEnd: number;
  quorumVotes: number;
}

export interface VoteCastEvent extends BaseEvent {
  type: "VoteCast";
  category: "governance";
  proposalId: string;
  proposalNumber: number;
  proposalTitle: string;
  voter: string;
  support: "FOR" | "AGAINST" | "ABSTAIN";
  weight: number;
  reason?: string;
}

export interface ProposalQueuedEvent extends BaseEvent {
  type: "ProposalQueued";
  category: "governance";
  proposalId: string;
  proposalNumber: number;
  proposalTitle: string;
  eta: number;
}

export interface ProposalExecutedEvent extends BaseEvent {
  type: "ProposalExecuted";
  category: "governance";
  proposalId: string;
  proposalNumber: number;
  proposalTitle: string;
}

export interface ProposalCanceledEvent extends BaseEvent {
  type: "ProposalCanceled";
  category: "governance";
  proposalId: string;
  proposalNumber: number;
  proposalTitle: string;
}

export interface ProposalVetoedEvent extends BaseEvent {
  type: "ProposalVetoed";
  category: "governance";
  proposalId: string;
  proposalNumber: number;
  proposalTitle: string;
}

// Auction Events
export interface AuctionCreatedEvent extends BaseEvent {
  type: "AuctionCreated";
  category: "auction";
  tokenId: number;
  startTime: number;
  endTime: number;
}

export interface AuctionBidEvent extends BaseEvent {
  type: "AuctionBid";
  category: "auction";
  tokenId: number;
  bidder: string;
  amount: string;
  extended: boolean;
  endTime: number;
  previousBid?: string;
}

export interface AuctionSettledEvent extends BaseEvent {
  type: "AuctionSettled";
  category: "auction";
  tokenId: number;
  winner: string;
  amount: string;
}

// Token Events
export interface TokenMintedEvent extends BaseEvent {
  type: "TokenMinted";
  category: "token";
  tokenId: number;
  recipient: string;
  isFounder: boolean;
}

export interface TokenTransferredEvent extends BaseEvent {
  type: "TokenTransferred";
  category: "token";
  tokenId: number;
  from: string;
  to: string;
}

export interface DelegateChangedEvent extends BaseEvent {
  type: "DelegateChanged";
  category: "delegation";
  delegator: string;
  fromDelegate: string;
  toDelegate: string;
  tokenCount: number;
}

// Treasury Events
export interface TreasuryTransactionEvent extends BaseEvent {
  type: "TreasuryTransaction";
  category: "treasury";
  proposalId: string;
  proposalNumber: number;
  recipient: string;
  amount: string;
}

// Admin Events
export interface SettingsUpdatedEvent extends BaseEvent {
  type: "SettingsUpdated";
  category: "settings";
  setting: string;
  oldValue: string | number;
  newValue: string | number;
}

export interface OwnershipTransferredEvent extends BaseEvent {
  type: "OwnershipTransferred";
  category: "admin";
  contract: string;
  previousOwner: string;
  newOwner: string;
}

// Computed/Time-based Events
export interface VotingOpenedEvent extends BaseEvent {
  type: "VotingOpened";
  category: "governance";
  proposalId: string;
  proposalNumber: number;
  proposalTitle: string;
  voteEnd: number;
}

export interface VotingClosingSoonEvent extends BaseEvent {
  type: "VotingClosingSoon";
  category: "governance";
  proposalId: string;
  proposalNumber: number;
  proposalTitle: string;
  voteEnd: number;
  hoursLeft: number;
}

export interface AuctionEndingSoonEvent extends BaseEvent {
  type: "AuctionEndingSoon";
  category: "auction";
  tokenId: number;
  currentBid: string;
  currentBidder: string;
  endTime: number;
  minutesLeft: number;
}

// Union type of all possible events
export type FeedEvent =
  | ProposalCreatedEvent
  | VoteCastEvent
  | ProposalQueuedEvent
  | ProposalExecutedEvent
  | ProposalCanceledEvent
  | ProposalVetoedEvent
  | AuctionCreatedEvent
  | AuctionBidEvent
  | AuctionSettledEvent
  | TokenMintedEvent
  | TokenTransferredEvent
  | DelegateChangedEvent
  | TreasuryTransactionEvent
  | SettingsUpdatedEvent
  | OwnershipTransferredEvent
  | VotingOpenedEvent
  | VotingClosingSoonEvent
  | AuctionEndingSoonEvent;

// Feed filter options
export interface FeedFilters {
  priorities: EventPriority[];
  categories: EventCategory[];
  timeRange: "1h" | "24h" | "7d" | "30d" | "all";
  showOnlyWithComments: boolean;
}

