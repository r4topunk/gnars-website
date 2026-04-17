---
name: gnars-cli
description: Use the builder-dao CLI (run locally from /Users/r4to/Script/builder-dao-tools) to interact with Gnars DAO proposals, votes, and governance data. Activate when the user asks to list proposals, get proposal details, check votes, search governance, resolve ENS names, or cast votes.
---

# Gnars CLI

The `builder-dao` binary lives at `/Users/r4to/Script/builder-dao-tools/packages/core/dist/cli.js`. It was extracted from this repo's `mcp-subgraph/` and generalized for any Nouns Builder DAO. While extended distribution (npm publish to `@builder-dao/*`) is pending coordination with the Builder DAO team, use it locally via `node`.

If the path does not exist or is stale, run: `cd /Users/r4to/Script/builder-dao-tools && pnpm -r build`.

## Invoking

Always prefix commands with the Gnars env vars:

```bash
DAO_ADDRESS=0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17 \
GOLDSKY_PROJECT_ID=project_cm33ek8kjx6pz010i2c3w8z25 \
node /Users/r4to/Script/builder-dao-tools/packages/core/dist/cli.js <command> [args] [flags]
```

Prefer the `--pretty` flag whenever showing output directly to the user.

## Read-path commands (all supported)

### List proposals

```bash
DAO_ADDRESS=0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17 \
GOLDSKY_PROJECT_ID=project_cm33ek8kjx6pz010i2c3w8z25 \
node /Users/r4to/Script/builder-dao-tools/packages/core/dist/cli.js \
  proposals [--status ACTIVE|PENDING|EXECUTED|...] [--limit N] [--offset N] [--order asc|desc] [--pretty]
```

### Get a single proposal

```bash
DAO_ADDRESS=0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17 \
GOLDSKY_PROJECT_ID=project_cm33ek8kjx6pz010i2c3w8z25 \
node /Users/r4to/Script/builder-dao-tools/packages/core/dist/cli.js \
  proposal <id|number> [--pretty]
```

`id` can be a hex proposal ID (`0x...`) or a proposal number (integer).

### Get votes for a proposal

```bash
DAO_ADDRESS=0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17 \
GOLDSKY_PROJECT_ID=project_cm33ek8kjx6pz010i2c3w8z25 \
node /Users/r4to/Script/builder-dao-tools/packages/core/dist/cli.js \
  votes <id|number> [--support FOR|AGAINST|ABSTAIN] [--limit N] [--offset N] [--pretty]
```

### Resolve ENS

```bash
DAO_ADDRESS=0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17 \
GOLDSKY_PROJECT_ID=project_cm33ek8kjx6pz010i2c3w8z25 \
node /Users/r4to/Script/builder-dao-tools/packages/core/dist/cli.js \
  ens <address> [<address2> ...] [--pretty]
```

### Cast a vote on-chain

```bash
PRIVATE_KEY=0x... \
DAO_ADDRESS=0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17 \
GOLDSKY_PROJECT_ID=project_cm33ek8kjx6pz010i2c3w8z25 \
node /Users/r4to/Script/builder-dao-tools/packages/core/dist/cli.js \
  vote <id|number> FOR|AGAINST|ABSTAIN [--reason "..."] [--pretty]
```

Requires `PRIVATE_KEY` env. The governor address is resolved from the DAO token via the subgraph — no hardcoded contract.

### Launch MCP server

```bash
# stdio (default)
DAO_ADDRESS=0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17 \
GOLDSKY_PROJECT_ID=project_cm33ek8kjx6pz010i2c3w8z25 \
node /Users/r4to/Script/builder-dao-tools/packages/core/dist/cli.js mcp

# HTTP/SSE on http://localhost:3100/mcp (override port with MCP_PORT)
DAO_ADDRESS=0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17 \
GOLDSKY_PROJECT_ID=project_cm33ek8kjx6pz010i2c3w8z25 \
node /Users/r4to/Script/builder-dao-tools/packages/core/dist/cli.js mcp --sse
```

## Deferred (addon) commands

`search`, `sync`, and `index` live in `@builder-dao/cli-search`. When invoked via `node packages/core/dist/cli.js` from the workspace, the addon does NOT load (peer-dep resolution requires both packages to share a `node_modules` tree — i.e., `pnpm add -g @builder-dao/cli @builder-dao/cli-search` after publication). For now, these commands emit:

> `Command 'search' requires @builder-dao/cli-search. Install: pnpm add -g @builder-dao/cli-search`

Do not use `search`/`sync`/`index` from this skill until publication lands.

## Output flags

| Flag | Description | Best for |
|------|-------------|----------|
| _(none)_ | Compact JSON (minified) | Programmatic use |
| `--pretty` | Pretty-printed JSON (2-space indent) | Human reading |
| `--toon` | TOON format (~40% fewer tokens) | LLM input / agent context |

TOON is a compact, lossless JSON-alternative encoding optimised for LLM consumption. When piping output to another agent call, prefer `--toon`. When showing to a human, use `--pretty`.

## Common workflows

**Find active proposals:**

```bash
DAO_ADDRESS=0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17 \
GOLDSKY_PROJECT_ID=project_cm33ek8kjx6pz010i2c3w8z25 \
node /Users/r4to/Script/builder-dao-tools/packages/core/dist/cli.js proposals --status ACTIVE --pretty
```

**Look up a proposal by number:**

```bash
DAO_ADDRESS=0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17 \
GOLDSKY_PROJECT_ID=project_cm33ek8kjx6pz010i2c3w8z25 \
node /Users/r4to/Script/builder-dao-tools/packages/core/dist/cli.js proposal 42 --pretty
```

**See who voted FOR on proposal 42:**

```bash
DAO_ADDRESS=0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17 \
GOLDSKY_PROJECT_ID=project_cm33ek8kjx6pz010i2c3w8z25 \
node /Users/r4to/Script/builder-dao-tools/packages/core/dist/cli.js votes 42 --support FOR --pretty
```

**Resolve an address:**

```bash
DAO_ADDRESS=0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17 \
GOLDSKY_PROJECT_ID=project_cm33ek8kjx6pz010i2c3w8z25 \
node /Users/r4to/Script/builder-dao-tools/packages/core/dist/cli.js ens 0x1234abcd... --pretty
```

**Get proposals in TOON format for LLM context:**

```bash
DAO_ADDRESS=0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17 \
GOLDSKY_PROJECT_ID=project_cm33ek8kjx6pz010i2c3w8z25 \
node /Users/r4to/Script/builder-dao-tools/packages/core/dist/cli.js proposals --status ACTIVE --toon
```

## Notes

- This skill targets the local dev checkout. If the dist path doesn't exist or is stale, run `cd /Users/r4to/Script/builder-dao-tools && pnpm -r build`.
- When `@builder-dao/cli` is published to npm, this skill will be updated to use the globally installed `builder-dao` binary directly (dropping the `node /Users/r4to/Script/...` prefix).
- All commands are DAO-agnostic — only the env vars determine which DAO is queried. With the above env, you're querying Gnars.
- Repository: https://github.com/r4topunk/builder-dao-tools (public; will transfer to the Builder DAO org).
