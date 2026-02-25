#!/usr/bin/env node
import { parseArgs } from "node:util";

import { listProposals } from "./tools/list-proposals.js";
import { getProposal } from "./tools/get-proposal.js";
import { getProposalVotes } from "./tools/get-proposal-votes.js";
import { syncProposals } from "./tools/sync-proposals.js";
import { searchProposals, indexProposalEmbeddings } from "./tools/search-proposals.js";
import { resolveEns, resolveEnsBatch } from "./tools/resolve-ens.js";
import { castVote } from "./tools/cast-vote.js";
import { getDatabase, closeDatabase } from "./db/connection.js";
import { ProposalRepository } from "./db/repository.js";
import { encodeResponse } from "./utils/encoder.js";

const pretty = process.argv.includes("--pretty");
const toon = process.argv.includes("--toon");

function print(data: unknown) {
  if (toon) {
    console.log(encodeResponse(data, "toon"));
  } else {
    console.log(pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data));
  }
}

function fail(msg: string): never {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

function usage(): never {
  console.error(`
gnars - Gnars DAO CLI

Commands:
  proposals [--status STATUS] [--limit N] [--offset N] [--order asc|desc]
  proposal <id>
  votes <id> [--support FOR|AGAINST|ABSTAIN] [--limit N] [--offset N]
  search <query> [--status STATUS] [--limit N] [--threshold N]
  vote <id> FOR|AGAINST|ABSTAIN [--reason "..."]
  sync [--full]
  index
  ens <address> [<address2> ...]

Flags:
  --pretty    Pretty-print JSON output
  --toon      Output in TOON format (~40% fewer tokens for LLMs)
  --help      Show this help

Examples:
  gnars proposals --status ACTIVE --pretty
  gnars proposal 42 --pretty
  gnars votes 42 --support FOR
  gnars search "skateboarding event" --limit 3
  gnars vote 42 FOR --reason "Great proposal"
  gnars ens 0x1234...
`);
  process.exit(0);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    usage();
  }

  const command = args[0];
  const rest = args.slice(1).filter((a) => a !== "--pretty" && a !== "--toon");

  try {
    switch (command) {
      case "proposals": {
        const { values } = parseArgs({
          args: rest,
          options: {
            status: { type: "string" },
            limit: { type: "string", default: "20" },
            offset: { type: "string", default: "0" },
            order: { type: "string", default: "desc" },
          },
        });
        const result = await listProposals({
          status: values.status as
            | "PENDING"
            | "ACTIVE"
            | "CANCELLED"
            | "DEFEATED"
            | "SUCCEEDED"
            | "QUEUED"
            | "EXPIRED"
            | "EXECUTED"
            | "VETOED"
            | undefined,
          limit: parseInt(values.limit!, 10),
          offset: parseInt(values.offset!, 10),
          order: (values.order as "asc" | "desc") || "desc",
          format: "json",
        });
        print(result);
        break;
      }

      case "proposal": {
        const { positionals } = parseArgs({ args: rest, allowPositionals: true, options: {} });
        const id = positionals[0];
        if (!id) fail("Usage: gnars proposal <id>");
        const parsed = Number(id);
        const result = await getProposal({ id: isNaN(parsed) ? id : parsed, hideDescription: false });
        if (!result) fail(`Proposal ${id} not found`);
        print(result);
        break;
      }

      case "votes": {
        const { values, positionals } = parseArgs({
          args: rest,
          allowPositionals: true,
          options: {
            support: { type: "string" },
            limit: { type: "string", default: "50" },
            offset: { type: "string", default: "0" },
          },
        });
        const id = positionals[0];
        if (!id) fail("Usage: gnars votes <id> [--support FOR|AGAINST|ABSTAIN]");
        const parsed = Number(id);
        const result = await getProposalVotes({
          proposalId: isNaN(parsed) ? id : parsed,
          support: values.support as "FOR" | "AGAINST" | "ABSTAIN" | undefined,
          limit: parseInt(values.limit!, 10),
          offset: parseInt(values.offset!, 10),
          format: "json",
        });
        if (!result) fail(`Proposal ${id} not found`);
        print(result);
        break;
      }

      case "search": {
        const { values, positionals } = parseArgs({
          args: rest,
          allowPositionals: true,
          options: {
            status: { type: "string" },
            limit: { type: "string", default: "5" },
            threshold: { type: "string", default: "0.3" },
          },
        });
        const query = positionals.join(" ");
        if (!query) fail("Usage: gnars search <query>");
        const db = getDatabase();
        const repo = new ProposalRepository(db);
        const result = await searchProposals(repo, {
          query,
          status: values.status as
            | "PENDING"
            | "ACTIVE"
            | "CANCELLED"
            | "DEFEATED"
            | "SUCCEEDED"
            | "QUEUED"
            | "EXPIRED"
            | "EXECUTED"
            | "VETOED"
            | undefined,
          limit: parseInt(values.limit!, 10),
          threshold: parseFloat(values.threshold!),
          format: "json",
        });
        print(result);
        closeDatabase();
        break;
      }

      case "vote": {
        const { values, positionals } = parseArgs({
          args: rest,
          allowPositionals: true,
          options: {
            reason: { type: "string" },
          },
        });
        const [id, support] = positionals;
        if (!id || !support) fail("Usage: gnars vote <id> FOR|AGAINST|ABSTAIN [--reason '...']");
        const parsed = Number(id);
        const result = await castVote({
          proposalId: isNaN(parsed) ? id : parsed,
          support: support as "FOR" | "AGAINST" | "ABSTAIN",
          reason: values.reason,
        });
        print(result);
        break;
      }

      case "sync": {
        const { values } = parseArgs({
          args: rest,
          options: {
            full: { type: "boolean", default: false },
          },
        });
        const db = getDatabase();
        const repo = new ProposalRepository(db);
        const result = await syncProposals(repo, { full: values.full ?? false });
        print(result);
        closeDatabase();
        break;
      }

      case "index": {
        const db = getDatabase();
        const repo = new ProposalRepository(db);
        const result = await indexProposalEmbeddings(repo);
        print(result);
        closeDatabase();
        break;
      }

      case "ens": {
        const addresses = rest.filter((a) => !a.startsWith("--"));
        if (addresses.length === 0) fail("Usage: gnars ens <address> [<address2> ...]");
        if (addresses.length === 1) {
          const result = await resolveEns({ address: addresses[0] });
          print(result);
        } else {
          const result = await resolveEnsBatch({ addresses, format: "json" });
          print(result);
        }
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        usage();
    }
  } catch (err: unknown) {
    fail(err instanceof Error ? err.message : String(err));
  }
}

main();
