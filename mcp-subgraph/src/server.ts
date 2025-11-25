import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { getDatabase, closeDatabase } from "./db/connection.js";
import { ProposalRepository } from "./db/repository.js";

import { listProposals, listProposalsSchema } from "./tools/list-proposals.js";
import { getProposal, getProposalSchema } from "./tools/get-proposal.js";
import { getProposalVotes, getProposalVotesSchema } from "./tools/get-proposal-votes.js";
import { syncProposals, syncProposalsSchema } from "./tools/sync-proposals.js";
import {
  searchProposals,
  searchProposalsSchema,
  indexProposalEmbeddings,
} from "./tools/search-proposals.js";

export function createServer() {
  const server = new McpServer({
    name: "gnars-subgraph",
    version: "0.1.0",
  });

  const db = getDatabase();
  const repo = new ProposalRepository(db);

  // Tool: list_proposals
  server.tool(
    "list_proposals",
    "List Gnars DAO proposals with optional filtering by status. Returns paginated results.",
    listProposalsSchema.shape,
    async (params) => {
      const input = listProposalsSchema.parse(params);
      const result = listProposals(repo, input);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Tool: get_proposal
  server.tool(
    "get_proposal",
    "Get detailed information about a specific Gnars DAO proposal by ID or number.",
    getProposalSchema.shape,
    async (params) => {
      const input = getProposalSchema.parse(params);
      const result = getProposal(repo, input);

      if (!result) {
        return {
          content: [{ type: "text", text: "Proposal not found" }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Tool: get_proposal_votes
  server.tool(
    "get_proposal_votes",
    "Get votes for a specific Gnars DAO proposal. Can filter by vote type (FOR, AGAINST, ABSTAIN).",
    getProposalVotesSchema.shape,
    async (params) => {
      const input = getProposalVotesSchema.parse(params);
      const result = getProposalVotes(repo, input);

      if (!result) {
        return {
          content: [{ type: "text", text: "Proposal not found" }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Tool: sync_proposals
  server.tool(
    "sync_proposals",
    "Sync proposals from the Gnars DAO subgraph to the local database. Use full=true for complete re-sync.",
    syncProposalsSchema.shape,
    async (params) => {
      const input = syncProposalsSchema.parse(params);
      const result = await syncProposals(repo, input);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Tool: search_proposals
  server.tool(
    "search_proposals",
    "Semantic search over Gnars DAO proposals. Use natural language queries to find relevant proposals. Requires index_embeddings to be run first.",
    searchProposalsSchema.shape,
    async (params) => {
      const input = searchProposalsSchema.parse(params);
      const result = await searchProposals(repo, input);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Tool: index_embeddings
  server.tool(
    "index_embeddings",
    "Generate embeddings for proposals to enable semantic search. Run after sync_proposals. Only indexes proposals that haven't been indexed yet.",
    {},
    async () => {
      const stats = repo.getEmbeddingStats();
      const result = await indexProposalEmbeddings(repo);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                ...result,
                stats: {
                  ...repo.getEmbeddingStats(),
                  previouslyIndexed: stats.embeddedProposals,
                },
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // Resource: proposal://{proposalNumber}
  server.resource(
    "proposal",
    "proposal://{proposalNumber}",
    async (uri) => {
      const match = uri.href.match(/^proposal:\/\/(\d+)$/);
      if (!match) {
        throw new Error("Invalid proposal URI format. Expected: proposal://{number}");
      }

      const proposalNumber = parseInt(match[1], 10);
      const result = getProposal(repo, { id: proposalNumber });

      if (!result) {
        throw new Error(`Proposal ${proposalNumber} not found`);
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  return { server, cleanup: () => closeDatabase() };
}

export async function runServer() {
  const { server, cleanup } = createServer();

  const transport = new StdioServerTransport();

  // Handle cleanup on exit
  process.on("SIGINT", () => {
    cleanup();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    cleanup();
    process.exit(0);
  });

  await server.connect(transport);
}
