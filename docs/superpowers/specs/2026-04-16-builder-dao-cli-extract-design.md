# Builder DAO CLI / MCP Extraction — Design Spec

**Date:** 2026-04-16
**Status:** Approved (design phase)
**Owner:** r4to
**Target outcome:** Extract `gnars-website/mcp-subgraph/` into a standalone, publishable, DAO-agnostic monorepo under the `@builder-dao` namespace. Publish to npm. Offer upstream to the Builder DAO team.

---

## 1. Context

The Gnars website repo contains a subdirectory `mcp-subgraph/` that implements:

- A CLI (`gnars`) for querying Gnars DAO proposals, votes, and governance data.
- An MCP (Model Context Protocol) server exposing the same operations as tools for AI agents.

Both entry points share a single set of tool modules (`src/tools/*.ts`) and a subgraph client targeting the Nouns Builder subgraph on Base. The code is Gnars-specific in naming and defaults only — the underlying logic works for any Nouns Builder DAO on Base. The website itself does not depend on this package at runtime; it is excluded from `tsconfig.json`.

This extraction aims to:
- Decouple the tool from the Gnars website repo.
- Generalize it for any Nouns Builder DAO.
- Package it for npm distribution.
- Prepare it for potential upstream transfer to the Builder DAO GitHub org.

## 2. Scope

**In scope**
- Move the entire `mcp-subgraph/` directory into a new standalone git repository as a pnpm workspace monorepo.
- Split the codebase into two published packages:
  - `@builder-dao/cli` — core (stateless: list/get/votes/vote/ens); exposes CLI binary and MCP server.
  - `@builder-dao/cli-search` — optional addon bringing SQLite cache + HuggingFace embeddings for `sync` / `index` / `search`.
- Introduce a hybrid DAO configuration model (env default + `--dao` CLI flag override).
- Introduce a plugin registry API so the addon registers its commands/tools into the core binary without the core importing heavy deps.
- Write publishable documentation (READMEs, architecture, plugin API, migration guide, examples).
- Remove `mcp-subgraph/` from `gnars-website` and update the `gnars-cli` Claude skill to consume the published npm package.

**Out of scope (YAGNI)**
- Multi-chain support (Base-only; the Nouns Builder subgraph on Base is the sole data source for v0.1).
- Built-in DAO preset/alias registry.
- Web UI.
- Automatic migration tool for existing Gnars users (manual env flip is enough).
- Upstreaming to the Builder DAO org (tracked as a separate, later step; not blocked by this spec).

## 3. Requirements

### Functional
- CLI and MCP server must function for any Builder DAO token contract on Base given `DAO_ADDRESS` + `GOLDSKY_PROJECT_ID`.
- Users can run the core without installing the search addon; core commands have no SQLite / HuggingFace dependency footprint.
- When the search addon is installed alongside the core, its commands appear on the same `builder-dao` binary automatically.
- DAO config is resolvable via: (1) CLI flag `--dao`, (2) env var, (3) optional config file, in that precedence.
- Search addon's SQLite database is isolated per DAO address (auto-keyed path) so switching `--dao` switches DB transparently.
- Existing functional behavior of all commands/tools is preserved (same tool signatures, same outputs).

### Non-functional
- No Gnars-specific defaults in any source file. All Gnars references permitted only in `examples/` and migration docs.
- TypeScript strict mode, no `any`.
- Vitest suite must pass on every PR.
- MIT license.
- Publishable under npm scoped package `@builder-dao/*` (fallback alternatives listed below if scope unavailable).

## 4. Architecture

### 4.1 Repo layout

```
builder-dao-tools/
├── packages/
│   ├── core/                      # @builder-dao/cli
│   │   ├── src/
│   │   │   ├── cli.ts             # CLI entry; binary: "builder-dao"
│   │   │   ├── server.ts          # MCP server entry
│   │   │   ├── registry.ts        # plugin registry API
│   │   │   ├── config.ts          # DAO config resolver
│   │   │   ├── subgraph/          # Goldsky client, queries, types
│   │   │   ├── tools/             # list/get/votes/vote/ens (stateless)
│   │   │   └── utils/             # JSON / pretty / toon encoder
│   │   ├── tests/
│   │   ├── package.json
│   │   └── README.md
│   └── search/                    # @builder-dao/cli-search
│       ├── src/
│       │   ├── index.ts           # side-effect: registers commands/tools
│       │   ├── db/                # sqlite connection, repository, schema
│       │   ├── embeddings/        # chunker, generator
│       │   └── tools/             # sync, index, search
│       ├── tests/
│       ├── package.json
│       └── README.md
├── examples/
│   ├── gnars.env
│   ├── claude-desktop-config.json
│   └── cursor-mcp.json
├── docs/
│   ├── architecture.md
│   ├── plugin-api.md
│   └── migrating-from-gnars-mcp.md
├── .github/workflows/             # CI: lint, typecheck, test, release
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── package.json                   # workspace root
├── README.md
├── CONTRIBUTING.md
├── LICENSE                        # MIT
└── CHANGELOG.md                   # @changesets managed
```

### 4.2 Package split rationale

- The core package must be installable as a lean tool for users who only need read-path governance data. SQLite and HuggingFace Transformers are heavy deps and irrelevant for `list`, `get`, `votes`, `vote`, `ens`.
- The search addon exists because embedding generation + similarity caching is opt-in. Users who never run semantic search never pay the install weight.
- Splitting into two packages (vs. optional dependencies inside one package) gives cleaner install ergonomics, cleaner test boundaries, and independent versioning.

### 4.3 Config model

```ts
// packages/core/src/config.ts
export interface DaoConfig {
  daoAddress: `0x${string}`;
  goldskyProjectId: string;
  chainId: number;               // default 8453 (Base)
  rpcUrl: string;                // default https://mainnet.base.org
  privateKey?: `0x${string}`;    // only consumed by `vote`
}

export function resolveConfig(argv: string[], env: NodeJS.ProcessEnv): DaoConfig;
```

Resolution order (highest wins):
1. CLI flag: `--dao 0x...`, `--subgraph-project <id>`, `--rpc-url <url>`.
2. Env: `DAO_ADDRESS`, `GOLDSKY_PROJECT_ID`, `BASE_RPC_URL`, `PRIVATE_KEY`.
3. Optional config file: `$XDG_CONFIG_HOME/builder-dao/config.json` (simple JSON object matching `DaoConfig`).
4. Error if `daoAddress` or `goldskyProjectId` is missing.

No Gnars defaults in config. Example Gnars values live in `examples/gnars.env`.

### 4.4 Plugin registry API

```ts
// packages/core/src/registry.ts
export interface RunContext {
  config: DaoConfig;
  subgraph: SubgraphClient;
  print(data: unknown): void;     // honors --pretty / --toon
}

export interface CliCommand {
  name: string;
  description: string;
  usage: string;
  run(args: string[], ctx: RunContext): Promise<void>;
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: z.ZodSchema;
  handler(input: unknown, ctx: RunContext): Promise<unknown>;
}

export function registerCommand(cmd: CliCommand): void;
export function registerTool(tool: McpTool): void;
export function getCommands(): CliCommand[];
export function getTools(): McpTool[];
```

**Core behavior at startup:**

```ts
// cli.ts and server.ts both do:
try {
  await import("@builder-dao/cli-search");  // triggers registration side-effects
} catch {
  // addon not installed — continue with core commands only
}
```

**Search addon `index.ts`** imports `registerCommand` / `registerTool` from the core and registers `sync`, `index`, `search` on load.

**Unknown command UX:** if a user runs `builder-dao search` without the addon installed, the CLI prints:

```
Command 'search' requires @builder-dao/cli-search.
Install: pnpm add -g @builder-dao/cli-search
```

### 4.5 Database isolation

The search addon persists per-DAO state in:

```
$XDG_DATA_HOME/builder-dao/{daoAddressShort}.db
```

Where `daoAddressShort` is the first 10 chars of the address (e.g., `0x880fb3cf.db`). Override via `--db-path` CLI flag or `DB_PATH` env var.

### 4.6 CLI surface (final)

Core (always available):
```
builder-dao proposals [--status] [--limit] [--offset] [--order]
builder-dao proposal <id>
builder-dao votes <id> [--support FOR|AGAINST|ABSTAIN] [--limit] [--offset]
builder-dao vote <id> FOR|AGAINST|ABSTAIN [--reason]
builder-dao ens <addr> [<addr2> ...]
builder-dao mcp [--sse]                 # launches MCP server
```

Addon (requires `@builder-dao/cli-search`):
```
builder-dao sync [--full]
builder-dao index
builder-dao search "<query>" [--status] [--limit] [--threshold]
```

Global flags: `--dao`, `--subgraph-project`, `--rpc-url`, `--pretty`, `--toon`, `--help`, `--version`.

### 4.7 MCP server

Same tools as CLI commands, same names (snake_case for MCP, kebab/hyphen-free). Core exposes 5 tools on startup; addon registers 3 more if installed. Launch via `builder-dao mcp` (stdio) or `builder-dao mcp --sse` (HTTP/SSE). All tool descriptions must be DAO-agnostic ("List proposals for the configured Builder DAO", not "Gnars DAO").

## 5. Naming decisions

- **Repo:** `builder-dao-tools`.
- **Primary packages:** `@builder-dao/cli` and `@builder-dao/cli-search`.
- **Binary:** `builder-dao`.
- **Fallback namespaces** (if `@builder-dao` is unavailable on npm):
  - `@buildersdk/cli` + `@buildersdk/cli-search`
  - Unscoped: `builder-dao-cli` + `builder-dao-cli-search`

Naming is finalized at the start of implementation by checking npm availability; fallback does not block the design.

## 6. Testing

- Retain Vitest. Existing tests migrate as-is into the respective package.
- Test fixtures that hit Gnars data are parameterized: fixture exports a `TEST_DAO_ADDRESS` constant (Gnars) and tests use it via the config resolver, not hardcoded strings.
- CI (GitHub Actions) runs on every PR: lint, typecheck, unit tests. Release workflow runs on tagged commits.

## 7. Documentation

Root-level:
- `README.md` — 30-second pitch, install, 3 canonical examples, links to per-package docs.
- `CONTRIBUTING.md` — pnpm setup, running tests, release flow via `@changesets`.
- `LICENSE` — MIT.
- `CHANGELOG.md` — managed by `@changesets`.

Per-package:
- `packages/core/README.md` — full CLI reference, every env var documented, MCP client setup snippets (Claude Desktop, Cursor), `vote` safety notes.
- `packages/search/README.md` — install, DB path behavior, embeddings model, first-run performance note.

`docs/`:
- `architecture.md` — component diagram, data flow, subgraph endpoint shape.
- `plugin-api.md` — how to write a DAO-specific or feature-specific addon.
- `migrating-from-gnars-mcp.md` — step-by-step for existing Gnars users (env mapping, binary rename).

## 8. Release plan

**Phase 1 — Extract & clean** (single initial commit set in new repo)
- Copy `mcp-subgraph/` → new repo `packages/core/`.
- Split DB + embeddings + `sync` / `search` / `index` tools into `packages/search/`.
- Remove all Gnars hardcoded strings and defaults.
- Implement `resolveConfig` and `registry`.
- Wire core dynamic import of the search addon.
- All existing tests pass.

**Phase 2 — Polish** (in the new repo)
- Write READMEs, LICENSE, CONTRIBUTING, examples.
- Add GitHub Actions CI (lint, typecheck, test).
- Configure `@changesets`.

**Phase 3 — Publish**
- `pnpm -r publish` to npm.
- Cut GitHub release `v0.1.0`.

**Phase 4 — Gnars website cleanup**
- Remove `mcp-subgraph/` from `gnars-website`.
- Update `tsconfig.json` to drop the `mcp-subgraph/**/*` exclude line.
- Update `.claude/skills/gnars-cli/SKILL.md` to reference `builder-dao` binary installed from npm and document the required `DAO_ADDRESS` / `GOLDSKY_PROJECT_ID` env vars for Gnars.

**Phase 5 — Upstream (optional, tracked separately)**
- Open discussion/PR at the Builder DAO GitHub org offering package transfer.

Each phase is implemented as its own PR or commit series and validated before the next begins.

## 9. Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| `@builder-dao` npm namespace unavailable | Fall back to documented alternatives; decide at start of Phase 1. |
| Dynamic import of addon fails silently | Log at debug level on failure; make resolution observable via `--version` which prints loaded plugins. |
| Heavy deps leak into core via shared imports | Enforce via package boundaries + CI check that `@builder-dao/cli` has no `better-sqlite3` / `@huggingface/transformers` in its `dependencies`. |
| Gnars-specific test fixtures break when DAO default changes | Parameterize via `TEST_DAO_ADDRESS`; no test relies on process-wide defaults. |
| Users of current `gnars` binary broken after cleanup | Ship migration doc + leave a stub shim in the `gnars-cli` skill that wraps `builder-dao` with Gnars env pre-set. |

## 10. Open questions

None at design time. Naming fallback is deterministic; remaining choices (CI provider details, release automation thresholds) belong in the implementation plan.
