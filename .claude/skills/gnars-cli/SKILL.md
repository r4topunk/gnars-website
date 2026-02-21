---
name: gnars-cli
description: Use the gnars CLI to interact with Gnars DAO proposals, votes, and governance data. Activate when the user asks to list proposals, get proposal details, check votes, search governance, resolve ENS names, sync data, or cast votes. Use instead of the MCP gnars-subgraph tools when those are unavailable.
---

# Gnars CLI

The `gnars` binary is a CLI wrapper around the same tools that power the `gnars-subgraph` MCP server. Use it via `Bash` when the user needs to interact with Gnars DAO proposals and votes.

## When to Use

- User asks to list, find, or search DAO proposals
- User wants details on a specific proposal
- User wants to see votes on a proposal
- User asks to sync local proposal data
- User wants to resolve an Ethereum address to ENS
- User wants to vote on a proposal on-chain

## Commands Reference

### List proposals
```bash
gnars proposals [--status ACTIVE|PENDING|EXECUTED|...] [--limit N] [--offset N] [--order asc|desc] [--pretty]
```

### Get a single proposal
```bash
gnars proposal <id|number> [--pretty]
```
`id` can be a hex proposal ID (`0x...`) or a proposal number (integer).

### Get votes for a proposal
```bash
gnars votes <id|number> [--support FOR|AGAINST|ABSTAIN] [--limit N] [--offset N] [--pretty]
```

### Semantic search
```bash
gnars search "<query>" [--status STATUS] [--limit N] [--threshold 0.0-1.0] [--pretty]
```
Requires embeddings to be indexed first (`gnars index`).

### Cast a vote on-chain
```bash
gnars vote <id|number> FOR|AGAINST|ABSTAIN [--reason "..."] [--pretty]
```
Requires `PRIVATE_KEY` environment variable to be set.

### Sync proposals from subgraph
```bash
gnars sync [--full] [--pretty]
```
`--full` re-syncs all proposals. Default is incremental.

### Index embeddings for semantic search
```bash
gnars index [--pretty]
```

### Resolve ENS names
```bash
gnars ens <address> [<address2> ...] [--pretty]
```

## Output Format

All commands output JSON by default. Two flags control the format:

| Flag | Description | Best for |
|------|-------------|----------|
| _(none)_ | Compact JSON (minified) | Programmatic use |
| `--pretty` | Pretty-printed JSON (2-space indent) | Human reading |
| `--toon` | TOON format (~40% fewer tokens) | LLM input / agent context |

### TOON output (`--toon`)

TOON (Token-Oriented Object Notation) is a compact, lossless encoding of the JSON data model optimized for LLM consumption. It combines YAML-style indentation for nested objects with CSV-style tabular layout for uniform arrays.

The gnars CLI uses `@toon-format/toon` to encode responses. If TOON encoding fails for any reason, it falls back silently to pretty JSON.

**Example — proposals in TOON:**
```
proposals[3]{number,title,status,forVotes,againstVotes}:
  42,Fund skate event in LA,EXECUTED,15,2
  41,Treasury diversification,DEFEATED,3,12
  40,Add new multisig signer,SUCCEEDED,18,0
```

**When to use `--toon`:**
- Passing output to another LLM call (saves tokens)
- Storing results in agent context windows
- Piping to tools that feed Claude/GPT

**When NOT to use `--toon`:**
- Displaying output directly to users (use `--pretty` instead)
- Deeply nested or non-uniform data (JSON is more efficient)
- Programmatic parsing in code (use plain JSON)

## Common Workflows

**Find active proposals:**
```bash
gnars proposals --status ACTIVE --pretty
```

**Look up a proposal by number:**
```bash
gnars proposal 42 --pretty
```

**See who voted FOR on proposal 42:**
```bash
gnars votes 42 --support FOR --pretty
```

**Search for skateboarding proposals:**
```bash
gnars search "skateboarding event" --limit 5 --pretty
```

**Resolve an address:**
```bash
gnars ens 0x1234abcd... --pretty
```

**Get proposals in TOON format for LLM context:**
```bash
gnars proposals --status ACTIVE --toon
```

**Get votes in TOON for token-efficient agent use:**
```bash
gnars votes 42 --toon
```

## Notes

- The CLI reuses the same tool functions as the MCP server — results are identical
- `gnars search` requires `gnars index` to have been run first
- `gnars vote` is an on-chain transaction and requires a funded wallet via `PRIVATE_KEY`
- Proposal `id` accepts both hex strings (`0x...`) and integer proposal numbers
- Always use `--pretty` when showing output directly to the user
