# Gnars Subgraph MCP Server Specification

## Overview

An MCP (Model Context Protocol) server that enables AI agents to research and discuss Gnars DAO proposals using the Nouns Builder subgraph on Base. The server provides tools for fetching proposal data, semantic search over proposal text, and detailed analysis of voting patterns.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Claude Agent                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ MCP Protocol (stdio)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Gnars Subgraph MCP Server                      │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │   Tools     │  │   Resources  │  │    Embedding Store      │ │
│  │             │  │              │  │                         │ │
│  │ - proposals │  │ - proposal   │  │  SQLite + better-sqlite3│ │
│  │ - votes     │  │   by id      │  │  HuggingFace Transformers│ │
│  │ - search    │  │              │  │  (all-MiniLM-L6-v2)     │ │
│  └─────────────┘  └──────────────┘  └─────────────────────────┘ │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Subgraph Client                        │   │
│  │                                                           │   │
│  │  Goldsky API: api.goldsky.com/api/public/.../subgraphs/  │   │
│  │  Network: Base Mainnet (Chain ID: 8453)                   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Subgraph Client

Fetches data from the Nouns Builder subgraph on Base.

**Endpoint:**
```
https://api.goldsky.com/api/public/{GOLDSKY_PROJECT_ID}/subgraphs/nouns-builder-base-mainnet/latest/gn
```

**DAO Governor Address:** `0x2ff7852a23e408cb6b7ba5c89384672eb88dab2e`

### 2. Embedding Store (SQLite + HuggingFace Transformers)

Stores proposal text embeddings for semantic search. Uses the `all-MiniLM-L6-v2` model (384 dimensions) via `@huggingface/transformers` for local embedding generation. Similarity search is performed using cosine similarity in pure JavaScript.

**Schema:**
```sql
-- Proposals table
CREATE TABLE proposals (
  id TEXT PRIMARY KEY,                    -- proposalId (hex)
  proposal_number INTEGER UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  proposer TEXT NOT NULL,
  status TEXT NOT NULL,
  time_created INTEGER NOT NULL,          -- Unix timestamp
  vote_start TEXT NOT NULL,               -- ISO date
  vote_end TEXT NOT NULL,                 -- ISO date
  for_votes INTEGER DEFAULT 0,
  against_votes INTEGER DEFAULT 0,
  abstain_votes INTEGER DEFAULT 0,
  quorum_votes INTEGER DEFAULT 0,
  executed INTEGER DEFAULT 0,             -- Boolean as 0/1
  canceled INTEGER DEFAULT 0,
  vetoed INTEGER DEFAULT 0,
  queued INTEGER DEFAULT 0,
  transaction_hash TEXT,
  updated_at INTEGER NOT NULL             -- Last sync timestamp
);

-- Votes table
CREATE TABLE votes (
  id TEXT PRIMARY KEY,                    -- Composite: proposalId-voter
  proposal_id TEXT NOT NULL,
  voter TEXT NOT NULL,
  support INTEGER NOT NULL,               -- 0=Against, 1=For, 2=Abstain
  weight TEXT NOT NULL,                   -- Vote weight as string (big number)
  reason TEXT,
  timestamp INTEGER NOT NULL,
  transaction_hash TEXT,
  FOREIGN KEY (proposal_id) REFERENCES proposals(id)
);

-- Vector embeddings table (sqlite-vss)
CREATE VIRTUAL TABLE proposal_embeddings USING vss0(
  embedding(384)                          -- Using all-MiniLM-L6-v2 (384 dimensions)
);

-- Mapping table for embeddings
CREATE TABLE proposal_embedding_map (
  rowid INTEGER PRIMARY KEY,
  proposal_id TEXT NOT NULL,
  chunk_index INTEGER DEFAULT 0,          -- For chunked long descriptions
  chunk_text TEXT NOT NULL,
  FOREIGN KEY (proposal_id) REFERENCES proposals(id)
);

-- Indexes
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_time ON proposals(time_created DESC);
CREATE INDEX idx_votes_proposal ON votes(proposal_id);
CREATE INDEX idx_votes_voter ON votes(voter);
```

### 3. Embedding Generation

**Model:** `all-MiniLM-L6-v2` via `@xenova/transformers` (runs locally, no API needed)

**Chunking Strategy:**
- Max chunk size: 512 tokens
- Overlap: 50 tokens
- Index both title and description
- Store chunk text for retrieval context

## MCP Tools

### 1. `list_proposals`

List all proposals with optional filtering.

**Parameters:**
```typescript
{
  status?: "PENDING" | "ACTIVE" | "CANCELLED" | "DEFEATED" | "SUCCEEDED" | "QUEUED" | "EXPIRED" | "EXECUTED" | "VETOED";
  limit?: number;      // Default: 20, Max: 100
  offset?: number;     // Default: 0
  order?: "asc" | "desc";  // Default: desc (newest first)
}
```

**Returns:**
```typescript
{
  proposals: Array<{
    proposalNumber: number;
    title: string;
    status: string;
    proposer: string;
    forVotes: number;
    againstVotes: number;
    abstainVotes: number;
    quorumVotes: number;
    voteStart: string;
    voteEnd: string;
    timeCreated: number;
  }>;
  total: number;
  hasMore: boolean;
}
```

### 2. `get_proposal`

Get detailed information about a specific proposal.

**Parameters:**
```typescript
{
  id: string | number;  // proposalId (hex) OR proposalNumber
}
```

**Returns:**
```typescript
{
  proposalId: string;
  proposalNumber: number;
  title: string;
  description: string;
  status: string;
  proposer: string;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  quorumVotes: number;
  voteStart: string;
  voteEnd: string;
  timeCreated: number;
  executed: boolean;
  canceled: boolean;
  vetoed: boolean;
  queued: boolean;
  transactionHash: string;
  // Computed fields
  totalVotes: number;
  participationRate: string;  // "X% of quorum"
  result: "PASSING" | "FAILING" | "TIE" | null;
}
```

### 3. `get_proposal_votes`

Get votes for a specific proposal.

**Parameters:**
```typescript
{
  proposalId: string | number;  // proposalId (hex) OR proposalNumber
  support?: "FOR" | "AGAINST" | "ABSTAIN";  // Filter by vote type
  limit?: number;      // Default: 50
  offset?: number;
}
```

**Returns:**
```typescript
{
  votes: Array<{
    voter: string;
    support: "FOR" | "AGAINST" | "ABSTAIN";
    weight: string;
    reason: string | null;
    timestamp: number;
    transactionHash: string;
  }>;
  summary: {
    totalVoters: number;
    forVoters: number;
    againstVoters: number;
    abstainVoters: number;
  };
}
```

### 4. `search_proposals`

Semantic search over proposal text using vector similarity.

**Parameters:**
```typescript
{
  query: string;       // Natural language search query
  limit?: number;      // Default: 5, Max: 20
  status?: string;     // Optional status filter
  threshold?: number;  // Similarity threshold 0-1, Default: 0.3
}
```

**Returns:**
```typescript
{
  results: Array<{
    proposalNumber: number;
    title: string;
    status: string;
    relevantExcerpt: string;  // The matching chunk
    similarity: number;       // 0-1 score
  }>;
}
```

### 5. `sync_proposals`

Manually trigger sync of proposals from subgraph to local database.

**Parameters:**
```typescript
{
  full?: boolean;  // If true, re-sync all. Default: incremental sync
}
```

**Returns:**
```typescript
{
  synced: number;
  updated: number;
  errors: string[];
  lastSyncTime: string;
}
```

## MCP Resources

### 1. `proposal://{proposalNumber}`

Direct resource access to a proposal.

**URI Pattern:** `proposal://42` (for proposal #42)

**Returns:** Full proposal JSON matching `get_proposal` output.

## Project Structure

```
mcp-subgraph/
├── SPEC.md                    # This specification
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── index.ts               # MCP server entry point
│   ├── server.ts              # MCP server setup
│   ├── config.ts              # Configuration (env vars, constants)
│   ├── subgraph/
│   │   ├── client.ts          # Subgraph fetch client
│   │   ├── queries.ts         # GraphQL query strings
│   │   └── types.ts           # Subgraph response types
│   ├── db/
│   │   ├── connection.ts      # SQLite connection setup
│   │   ├── schema.ts          # Schema definitions
│   │   ├── migrations.ts      # Database migrations
│   │   └── repository.ts      # Data access layer
│   ├── embeddings/
│   │   ├── generator.ts       # Embedding generation with transformers.js
│   │   └── chunker.ts         # Text chunking logic
│   ├── tools/
│   │   ├── list-proposals.ts
│   │   ├── get-proposal.ts
│   │   ├── get-proposal-votes.ts
│   │   ├── search-proposals.ts
│   │   └── sync-proposals.ts
│   ├── resources/
│   │   └── proposal.ts        # Proposal resource handler
│   └── sync/
│       └── syncer.ts          # Background sync logic
├── tests/
│   ├── setup.ts               # Test setup (in-memory SQLite)
│   ├── subgraph/
│   │   └── client.test.ts     # Subgraph client tests
│   ├── db/
│   │   └── repository.test.ts # Repository tests
│   ├── tools/
│   │   ├── list-proposals.test.ts
│   │   ├── get-proposal.test.ts
│   │   └── search-proposals.test.ts
│   └── integration/
│       └── server.test.ts     # End-to-end MCP tests
└── data/
    └── .gitkeep               # SQLite database location
```

## Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "better-sqlite3": "^11.0.0",
    "sqlite-vss": "^0.1.0",
    "@xenova/transformers": "^2.17.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vitest": "^2.0.0",
    "@types/better-sqlite3": "^7.6.0",
    "tsx": "^4.0.0"
  }
}
```

## Configuration

**Environment Variables:**
```bash
# Optional: Override default Goldsky project ID
GOLDSKY_PROJECT_ID="project_cm33ek8kjx6pz010i2c3w8z25"

# Database path (default: ./data/gnars.db)
DATABASE_PATH="./data/gnars.db"

# Auto-sync interval in minutes (default: 5, 0 = disabled)
SYNC_INTERVAL_MINUTES="5"
```

## Test Strategy (TDD)

### Phase 1: Core Tests (Implement First)

1. **Subgraph Client Tests** (`subgraph/client.test.ts`)
   - Fetch proposals returns valid data structure
   - Handles network errors gracefully
   - Respects rate limits

2. **Repository Tests** (`db/repository.test.ts`)
   - Insert and retrieve proposal
   - Update proposal status
   - Query proposals by status
   - Insert and retrieve votes

3. **Tool Tests** (individual tool tests)
   - `list_proposals` returns paginated results
   - `get_proposal` finds by number and hex ID
   - `search_proposals` returns relevant results

### Phase 2: Enhanced Tests (On Demand)

- Edge cases (empty results, malformed data)
- Concurrent access handling
- Embedding quality tests
- Full integration tests with mock MCP client

### Test Fixtures

```typescript
// tests/fixtures/proposals.ts
export const mockProposal = {
  proposalId: "0x1234...",
  proposalNumber: 42,
  title: "Test Proposal",
  description: "This is a test proposal for unit testing",
  proposer: "0xabcd...",
  status: "ACTIVE",
  timeCreated: 1700000000,
  voteStart: "2024-01-01T00:00:00Z",
  voteEnd: "2024-01-08T00:00:00Z",
  forVotes: 10,
  againstVotes: 5,
  abstainVotes: 2,
  quorumVotes: 15,
};

export const mockVotes = [
  {
    voter: "0x1111...",
    support: 1,
    weight: "5",
    reason: "Great proposal!",
    timestamp: 1700000100,
  },
  // ...
];
```

## Implementation Order

1. **Day 1: Foundation**
   - [ ] Project setup (package.json, tsconfig, vitest)
   - [ ] Config module with environment handling
   - [ ] Subgraph client with tests
   - [ ] Basic GraphQL queries for proposals

2. **Day 2: Database Layer**
   - [ ] SQLite connection with better-sqlite3
   - [ ] Schema creation and migrations
   - [ ] Repository with CRUD operations and tests
   - [ ] Sync logic from subgraph to database

3. **Day 3: MCP Tools**
   - [ ] MCP server setup with SDK
   - [ ] `list_proposals` tool with tests
   - [ ] `get_proposal` tool with tests
   - [ ] `get_proposal_votes` tool with tests

4. **Day 4: Vector Search**
   - [ ] Embedding generator with transformers.js
   - [ ] Text chunking logic
   - [ ] sqlite-vss integration
   - [ ] `search_proposals` tool with tests

5. **Day 5: Polish**
   - [ ] MCP resources for proposal access
   - [ ] Background sync with configurable interval
   - [ ] Error handling and logging
   - [ ] Integration testing

## Usage Examples

### Agent Conversation Flow

```
User: "What proposals have been about sponsoring athletes?"

Agent uses: search_proposals(query: "sponsoring athletes")
→ Returns top matching proposals

Agent: "I found 3 proposals related to athlete sponsorships:
1. Proposal #42: Sponsor Skater X for Olympics - EXECUTED
2. Proposal #38: Gnars Team Jerseys - DEFEATED
3. Proposal #15: Athlete Support Fund - EXECUTED"

User: "Tell me more about proposal 42"

Agent uses: get_proposal(id: 42)
→ Returns full proposal details

Agent: "Proposal #42 'Sponsor Skater X for Olympics' was executed on Jan 15, 2024.
- Proposed by: 0xabc...
- Vote result: 85 FOR, 12 AGAINST, 3 ABSTAIN
- Quorum: 50 votes (passed with 170%)
- Description: This proposal requests 5 ETH to sponsor..."

User: "Who voted against it?"

Agent uses: get_proposal_votes(proposalId: 42, support: "AGAINST")
→ Returns voters who voted against

Agent: "12 members voted against:
- 0x111... (5 votes) - 'Budget concerns'
- 0x222... (3 votes) - No reason provided
- ..."
```

## MCP Server Registration

Add to `.mcp.json`:

```json
{
  "mcpServers": {
    "gnars-subgraph": {
      "type": "stdio",
      "command": "node",
      "args": ["./mcp-subgraph/dist/index.js"],
      "env": {
        "DATABASE_PATH": "./mcp-subgraph/data/gnars.db"
      }
    }
  }
}
```

## Future Enhancements (Not in MVP)

- Proposal comparison tool
- Voter history analysis
- Treasury impact tracking
- Real-time proposal notifications
- Multi-DAO support
