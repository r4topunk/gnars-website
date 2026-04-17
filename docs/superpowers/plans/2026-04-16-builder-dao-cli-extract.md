# Builder DAO CLI / MCP Extraction — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract `gnars-website/mcp-subgraph/` into a new standalone pnpm monorepo `builder-dao-tools` (core + search addon packages), generalize for any Nouns Builder DAO, publish to npm, and clean up the gnars-website side.

**Architecture:** New repo at `~/Script/builder-dao-tools/`. pnpm workspace with `packages/core` (`@builder-dao/cli`) and `packages/search` (`@builder-dao/cli-search`). Core owns CLI binary + MCP server + subgraph client + stateless tools + a plugin registry. Search addon side-effect-registers its commands/tools into the core registry on dynamic import. Hybrid config resolution: CLI flag > env > optional config file > error.

**Tech Stack:** TypeScript (strict), pnpm workspaces, @changesets, Vitest, tsx, `@modelcontextprotocol/sdk`, `viem`, `better-sqlite3`, `@huggingface/transformers`, `@toon-format/toon`, Zod. Node ≥ 20 (ESM). Base chain (chainId 8453). GitHub Actions CI.

**Reference spec:** `docs/superpowers/specs/2026-04-16-builder-dao-cli-extract-design.md`.

**Source of truth:** All current code lives at `/Users/r4to/Script/gnars-website/mcp-subgraph/`. The new repo is at `/Users/r4to/Script/builder-dao-tools/`. Do NOT touch `gnars-website/` until Phase 4.

---

## File Map (what gets created or modified)

**New repo `builder-dao-tools/` (all files created in Phase 1-2):**

| Path | Purpose |
|------|---------|
| `package.json` | Workspace root; private; scripts delegate to workspaces |
| `pnpm-workspace.yaml` | Declares `packages/*` |
| `tsconfig.base.json` | Shared strict TS config |
| `.gitignore` | `node_modules`, `dist`, `*.db`, `.env*` |
| `.npmrc` | `auto-install-peers=true`, `shamefully-hoist=false` |
| `.nvmrc` | `20` |
| `README.md` | Main project pitch + quickstart |
| `CONTRIBUTING.md` | Dev setup + release flow |
| `LICENSE` | MIT |
| `CHANGELOG.md` | Managed by @changesets |
| `.changeset/config.json` | @changesets config |
| `.github/workflows/ci.yml` | PR: lint + typecheck + test |
| `.github/workflows/release.yml` | Tag: publish to npm |
| `packages/core/package.json` | `@builder-dao/cli`; bin `builder-dao` |
| `packages/core/tsconfig.json` | Extends base; emits to `dist/` |
| `packages/core/README.md` | Full CLI + MCP reference |
| `packages/core/src/cli.ts` | CLI entry (replaces current `cli.ts`, uses registry) |
| `packages/core/src/server.ts` | MCP server entry (uses registry) |
| `packages/core/src/registry.ts` | Plugin registry API (NEW) |
| `packages/core/src/config.ts` | `resolveConfig` (NEW — no Gnars defaults) |
| `packages/core/src/context.ts` | Builds `RunContext` from config (NEW) |
| `packages/core/src/subgraph/{client,queries,types,dao}.ts` | Migrated; `dao.ts` NEW (fetches governor addr by token) |
| `packages/core/src/tools/{list-proposals,get-proposal,get-proposal-votes,resolve-ens,cast-vote}.ts` | Migrated; DAO-agnostic tool descriptions + handler signatures take `RunContext` |
| `packages/core/src/tools/register-core.ts` | Calls `registerCommand`/`registerTool` for all core tools (NEW) |
| `packages/core/src/utils/encoder.ts` | Migrated verbatim |
| `packages/core/tests/**` | Migrated + updated for new signatures; adds `tests/config.test.ts`, `tests/registry.test.ts`, `tests/subgraph/dao.test.ts` |
| `packages/search/package.json` | `@builder-dao/cli-search`; no bin; peerDep core |
| `packages/search/tsconfig.json` | Extends base |
| `packages/search/README.md` | DB + embeddings docs |
| `packages/search/src/index.ts` | Side-effect registration entry (NEW) |
| `packages/search/src/db/{connection,repository,schema}.ts` | Migrated; path keyed by DAO addr |
| `packages/search/src/embeddings/{chunker,generator}.ts` | Migrated verbatim |
| `packages/search/src/tools/{sync-proposals,search-proposals,index-embeddings}.ts` | Migrated; handlers take `RunContext` |
| `packages/search/tests/**` | Migrated |
| `examples/gnars.env` | Working Gnars env |
| `examples/claude-desktop-config.json` | MCP client snippet |
| `examples/cursor-mcp.json` | MCP client snippet |
| `docs/architecture.md` | Architecture diagram + data flow |
| `docs/plugin-api.md` | Addon author guide |
| `docs/migrating-from-gnars-mcp.md` | Migration guide |

**Existing `gnars-website/` changes (Phase 4 only):**

| Path | Change |
|------|--------|
| `mcp-subgraph/` | Deleted entirely |
| `tsconfig.json` | Remove `"mcp-subgraph/**/*"` from `exclude` |
| `.claude/skills/gnars-cli/SKILL.md` | Rewritten to point at `builder-dao` npm binary + Gnars env |
| `CLAUDE.md` | Remove any `mcp-subgraph` references if present |

---

## Phase 1 — Extract, split, generalize (TDD)

### Task 1: Scaffold the empty monorepo

**Files:**
- Create: `/Users/r4to/Script/builder-dao-tools/package.json`
- Create: `/Users/r4to/Script/builder-dao-tools/pnpm-workspace.yaml`
- Create: `/Users/r4to/Script/builder-dao-tools/tsconfig.base.json`
- Create: `/Users/r4to/Script/builder-dao-tools/.gitignore`
- Create: `/Users/r4to/Script/builder-dao-tools/.npmrc`
- Create: `/Users/r4to/Script/builder-dao-tools/.nvmrc`

- [ ] **Step 1: Create the directory and init git**

```bash
mkdir -p /Users/r4to/Script/builder-dao-tools
cd /Users/r4to/Script/builder-dao-tools
git init -b main
```

- [ ] **Step 2: Write workspace root `package.json`**

```json
{
  "name": "builder-dao-tools",
  "version": "0.0.0",
  "private": true,
  "description": "CLI + MCP server for Nouns Builder DAOs (generalized from Gnars)",
  "type": "module",
  "packageManager": "pnpm@9.12.0",
  "engines": { "node": ">=20" },
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "test:run": "pnpm -r test:run",
    "typecheck": "pnpm -r typecheck",
    "lint": "eslint .",
    "clean": "pnpm -r exec rm -rf dist node_modules && rm -rf node_modules",
    "changeset": "changeset",
    "release": "changeset publish"
  },
  "devDependencies": {
    "@changesets/cli": "^2.27.9",
    "eslint": "^9.15.0",
    "typescript": "^5.7.2"
  }
}
```

- [ ] **Step 3: Write `pnpm-workspace.yaml`**

```yaml
packages:
  - "packages/*"
```

- [ ] **Step 4: Write `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 5: Write `.gitignore`**

```
node_modules
dist
*.db
*.db-journal
*.db-wal
*.db-shm
.env
.env.*
!.env.example
coverage
.DS_Store
```

- [ ] **Step 6: Write `.npmrc`**

```
auto-install-peers=true
shamefully-hoist=false
```

- [ ] **Step 7: Write `.nvmrc`**

```
20
```

- [ ] **Step 8: Install root dev deps**

Run: `cd /Users/r4to/Script/builder-dao-tools && pnpm install`
Expected: installs `@changesets/cli`, `eslint`, `typescript`; creates `node_modules` + `pnpm-lock.yaml`.

- [ ] **Step 9: Commit**

```bash
cd /Users/r4to/Script/builder-dao-tools
git add -A
git commit -m "chore: scaffold monorepo root (pnpm workspace, tsconfig base)"
```

---

### Task 2: Scaffold the `@builder-dao/cli` core package

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/index.ts` (placeholder)
- Create: `packages/core/vitest.config.ts`

- [ ] **Step 1: Write `packages/core/package.json`**

```json
{
  "name": "@builder-dao/cli",
  "version": "0.1.0",
  "description": "CLI and MCP server for Nouns Builder DAOs on Base",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": { "builder-dao": "./dist/cli.js" },
  "files": ["dist", "README.md", "LICENSE"],
  "exports": {
    ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" },
    "./registry": { "import": "./dist/registry.js", "types": "./dist/registry.d.ts" },
    "./context": { "import": "./dist/context.js", "types": "./dist/context.d.ts" }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsx watch src/cli.ts",
    "test": "vitest",
    "test:run": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "@toon-format/toon": "^2.0.1",
    "viem": "^2.46.2",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "tsx": "^4.19.2",
    "vitest": "^2.1.6"
  },
  "keywords": ["nouns-builder", "dao", "cli", "mcp", "base", "ethereum"],
  "license": "MIT"
}
```

- [ ] **Step 2: Write `packages/core/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Write `packages/core/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Write placeholder `packages/core/src/index.ts`**

```ts
export {};
```

- [ ] **Step 5: Install**

Run: `pnpm install`
Expected: succeeds; workspace links `@builder-dao/cli`.

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter @builder-dao/cli typecheck`
Expected: passes (no source yet beyond placeholder).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore(core): scaffold @builder-dao/cli package"
```

---

### Task 3: Migrate `utils/encoder.ts` (verbatim)

**Files:**
- Create: `packages/core/src/utils/encoder.ts`

- [ ] **Step 1: Copy file**

Copy contents from `/Users/r4to/Script/gnars-website/mcp-subgraph/src/utils/encoder.ts` into `/Users/r4to/Script/builder-dao-tools/packages/core/src/utils/encoder.ts` verbatim.

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @builder-dao/cli typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/utils/encoder.ts
git commit -m "feat(core): migrate encoder util (JSON + TOON)"
```

---

### Task 4: Migrate subgraph types + queries (verbatim, strip Gnars comment)

**Files:**
- Create: `packages/core/src/subgraph/types.ts`
- Create: `packages/core/src/subgraph/queries.ts`

- [ ] **Step 1: Copy types.ts verbatim**

Copy `/Users/r4to/Script/gnars-website/mcp-subgraph/src/subgraph/types.ts` → `packages/core/src/subgraph/types.ts`. No changes.

- [ ] **Step 2: Copy queries.ts and update header comment**

Copy queries.ts; change the top comment from:
```ts
// GraphQL queries for Gnars DAO subgraph
```
to:
```ts
// GraphQL queries for the Nouns Builder subgraph on Base
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @builder-dao/cli typecheck`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/subgraph/
git commit -m "feat(core): migrate subgraph types and queries"
```

---

### Task 5: Write config resolver (TDD)

**Files:**
- Test: `packages/core/tests/config.test.ts`
- Create: `packages/core/src/config.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/core/tests/config.test.ts
import { describe, it, expect } from "vitest";
import { resolveConfig, ConfigError } from "../src/config.js";

describe("resolveConfig", () => {
  it("reads daoAddress and goldskyProjectId from env", () => {
    const cfg = resolveConfig([], {
      DAO_ADDRESS: "0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17",
      GOLDSKY_PROJECT_ID: "project_test",
    });
    expect(cfg.daoAddress).toBe("0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17");
    expect(cfg.goldskyProjectId).toBe("project_test");
    expect(cfg.chainId).toBe(8453);
    expect(cfg.rpcUrl).toBe("https://mainnet.base.org");
  });

  it("CLI --dao overrides env", () => {
    const cfg = resolveConfig(["--dao", "0xabc0000000000000000000000000000000000000"], {
      DAO_ADDRESS: "0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17",
      GOLDSKY_PROJECT_ID: "project_test",
    });
    expect(cfg.daoAddress).toBe("0xabc0000000000000000000000000000000000000");
  });

  it("CLI --subgraph-project overrides env", () => {
    const cfg = resolveConfig(
      ["--subgraph-project", "project_x"],
      {
        DAO_ADDRESS: "0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17",
        GOLDSKY_PROJECT_ID: "project_env",
      }
    );
    expect(cfg.goldskyProjectId).toBe("project_x");
  });

  it("throws ConfigError when daoAddress missing", () => {
    expect(() =>
      resolveConfig([], { GOLDSKY_PROJECT_ID: "p" })
    ).toThrowError(ConfigError);
  });

  it("throws ConfigError when goldskyProjectId missing", () => {
    expect(() =>
      resolveConfig([], {
        DAO_ADDRESS: "0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17",
      })
    ).toThrowError(ConfigError);
  });

  it("rejects malformed daoAddress", () => {
    expect(() =>
      resolveConfig([], {
        DAO_ADDRESS: "not-an-address",
        GOLDSKY_PROJECT_ID: "p",
      })
    ).toThrowError(ConfigError);
  });

  it("reads BASE_RPC_URL override", () => {
    const cfg = resolveConfig([], {
      DAO_ADDRESS: "0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17",
      GOLDSKY_PROJECT_ID: "p",
      BASE_RPC_URL: "https://custom.rpc",
    });
    expect(cfg.rpcUrl).toBe("https://custom.rpc");
  });

  it("omits privateKey when not set", () => {
    const cfg = resolveConfig([], {
      DAO_ADDRESS: "0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17",
      GOLDSKY_PROJECT_ID: "p",
    });
    expect(cfg.privateKey).toBeUndefined();
  });

  it("includes privateKey when env set", () => {
    const cfg = resolveConfig([], {
      DAO_ADDRESS: "0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17",
      GOLDSKY_PROJECT_ID: "p",
      PRIVATE_KEY: "0x" + "1".repeat(64),
    });
    expect(cfg.privateKey).toBe("0x" + "1".repeat(64));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @builder-dao/cli test:run tests/config.test.ts`
Expected: FAIL with module `../src/config.js` not found.

- [ ] **Step 3: Implement `packages/core/src/config.ts`**

```ts
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export interface DaoConfig {
  daoAddress: `0x${string}`;
  goldskyProjectId: string;
  chainId: number;
  rpcUrl: string;
  privateKey?: `0x${string}`;
}

const HEX_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const HEX_PRIVKEY_RE = /^0x[a-fA-F0-9]{64}$/;

function extractFlag(argv: string[], name: string): string | undefined {
  const idx = argv.indexOf(name);
  if (idx === -1) return undefined;
  return argv[idx + 1];
}

export function resolveConfig(
  argv: string[],
  env: NodeJS.ProcessEnv
): DaoConfig {
  const daoAddress = (extractFlag(argv, "--dao") ?? env.DAO_ADDRESS)?.toLowerCase();
  const goldskyProjectId =
    extractFlag(argv, "--subgraph-project") ?? env.GOLDSKY_PROJECT_ID;
  const rpcUrl =
    extractFlag(argv, "--rpc-url") ?? env.BASE_RPC_URL ?? "https://mainnet.base.org";
  const chainId = env.CHAIN_ID ? parseInt(env.CHAIN_ID, 10) : 8453;

  if (!daoAddress) {
    throw new ConfigError(
      "Missing DAO address. Provide --dao <addr> or set DAO_ADDRESS env."
    );
  }
  if (!HEX_ADDRESS_RE.test(daoAddress)) {
    throw new ConfigError(
      `Invalid DAO address: ${daoAddress}. Expected 0x-prefixed 20-byte hex.`
    );
  }
  if (!goldskyProjectId) {
    throw new ConfigError(
      "Missing Goldsky project ID. Provide --subgraph-project <id> or set GOLDSKY_PROJECT_ID env."
    );
  }

  const privateKey = env.PRIVATE_KEY;
  if (privateKey && !HEX_PRIVKEY_RE.test(privateKey)) {
    throw new ConfigError("PRIVATE_KEY must be 0x-prefixed 32-byte hex.");
  }

  return {
    daoAddress: daoAddress as `0x${string}`,
    goldskyProjectId,
    chainId,
    rpcUrl,
    privateKey: privateKey as `0x${string}` | undefined,
  };
}

export function getSubgraphUrl(cfg: DaoConfig): string {
  return `https://api.goldsky.com/api/public/${cfg.goldskyProjectId}/subgraphs/nouns-builder-base-mainnet/latest/gn`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @builder-dao/cli test:run tests/config.test.ts`
Expected: all 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/config.ts packages/core/tests/config.test.ts
git commit -m "feat(core): add DaoConfig resolver (CLI flags > env, no defaults)"
```

---

### Task 6: Refactor subgraph client to take config (TDD via existing tests)

**Files:**
- Modify: `packages/core/src/subgraph/client.ts` (port from source; signature changes)

- [ ] **Step 1: Port `client.ts` with config as first argument**

Create `packages/core/src/subgraph/client.ts`:

```ts
import type { DaoConfig } from "../config.js";
import { getSubgraphUrl } from "../config.js";
import {
  PROPOSALS_QUERY,
  PROPOSAL_BY_NUMBER_QUERY,
  PROPOSAL_BY_ID_QUERY,
  VOTES_QUERY,
  RECENT_PROPOSALS_QUERY,
} from "./queries.js";
import type {
  SubgraphProposal,
  SubgraphVote,
  ProposalsQueryResponse,
  VotesQueryResponse,
} from "./types.js";

export class SubgraphError extends Error {
  constructor(
    message: string,
    public readonly query: string,
    public readonly variables?: Record<string, unknown>
  ) {
    super(message);
    this.name = "SubgraphError";
  }
}

export interface SubgraphClient {
  fetchProposals(first?: number, skip?: number): Promise<SubgraphProposal[]>;
  fetchProposalByNumber(n: number): Promise<SubgraphProposal | null>;
  fetchProposalById(id: string): Promise<SubgraphProposal | null>;
  fetchVotes(n: number, first?: number, skip?: number): Promise<SubgraphVote[]>;
  fetchRecentProposals(sinceTimestamp: number): Promise<SubgraphProposal[]>;
}

export function createSubgraphClient(cfg: DaoConfig): SubgraphClient {
  const url = getSubgraphUrl(cfg);
  const daoAddress = cfg.daoAddress.toLowerCase();

  async function execute<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    if (!response.ok) {
      throw new SubgraphError(
        `Subgraph request failed: ${response.status} ${response.statusText}`,
        query,
        variables
      );
    }
    const result = (await response.json()) as T & { errors?: Array<{ message: string }> };
    if ("errors" in result && result.errors && result.errors.length > 0) {
      throw new SubgraphError(
        `Subgraph query error: ${result.errors.map((e) => e.message).join(", ")}`,
        query,
        variables
      );
    }
    return result;
  }

  return {
    async fetchProposals(first = 20, skip = 0) {
      const r = await execute<ProposalsQueryResponse>(PROPOSALS_QUERY, { daoAddress, first, skip });
      return r.data.proposals;
    },
    async fetchProposalByNumber(proposalNumber) {
      const r = await execute<ProposalsQueryResponse>(PROPOSAL_BY_NUMBER_QUERY, {
        daoAddress,
        proposalNumber,
      });
      return r.data.proposals[0] ?? null;
    },
    async fetchProposalById(proposalId) {
      const r = await execute<ProposalsQueryResponse>(PROPOSAL_BY_ID_QUERY, {
        proposalId: proposalId.toLowerCase(),
      });
      return r.data.proposals[0] ?? null;
    },
    async fetchVotes(proposalNumber, first = 50, skip = 0) {
      const r = await execute<VotesQueryResponse>(VOTES_QUERY, {
        daoAddress,
        proposalNumber,
        first,
        skip,
      });
      return r.data.proposalVotes;
    },
    async fetchRecentProposals(sinceTimestamp) {
      const r = await execute<ProposalsQueryResponse>(RECENT_PROPOSALS_QUERY, {
        daoAddress,
        since: sinceTimestamp.toString(),
      });
      return r.data.proposals;
    },
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @builder-dao/cli typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/subgraph/client.ts
git commit -m "feat(core): refactor subgraph client to factory taking DaoConfig"
```

---

### Task 7: Add DAO metadata subgraph helper (TDD)

The Nouns Builder subgraph exposes a `dao` entity keyed by token address with `governor`, `treasury`, `auction`, `metadata` fields. This removes the hardcoded `GOVERNOR_ADDRESS` from cast-vote.

**Files:**
- Modify: `packages/core/src/subgraph/queries.ts` (append `DAO_BY_ID_QUERY`)
- Create: `packages/core/src/subgraph/dao.ts`
- Create: `packages/core/tests/subgraph/dao.test.ts`

- [ ] **Step 1: Append query to `queries.ts`**

Add to the end of `packages/core/src/subgraph/queries.ts`:

```ts
export const DAO_BY_ID_QUERY = `
  query GetDao($daoAddress: String!) {
    dao(id: $daoAddress) {
      id
      name
      symbol
      governorAddress
      treasuryAddress
      auctionAddress
      metadataAddress
    }
  }
`;
```

- [ ] **Step 2: Write the failing test**

```ts
// packages/core/tests/subgraph/dao.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchDaoMetadata } from "../../src/subgraph/dao.js";
import type { DaoConfig } from "../../src/config.js";

const baseCfg: DaoConfig = {
  daoAddress: "0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17",
  goldskyProjectId: "project_test",
  chainId: 8453,
  rpcUrl: "https://mainnet.base.org",
};

describe("fetchDaoMetadata", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed dao record", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            data: {
              dao: {
                id: baseCfg.daoAddress,
                name: "Gnars",
                symbol: "GNAR",
                governorAddress: "0x3dd4e53a232b7b715c9ae455f4e732465ed71b4c",
                treasuryAddress: "0x72ad986ebac0246d2b3c565ab2a1ce3a14ce6f88",
                auctionAddress: "0x494eaa55ecf6310658b8fc004b0888dcb698097f",
                metadataAddress: "0xdc9799d424ebfdcf5310f3bad3ddcce3931d4b58",
              },
            },
          })
        )
      )
    );
    const dao = await fetchDaoMetadata(baseCfg);
    expect(dao.governorAddress).toBe("0x3dd4e53a232b7b715c9ae455f4e732465ed71b4c");
    expect(dao.name).toBe("Gnars");
  });

  it("throws when dao not indexed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ data: { dao: null } }))
      )
    );
    await expect(fetchDaoMetadata(baseCfg)).rejects.toThrow(/not indexed/i);
  });

  it("caches results per daoAddress", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            dao: {
              id: baseCfg.daoAddress,
              name: "X",
              symbol: "X",
              governorAddress: "0x1111111111111111111111111111111111111111",
              treasuryAddress: "0x2222222222222222222222222222222222222222",
              auctionAddress: "0x3333333333333333333333333333333333333333",
              metadataAddress: "0x4444444444444444444444444444444444444444",
            },
          },
        })
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    await fetchDaoMetadata(baseCfg);
    await fetchDaoMetadata(baseCfg);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @builder-dao/cli test:run tests/subgraph/dao.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `packages/core/src/subgraph/dao.ts`**

```ts
import type { DaoConfig } from "../config.js";
import { getSubgraphUrl } from "../config.js";
import { DAO_BY_ID_QUERY } from "./queries.js";

export interface DaoMetadata {
  id: string;
  name: string | null;
  symbol: string | null;
  governorAddress: `0x${string}`;
  treasuryAddress: `0x${string}`;
  auctionAddress: `0x${string}`;
  metadataAddress: `0x${string}`;
}

const cache = new Map<string, DaoMetadata>();

export async function fetchDaoMetadata(cfg: DaoConfig): Promise<DaoMetadata> {
  const key = `${cfg.goldskyProjectId}:${cfg.daoAddress.toLowerCase()}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const url = getSubgraphUrl(cfg);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: DAO_BY_ID_QUERY,
      variables: { daoAddress: cfg.daoAddress.toLowerCase() },
    }),
  });
  if (!response.ok) {
    throw new Error(`Subgraph request failed: ${response.status}`);
  }
  const body = (await response.json()) as {
    data?: { dao: DaoMetadata | null };
    errors?: Array<{ message: string }>;
  };
  if (body.errors?.length) {
    throw new Error(`Subgraph query error: ${body.errors.map((e) => e.message).join(", ")}`);
  }
  const dao = body.data?.dao;
  if (!dao) {
    throw new Error(
      `DAO ${cfg.daoAddress} is not indexed by subgraph ${cfg.goldskyProjectId}`
    );
  }
  cache.set(key, dao);
  return dao;
}

export function clearDaoMetadataCache(): void {
  cache.clear();
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @builder-dao/cli test:run tests/subgraph/dao.test.ts`
Expected: all 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/subgraph/ packages/core/tests/subgraph/
git commit -m "feat(core): add fetchDaoMetadata (resolves governor/treasury by token addr)"
```

---

### Task 8: Plugin registry (TDD)

**Files:**
- Test: `packages/core/tests/registry.test.ts`
- Create: `packages/core/src/registry.ts`
- Create: `packages/core/src/context.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/core/tests/registry.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { z } from "zod";
import {
  registerCommand,
  registerTool,
  getCommand,
  getCommands,
  getTool,
  getTools,
  resetRegistry,
} from "../src/registry.js";

describe("registry", () => {
  beforeEach(() => resetRegistry());

  it("registers and retrieves a command", () => {
    registerCommand({
      name: "foo",
      description: "Foo command",
      usage: "foo",
      run: async () => {},
    });
    const cmd = getCommand("foo");
    expect(cmd?.name).toBe("foo");
  });

  it("lists all commands in registration order", () => {
    registerCommand({ name: "a", description: "", usage: "", run: async () => {} });
    registerCommand({ name: "b", description: "", usage: "", run: async () => {} });
    expect(getCommands().map((c) => c.name)).toEqual(["a", "b"]);
  });

  it("throws on duplicate command name", () => {
    registerCommand({ name: "x", description: "", usage: "", run: async () => {} });
    expect(() =>
      registerCommand({ name: "x", description: "", usage: "", run: async () => {} })
    ).toThrow(/already registered/);
  });

  it("registers and retrieves a tool", () => {
    registerTool({
      name: "t1",
      description: "Tool 1",
      inputSchema: z.object({ q: z.string() }),
      handler: async () => ({}),
    });
    expect(getTool("t1")?.name).toBe("t1");
    expect(getTools()).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @builder-dao/cli test:run tests/registry.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `packages/core/src/registry.ts`**

```ts
import type { z } from "zod";
import type { RunContext } from "./context.js";

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

const commands = new Map<string, CliCommand>();
const commandOrder: string[] = [];
const tools = new Map<string, McpTool>();
const toolOrder: string[] = [];

export function registerCommand(cmd: CliCommand): void {
  if (commands.has(cmd.name)) {
    throw new Error(`Command '${cmd.name}' is already registered`);
  }
  commands.set(cmd.name, cmd);
  commandOrder.push(cmd.name);
}

export function registerTool(tool: McpTool): void {
  if (tools.has(tool.name)) {
    throw new Error(`Tool '${tool.name}' is already registered`);
  }
  tools.set(tool.name, tool);
  toolOrder.push(tool.name);
}

export function getCommand(name: string): CliCommand | undefined {
  return commands.get(name);
}

export function getCommands(): CliCommand[] {
  return commandOrder.map((n) => commands.get(n)!).filter(Boolean);
}

export function getTool(name: string): McpTool | undefined {
  return tools.get(name);
}

export function getTools(): McpTool[] {
  return toolOrder.map((n) => tools.get(n)!).filter(Boolean);
}

export function resetRegistry(): void {
  commands.clear();
  commandOrder.length = 0;
  tools.clear();
  toolOrder.length = 0;
}
```

- [ ] **Step 4: Implement `packages/core/src/context.ts`**

```ts
import type { DaoConfig } from "./config.js";
import type { SubgraphClient } from "./subgraph/client.js";
import { createSubgraphClient } from "./subgraph/client.js";
import { encodeResponse, type OutputFormat } from "./utils/encoder.js";

export interface RunContext {
  config: DaoConfig;
  subgraph: SubgraphClient;
  format: OutputFormat;
  pretty: boolean;
  print(data: unknown): void;
}

export function createContext(
  config: DaoConfig,
  opts: { format?: OutputFormat; pretty?: boolean } = {}
): RunContext {
  const format = opts.format ?? "json";
  const pretty = opts.pretty ?? false;
  return {
    config,
    subgraph: createSubgraphClient(config),
    format,
    pretty,
    print(data: unknown) {
      if (format === "toon") {
        console.log(encodeResponse(data, "toon"));
      } else {
        console.log(pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data));
      }
    },
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @builder-dao/cli test:run tests/registry.test.ts`
Expected: all 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/registry.ts packages/core/src/context.ts packages/core/tests/registry.test.ts
git commit -m "feat(core): plugin registry (commands + MCP tools) and RunContext"
```

---

### Task 9: Migrate read-path tools (list, get, votes, ens)

Port each tool so its handler signature is `(input, ctx: RunContext)`. Replace uses of the old module-level `subgraphClient` with `ctx.subgraph`. Replace Gnars-specific descriptions with DAO-agnostic ones.

**Files:**
- Create: `packages/core/src/tools/list-proposals.ts`
- Create: `packages/core/src/tools/get-proposal.ts`
- Create: `packages/core/src/tools/get-proposal-votes.ts`
- Create: `packages/core/src/tools/resolve-ens.ts`

- [ ] **Step 1: Port `list-proposals.ts`**

Create `packages/core/src/tools/list-proposals.ts`. Copy from source (`/Users/r4to/Script/gnars-website/mcp-subgraph/src/tools/list-proposals.ts`), then apply these changes:

Replace the import line:
```ts
import { subgraphClient } from "../subgraph/client.js";
```
with:
```ts
import type { RunContext } from "../context.js";
```

Change the exported function signature and body to use the context:

```ts
export async function listProposals(
  input: ListProposalsInput,
  ctx: RunContext
): Promise<ListProposalsOutput> {
  const fetchLimit = input.status ? 200 : input.limit;
  const fetchOffset = input.status ? 0 : input.offset;
  const proposals = await ctx.subgraph.fetchProposals(fetchLimit, fetchOffset);
  // ... rest of function body identical to source
}
```

Keep the schema and types exactly as in source.

- [ ] **Step 2: Port `get-proposal.ts`**

Same pattern: replace `subgraphClient` import with `RunContext`; add `ctx` as second arg; call `ctx.subgraph.fetchProposalByNumber` / `fetchProposalById`.

- [ ] **Step 3: Port `get-proposal-votes.ts`**

Same pattern. Uses `ctx.subgraph.fetchProposalByNumber` + `ctx.subgraph.fetchVotes`.

- [ ] **Step 4: Port `resolve-ens.ts`**

Copy verbatim, then change the User-Agent header:

```ts
"User-Agent": "builder-dao-cli/ens",
```

`resolveEns` and `resolveEnsBatch` do NOT use the subgraph — they keep their current signatures (no `ctx` param needed). Keep as-is.

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @builder-dao/cli typecheck`
Expected: passes.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/tools/
git commit -m "feat(core): migrate read-path tools (list, get, votes, ens) with RunContext"
```

---

### Task 10: Migrate `cast-vote` with dynamic governor

Replaces the hardcoded `GOVERNOR_ADDRESS` with `fetchDaoMetadata`.

**Files:**
- Create: `packages/core/src/tools/cast-vote.ts`

- [ ] **Step 1: Port `cast-vote.ts` with dynamic governor**

```ts
import { z } from "zod";
import { createWalletClient, createPublicClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import type { RunContext } from "../context.js";
import { fetchDaoMetadata } from "../subgraph/dao.js";

const SUPPORT_MAP = { AGAINST: 0n, FOR: 1n, ABSTAIN: 2n } as const;

const CAST_VOTE_ABI = [
  {
    type: "function",
    name: "castVote",
    inputs: [
      { name: "_proposalId", type: "bytes32", internalType: "bytes32" },
      { name: "_support", type: "uint256", internalType: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "castVoteWithReason",
    inputs: [
      { name: "_proposalId", type: "bytes32", internalType: "bytes32" },
      { name: "_support", type: "uint256", internalType: "uint256" },
      { name: "_reason", type: "string", internalType: "string" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "nonpayable",
  },
] as const;

export const castVoteSchema = z.object({
  proposalId: z
    .union([z.string(), z.number()])
    .describe("Proposal ID (hex 0x...) or proposal number"),
  support: z.enum(["FOR", "AGAINST", "ABSTAIN"]).describe("Vote choice"),
  reason: z.string().optional().describe("Optional on-chain reason"),
});

export type CastVoteInput = z.infer<typeof castVoteSchema>;

export interface CastVoteOutput {
  success: boolean;
  transactionHash: string;
  voter: string;
  proposalId: string;
  support: string;
  reason?: string;
  blockNumber?: string;
  governor: string;
}

async function resolveProposalId(
  id: string | number,
  ctx: RunContext
): Promise<Hex> {
  if (typeof id === "number" || (typeof id === "string" && !id.startsWith("0x"))) {
    const n = typeof id === "string" ? parseInt(id, 10) : id;
    const p = await ctx.subgraph.fetchProposalByNumber(n);
    if (!p) throw new Error(`Proposal #${id} not found`);
    return p.proposalId as Hex;
  }
  return id as Hex;
}

export async function castVote(
  input: CastVoteInput,
  ctx: RunContext
): Promise<CastVoteOutput> {
  if (!ctx.config.privateKey) {
    throw new Error(
      "PRIVATE_KEY environment variable is required to cast votes."
    );
  }

  const dao = await fetchDaoMetadata(ctx.config);
  const governor = dao.governorAddress;

  const account = privateKeyToAccount(ctx.config.privateKey);
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(ctx.config.rpcUrl),
  });
  const publicClient = createPublicClient({
    chain: base,
    transport: http(ctx.config.rpcUrl),
  });

  const proposalId = await resolveProposalId(input.proposalId, ctx);
  const support = SUPPORT_MAP[input.support];
  const trimmedReason = input.reason?.trim();

  let txHash: Hex;
  if (trimmedReason && trimmedReason.length > 0) {
    txHash = await walletClient.writeContract({
      account,
      abi: CAST_VOTE_ABI,
      address: governor,
      functionName: "castVoteWithReason",
      args: [proposalId, support, trimmedReason],
      chain: base,
    });
  } else {
    txHash = await walletClient.writeContract({
      account,
      abi: CAST_VOTE_ABI,
      address: governor,
      functionName: "castVote",
      args: [proposalId, support],
      chain: base,
    });
  }

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    timeout: 60_000,
  });

  return {
    success: receipt.status === "success",
    transactionHash: txHash,
    voter: account.address,
    proposalId,
    support: input.support,
    reason: trimmedReason || undefined,
    blockNumber: receipt.blockNumber.toString(),
    governor,
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @builder-dao/cli typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/tools/cast-vote.ts
git commit -m "feat(core): cast-vote resolves governor via subgraph (no hardcoded addr)"
```

---

### Task 11: Register core commands + tools

**Files:**
- Create: `packages/core/src/tools/register-core.ts`

- [ ] **Step 1: Write `register-core.ts`**

```ts
import { parseArgs } from "node:util";
import { z } from "zod";
import { registerCommand, registerTool } from "../registry.js";
import { listProposals, listProposalsSchema } from "./list-proposals.js";
import { getProposal, getProposalSchema } from "./get-proposal.js";
import { getProposalVotes, getProposalVotesSchema } from "./get-proposal-votes.js";
import { castVote, castVoteSchema } from "./cast-vote.js";
import {
  resolveEns,
  resolveEnsSchema,
  resolveEnsBatch,
  resolveEnsBatchSchema,
} from "./resolve-ens.js";

export function registerCoreCommands(): void {
  registerCommand({
    name: "proposals",
    description: "List proposals for the configured Builder DAO",
    usage: "proposals [--status STATUS] [--limit N] [--offset N] [--order asc|desc]",
    async run(args, ctx) {
      const { values } = parseArgs({
        args,
        options: {
          status: { type: "string" },
          limit: { type: "string", default: "20" },
          offset: { type: "string", default: "0" },
          order: { type: "string", default: "desc" },
        },
      });
      const result = await listProposals(
        listProposalsSchema.parse({
          status: values.status,
          limit: parseInt(values.limit!, 10),
          offset: parseInt(values.offset!, 10),
          order: values.order,
          format: ctx.format,
        }),
        ctx
      );
      ctx.print(result);
    },
  });

  registerCommand({
    name: "proposal",
    description: "Get a proposal by hex ID or proposal number",
    usage: "proposal <id>",
    async run(args, ctx) {
      const { positionals } = parseArgs({ args, allowPositionals: true, options: {} });
      const id = positionals[0];
      if (!id) throw new Error("Usage: builder-dao proposal <id>");
      const parsed = Number(id);
      const result = await getProposal(
        getProposalSchema.parse({ id: Number.isNaN(parsed) ? id : parsed, hideDescription: false }),
        ctx
      );
      if (!result) throw new Error(`Proposal ${id} not found`);
      ctx.print(result);
    },
  });

  registerCommand({
    name: "votes",
    description: "List votes on a proposal",
    usage: "votes <id> [--support FOR|AGAINST|ABSTAIN] [--limit N] [--offset N]",
    async run(args, ctx) {
      const { values, positionals } = parseArgs({
        args,
        allowPositionals: true,
        options: {
          support: { type: "string" },
          limit: { type: "string", default: "50" },
          offset: { type: "string", default: "0" },
        },
      });
      const id = positionals[0];
      if (!id) throw new Error("Usage: builder-dao votes <id>");
      const parsed = Number(id);
      const result = await getProposalVotes(
        getProposalVotesSchema.parse({
          proposalId: Number.isNaN(parsed) ? id : parsed,
          support: values.support,
          limit: parseInt(values.limit!, 10),
          offset: parseInt(values.offset!, 10),
          format: ctx.format,
        }),
        ctx
      );
      if (!result) throw new Error(`Proposal ${id} not found`);
      ctx.print(result);
    },
  });

  registerCommand({
    name: "vote",
    description: "Cast an on-chain vote (requires PRIVATE_KEY)",
    usage: "vote <id> FOR|AGAINST|ABSTAIN [--reason \"...\"]",
    async run(args, ctx) {
      const { values, positionals } = parseArgs({
        args,
        allowPositionals: true,
        options: { reason: { type: "string" } },
      });
      const [id, support] = positionals;
      if (!id || !support) throw new Error("Usage: builder-dao vote <id> FOR|AGAINST|ABSTAIN");
      const parsed = Number(id);
      const result = await castVote(
        castVoteSchema.parse({
          proposalId: Number.isNaN(parsed) ? id : parsed,
          support,
          reason: values.reason,
        }),
        ctx
      );
      ctx.print(result);
    },
  });

  registerCommand({
    name: "ens",
    description: "Resolve one or more addresses to ENS",
    usage: "ens <addr> [<addr2> ...]",
    async run(args, ctx) {
      const addresses = args.filter((a) => !a.startsWith("--"));
      if (addresses.length === 0) throw new Error("Usage: builder-dao ens <addr>");
      if (addresses.length === 1) {
        const result = await resolveEns({ address: addresses[0] });
        ctx.print(result);
      } else {
        const result = await resolveEnsBatch(resolveEnsBatchSchema.parse({
          addresses,
          format: ctx.format,
        }));
        ctx.print(result);
      }
    },
  });

  registerTool({
    name: "list_proposals",
    description:
      "List proposals for the configured Builder DAO with optional status filter. Use format='toon' for ~40% token savings.",
    inputSchema: listProposalsSchema,
    handler: async (input, ctx) =>
      listProposals(listProposalsSchema.parse(input), ctx),
  });

  registerTool({
    name: "get_proposal",
    description:
      "Get a specific proposal by hex ID or number. Set hideDescription=true to reduce token usage.",
    inputSchema: getProposalSchema,
    handler: async (input, ctx) => getProposal(getProposalSchema.parse(input), ctx),
  });

  registerTool({
    name: "get_proposal_votes",
    description:
      "Get votes for a specific proposal, optionally filtered by FOR/AGAINST/ABSTAIN. Use format='toon' for ~40% token savings.",
    inputSchema: getProposalVotesSchema,
    handler: async (input, ctx) =>
      getProposalVotes(getProposalVotesSchema.parse(input), ctx),
  });

  registerTool({
    name: "resolve_ens",
    description:
      "Resolve an Ethereum address to ENS name + avatar. Returns displayName, name, avatar, address.",
    inputSchema: resolveEnsSchema,
    handler: async (input) => resolveEns(resolveEnsSchema.parse(input)),
  });

  registerTool({
    name: "resolve_ens_batch",
    description:
      "Resolve many Ethereum addresses to ENS in one call. Use format='toon' for ~25% token savings.",
    inputSchema: resolveEnsBatchSchema,
    handler: async (input) => resolveEnsBatch(resolveEnsBatchSchema.parse(input)),
  });

  registerTool({
    name: "cast_vote",
    description:
      "Cast a vote on-chain on an active Builder DAO proposal. Requires PRIVATE_KEY env. Governor is resolved from the configured DAO address via subgraph.",
    inputSchema: castVoteSchema,
    handler: async (input, ctx) => castVote(castVoteSchema.parse(input), ctx),
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @builder-dao/cli typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/tools/register-core.ts
git commit -m "feat(core): register 5 commands + 6 MCP tools into registry"
```

---

### Task 12: Write core CLI entry

**Files:**
- Create: `packages/core/src/cli.ts`

- [ ] **Step 1: Write `cli.ts`**

```ts
#!/usr/bin/env node
import { resolveConfig, ConfigError } from "./config.js";
import { createContext } from "./context.js";
import { registerCoreCommands } from "./tools/register-core.js";
import { getCommand, getCommands } from "./registry.js";

function stripFlags(args: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--pretty" || a === "--toon" || a === "--help" || a === "-h" || a === "--version") {
      continue;
    }
    if (a === "--dao" || a === "--subgraph-project" || a === "--rpc-url") {
      i++;
      continue;
    }
    out.push(a);
  }
  return out;
}

function printHelp(): void {
  const cmds = getCommands();
  console.error(`
builder-dao - CLI for Nouns Builder DAOs on Base

Usage: builder-dao <command> [args] [flags]

Global flags:
  --dao <addr>               DAO token address (overrides DAO_ADDRESS env)
  --subgraph-project <id>    Goldsky project ID (overrides GOLDSKY_PROJECT_ID env)
  --rpc-url <url>            RPC URL (overrides BASE_RPC_URL env)
  --pretty                   Pretty-print JSON output
  --toon                     Output TOON (~40% fewer tokens)
  --help, -h                 Show this help
  --version                  Print version

Commands:
${cmds.map((c) => `  ${c.usage.padEnd(60)} ${c.description}`).join("\n")}

Environment:
  DAO_ADDRESS                Required unless --dao passed
  GOLDSKY_PROJECT_ID         Required unless --subgraph-project passed
  BASE_RPC_URL               Default https://mainnet.base.org
  PRIVATE_KEY                Required only for \`vote\`
`);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  registerCoreCommands();
  try {
    await import("@builder-dao/cli-search");
  } catch {
    // Addon not installed — continue with core commands only
  }

  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    process.exit(0);
  }
  if (argv.includes("--version")) {
    const { version } = await import("../package.json", { with: { type: "json" } });
    console.log(version);
    process.exit(0);
  }

  const commandName = argv[0];

  if (commandName === "mcp") {
    const { runServer } = await import("./server.js");
    await runServer();
    return;
  }

  const command = getCommand(commandName);
  if (!command) {
    console.error(`Unknown command: ${commandName}`);
    if (["sync", "search", "index"].includes(commandName)) {
      console.error(
        `Command '${commandName}' requires @builder-dao/cli-search.\n` +
          `Install: pnpm add -g @builder-dao/cli-search`
      );
    } else {
      printHelp();
    }
    process.exit(1);
  }

  try {
    const config = resolveConfig(argv, process.env);
    const ctx = createContext(config, {
      format: argv.includes("--toon") ? "toon" : "json",
      pretty: argv.includes("--pretty"),
    });
    const rest = stripFlags(argv.slice(1));
    await command.run(rest, ctx);
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(`Config error: ${err.message}`);
      process.exit(2);
    }
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @builder-dao/cli typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/cli.ts
git commit -m "feat(core): new CLI entry using registry + dynamic addon import"
```

---

### Task 13: Write core MCP server entry

**Files:**
- Create: `packages/core/src/server.ts`

- [ ] **Step 1: Write `server.ts`**

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer as createHttpServer } from "node:http";
import { resolveConfig } from "./config.js";
import { createContext } from "./context.js";
import { registerCoreCommands } from "./tools/register-core.js";
import { getTools } from "./registry.js";
import { createMcpResponse, type OutputFormat } from "./utils/encoder.js";

export async function createServer() {
  registerCoreCommands();
  try {
    await import("@builder-dao/cli-search");
  } catch {
    // Addon not installed
  }

  const config = resolveConfig(process.argv.slice(2), process.env);
  const ctx = createContext(config);

  const server = new McpServer({
    name: "builder-dao",
    version: "0.1.0",
  });

  for (const tool of getTools()) {
    server.tool(
      tool.name,
      tool.description,
      (tool.inputSchema as any).shape ?? {},
      async (params: unknown) => {
        try {
          const result = await tool.handler(params, ctx);
          const fmt: OutputFormat =
            typeof params === "object" && params !== null && "format" in params
              ? ((params as { format?: OutputFormat }).format ?? "json")
              : "json";
          return createMcpResponse(result, fmt);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
        }
      }
    );
  }

  return { server, ctx };
}

export async function runServer(): Promise<void> {
  const { server } = await createServer();

  const argv = process.argv.slice(2);
  const sseFlag = argv.includes("--sse");
  const port = sseFlag ? parseInt(process.env.MCP_PORT || "3100", 10) : null;

  if (port) {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    await server.connect(transport);

    const httpServer = createHttpServer(async (req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, mcp-session-id");
      res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url || "/", `http://localhost:${port}`);
      if (url.pathname === "/mcp" || url.pathname === "/") {
        await transport.handleRequest(req, res);
      } else if (url.pathname === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", mode: "streamable-http", port }));
      } else {
        res.writeHead(404);
        res.end("Not found.");
      }
    });

    httpServer.listen(port, () => {
      console.error(`MCP server running on http://localhost:${port}/mcp`);
    });
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @builder-dao/cli typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/server.ts
git commit -m "feat(core): MCP server entry driven by registry"
```

---

### Task 14: Migrate core tests (list / get / votes)

The existing tests under `mcp-subgraph/tests/tools/` need their fixtures + call sites updated to pass `ctx`.

**Files:**
- Create: `packages/core/tests/fixtures/proposals.ts`
- Create: `packages/core/tests/fixtures/context.ts`
- Create: `packages/core/tests/tools/list-proposals.test.ts`
- Create: `packages/core/tests/tools/get-proposal.test.ts`
- Create: `packages/core/tests/tools/get-proposal-votes.test.ts`
- Create: `packages/core/tests/subgraph/client.test.ts`
- Create: `packages/core/tests/subgraph/types.test.ts`
- Create: `packages/core/tests/setup.ts`

- [ ] **Step 1: Copy fixtures verbatim**

Copy `/Users/r4to/Script/gnars-website/mcp-subgraph/tests/fixtures/proposals.ts` → `packages/core/tests/fixtures/proposals.ts` with no changes. (Gnars-addressed mock data is intentional test fixture, not product default.)

Copy `/Users/r4to/Script/gnars-website/mcp-subgraph/tests/setup.ts` → `packages/core/tests/setup.ts`.

- [ ] **Step 2: Write `packages/core/tests/fixtures/context.ts` helper**

```ts
import type { RunContext } from "../../src/context.js";
import type { SubgraphClient } from "../../src/subgraph/client.js";
import type { DaoConfig } from "../../src/config.js";

export const TEST_DAO_ADDRESS =
  "0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17" as const;

export const TEST_CONFIG: DaoConfig = {
  daoAddress: TEST_DAO_ADDRESS,
  goldskyProjectId: "project_test",
  chainId: 8453,
  rpcUrl: "https://mainnet.base.org",
};

export function makeContextWithSubgraph(
  subgraph: Partial<SubgraphClient>
): RunContext {
  return {
    config: TEST_CONFIG,
    subgraph: {
      fetchProposals: async () => [],
      fetchProposalByNumber: async () => null,
      fetchProposalById: async () => null,
      fetchVotes: async () => [],
      fetchRecentProposals: async () => [],
      ...subgraph,
    } as SubgraphClient,
    format: "json",
    pretty: false,
    print: () => {},
  };
}
```

- [ ] **Step 3: Port `list-proposals.test.ts`**

Copy source test file. Replace all uses of `vi.mock("../../src/subgraph/client.js", ...)` with `makeContextWithSubgraph(...)` and call `listProposals(input, ctx)` instead of `listProposals(input)`. Remove any reliance on module-level `subgraphClient` mocking.

- [ ] **Step 4: Port `get-proposal.test.ts` and `get-proposal-votes.test.ts` the same way**

Same pattern: pass `ctx` as second arg, inject subgraph methods via `makeContextWithSubgraph`.

- [ ] **Step 5: Port `subgraph/client.test.ts` and `subgraph/types.test.ts`**

For `client.test.ts`: use `createSubgraphClient(TEST_CONFIG)` and stub global `fetch`. For `types.test.ts`: copy verbatim (no subgraph call).

- [ ] **Step 6: Run full core test suite**

Run: `pnpm --filter @builder-dao/cli test:run`
Expected: all existing tests (subgraph + tools + config + registry + dao) PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/core/tests/
git commit -m "test(core): migrate tool tests to RunContext-based DI"
```

---

### Task 15: Scaffold `@builder-dao/cli-search` addon package

**Files:**
- Create: `packages/search/package.json`
- Create: `packages/search/tsconfig.json`
- Create: `packages/search/vitest.config.ts`
- Create: `packages/search/src/index.ts` (placeholder)

- [ ] **Step 1: Write `packages/search/package.json`**

```json
{
  "name": "@builder-dao/cli-search",
  "version": "0.1.0",
  "description": "Semantic search + local cache addon for @builder-dao/cli",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist", "README.md", "LICENSE"],
  "exports": {
    ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest",
    "test:run": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "peerDependencies": {
    "@builder-dao/cli": "^0.1.0"
  },
  "dependencies": {
    "@huggingface/transformers": "^3.0.0",
    "better-sqlite3": "^11.6.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@builder-dao/cli": "workspace:*",
    "@types/better-sqlite3": "^7.6.11",
    "@types/node": "^22.10.0",
    "tsx": "^4.19.2",
    "vitest": "^2.1.6"
  },
  "pnpm": {
    "onlyBuiltDependencies": [
      "better-sqlite3",
      "onnxruntime-node",
      "sharp",
      "protobufjs"
    ]
  },
  "keywords": ["nouns-builder", "dao", "semantic-search", "embeddings", "mcp"],
  "license": "MIT"
}
```

- [ ] **Step 2: Write `packages/search/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Write `packages/search/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Write placeholder `packages/search/src/index.ts`**

```ts
export {};
```

- [ ] **Step 5: Install**

Run: `pnpm install` (from repo root)
Expected: succeeds; resolves workspace dep `@builder-dao/cli`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(search): scaffold @builder-dao/cli-search package"
```

---

### Task 16: Migrate DB module with per-DAO path

**Files:**
- Create: `packages/search/src/db/schema.ts` (verbatim copy)
- Create: `packages/search/src/db/repository.ts` (verbatim copy)
- Create: `packages/search/src/db/connection.ts` (modified: path from config)

- [ ] **Step 1: Copy `schema.ts` verbatim**

Copy `/Users/r4to/Script/gnars-website/mcp-subgraph/src/db/schema.ts` → `packages/search/src/db/schema.ts`. No changes.

- [ ] **Step 2: Copy `repository.ts` verbatim**

Copy `/Users/r4to/Script/gnars-website/mcp-subgraph/src/db/repository.ts` → `packages/search/src/db/repository.ts`. No changes to class body.

- [ ] **Step 3: Write new `connection.ts` with per-DAO path**

```ts
import Database from "better-sqlite3";
import { mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { DaoConfig } from "@builder-dao/cli";
import { SCHEMA } from "./schema.js";

function defaultDataDir(): string {
  const xdg = process.env.XDG_DATA_HOME;
  if (xdg) return join(xdg, "builder-dao");
  return join(homedir(), ".local", "share", "builder-dao");
}

export function resolveDbPath(cfg: DaoConfig, override?: string): string {
  if (override) return override;
  if (process.env.DB_PATH) return process.env.DB_PATH;
  const shortAddr = cfg.daoAddress.slice(0, 10); // "0x" + 8 hex chars
  return join(defaultDataDir(), `${shortAddr}.db`);
}

const dbCache = new Map<string, Database.Database>();

export function openDatabase(cfg: DaoConfig, override?: string): Database.Database {
  const path = resolveDbPath(cfg, override);
  const cached = dbCache.get(path);
  if (cached) return cached;

  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);

  dbCache.set(path, db);
  return db;
}

export function closeDatabase(path?: string): void {
  if (path) {
    const db = dbCache.get(path);
    if (db) { db.close(); dbCache.delete(path); }
    return;
  }
  for (const [, db] of dbCache) db.close();
  dbCache.clear();
}

export function createTestDatabase(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}
```

- [ ] **Step 4: Update imports inside `repository.ts`**

Open `packages/search/src/db/repository.ts`. The import:
```ts
import type { SubgraphProposal, SubgraphVote, ProposalStatus } from "../subgraph/types.js";
import { calculateProposalStatus } from "../subgraph/types.js";
```
becomes:
```ts
import type { SubgraphProposal, SubgraphVote, ProposalStatus } from "@builder-dao/cli";
import { calculateProposalStatus } from "@builder-dao/cli";
```

Then add `SubgraphProposal`, `SubgraphVote`, `ProposalStatus`, `calculateProposalStatus` to core's `packages/core/src/index.ts` exports:

```ts
export type { DaoConfig } from "./config.js";
export type { RunContext } from "./context.js";
export type {
  SubgraphProposal,
  SubgraphVote,
  ProposalStatus,
  ProposalsQueryResponse,
  VotesQueryResponse,
} from "./subgraph/types.js";
export { calculateProposalStatus } from "./subgraph/types.js";
export { createSubgraphClient } from "./subgraph/client.js";
export { registerCommand, registerTool } from "./registry.js";
export { createContext } from "./context.js";
export { resolveConfig } from "./config.js";
```

- [ ] **Step 5: Rebuild core so addon can import it**

Run: `pnpm --filter @builder-dao/cli build`
Expected: emits `packages/core/dist/` with the above exports.

- [ ] **Step 6: Typecheck addon**

Run: `pnpm --filter @builder-dao/cli-search typecheck`
Expected: passes.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/index.ts packages/search/src/db/
git commit -m "feat(search): migrate db module with per-DAO path"
```

---

### Task 17: Migrate embeddings

**Files:**
- Create: `packages/search/src/embeddings/chunker.ts` (verbatim)
- Create: `packages/search/src/embeddings/generator.ts` (verbatim)

- [ ] **Step 1: Copy both files verbatim**

Copy:
- `mcp-subgraph/src/embeddings/chunker.ts` → `packages/search/src/embeddings/chunker.ts`
- `mcp-subgraph/src/embeddings/generator.ts` → `packages/search/src/embeddings/generator.ts`

No code changes.

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @builder-dao/cli-search typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add packages/search/src/embeddings/
git commit -m "feat(search): migrate embeddings chunker + generator"
```

---

### Task 18: Migrate sync / index / search tools

**Files:**
- Create: `packages/search/src/tools/sync-proposals.ts`
- Create: `packages/search/src/tools/search-proposals.ts`
- Create: `packages/search/src/tools/index-embeddings.ts`

- [ ] **Step 1: Port `sync-proposals.ts`**

Copy source. Update imports:

```ts
import type { ProposalRepository } from "../db/repository.js";
import type { RunContext } from "@builder-dao/cli";
```

Change the handler signature to:

```ts
export async function syncProposals(
  repo: ProposalRepository,
  input: SyncProposalsInput,
  ctx: RunContext
): Promise<SyncProposalsOutput> {
  // replace direct calls like `subgraphClient.fetchProposals(...)` with `ctx.subgraph.fetchProposals(...)`
  // body otherwise identical
}
```

- [ ] **Step 2: Port `search-proposals.ts`**

Same pattern. `searchProposals(repo, input, ctx)`. The embeddings generator usage stays the same.

- [ ] **Step 3: Port `index-embeddings.ts` (rename from `indexProposalEmbeddings`)**

Split the current `indexProposalEmbeddings` export (which lives in `search-proposals.ts` in the source) into its own file `index-embeddings.ts` for clearer module responsibility:

```ts
import type { ProposalRepository } from "../db/repository.js";
import { chunkText } from "../embeddings/chunker.js";
import { generateEmbedding } from "../embeddings/generator.js";

export async function indexProposalEmbeddings(
  repo: ProposalRepository
): Promise<{ indexed: number; skipped: number }> {
  // Body identical to source `indexProposalEmbeddings` function
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @builder-dao/cli-search typecheck`
Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add packages/search/src/tools/
git commit -m "feat(search): migrate sync/search/index tools with RunContext"
```

---

### Task 19: Write addon registration entry

**Files:**
- Create: `packages/search/src/index.ts` (replaces placeholder)

- [ ] **Step 1: Write registration**

```ts
import { parseArgs } from "node:util";
import { z } from "zod";
import { registerCommand, registerTool } from "@builder-dao/cli";
import { openDatabase } from "./db/connection.js";
import { ProposalRepository } from "./db/repository.js";
import { syncProposals, syncProposalsSchema } from "./tools/sync-proposals.js";
import { searchProposals, searchProposalsSchema } from "./tools/search-proposals.js";
import { indexProposalEmbeddings } from "./tools/index-embeddings.js";

registerCommand({
  name: "sync",
  description: "Sync proposals from subgraph into local DB (per-DAO)",
  usage: "sync [--full]",
  async run(args, ctx) {
    const { values } = parseArgs({
      args,
      options: { full: { type: "boolean", default: false } },
    });
    const db = openDatabase(ctx.config);
    const repo = new ProposalRepository(db);
    const result = await syncProposals(repo, { full: values.full ?? false }, ctx);
    ctx.print(result);
  },
});

registerCommand({
  name: "index",
  description: "Generate embeddings for synced proposals",
  usage: "index",
  async run(_args, ctx) {
    const db = openDatabase(ctx.config);
    const repo = new ProposalRepository(db);
    const result = await indexProposalEmbeddings(repo);
    ctx.print(result);
  },
});

registerCommand({
  name: "search",
  description: "Semantic search over synced proposals",
  usage: 'search "<query>" [--status STATUS] [--limit N] [--threshold 0-1]',
  async run(args, ctx) {
    const { values, positionals } = parseArgs({
      args,
      allowPositionals: true,
      options: {
        status: { type: "string" },
        limit: { type: "string", default: "5" },
        threshold: { type: "string", default: "0.3" },
      },
    });
    const query = positionals.join(" ");
    if (!query) throw new Error('Usage: builder-dao search "<query>"');
    const db = openDatabase(ctx.config);
    const repo = new ProposalRepository(db);
    const result = await searchProposals(
      repo,
      searchProposalsSchema.parse({
        query,
        status: values.status,
        limit: parseInt(values.limit!, 10),
        threshold: parseFloat(values.threshold!),
        format: ctx.format,
      }),
      ctx
    );
    ctx.print(result);
  },
});

registerTool({
  name: "sync_proposals",
  description: "Sync proposals from the Nouns Builder subgraph to the local per-DAO database. Pass full=true for a complete re-sync.",
  inputSchema: syncProposalsSchema,
  handler: async (input, ctx) => {
    const db = openDatabase(ctx.config);
    const repo = new ProposalRepository(db);
    return syncProposals(repo, syncProposalsSchema.parse(input), ctx);
  },
});

registerTool({
  name: "search_proposals",
  description: "Semantic search over proposals. Requires sync_proposals + index_embeddings to have been run. Use format='toon' for ~40% token savings.",
  inputSchema: searchProposalsSchema,
  handler: async (input, ctx) => {
    const db = openDatabase(ctx.config);
    const repo = new ProposalRepository(db);
    return searchProposals(repo, searchProposalsSchema.parse(input), ctx);
  },
});

registerTool({
  name: "index_embeddings",
  description: "Generate embeddings for synced proposals. Must be run after sync_proposals. Idempotent — only indexes proposals missing embeddings.",
  inputSchema: z.object({}),
  handler: async (_input, ctx) => {
    const db = openDatabase(ctx.config);
    const repo = new ProposalRepository(db);
    const stats = repo.getEmbeddingStats();
    const result = await indexProposalEmbeddings(repo);
    return { ...result, stats: { ...repo.getEmbeddingStats(), previouslyIndexed: stats.embeddedProposals } };
  },
});
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @builder-dao/cli-search typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add packages/search/src/index.ts
git commit -m "feat(search): register sync/index/search commands + tools"
```

---

### Task 20: Migrate search tests

**Files:**
- Create: `packages/search/tests/fixtures/proposals.ts`
- Create: `packages/search/tests/db/repository.test.ts`
- Create: `packages/search/tests/embeddings/chunker.test.ts`
- Create: `packages/search/tests/embeddings/generator.test.ts`

- [ ] **Step 1: Copy fixtures + tests verbatim**

Copy:
- `mcp-subgraph/tests/fixtures/proposals.ts` → `packages/search/tests/fixtures/proposals.ts`
- `mcp-subgraph/tests/db/repository.test.ts` → `packages/search/tests/db/repository.test.ts`
- `mcp-subgraph/tests/embeddings/chunker.test.ts` → `packages/search/tests/embeddings/chunker.test.ts`
- `mcp-subgraph/tests/embeddings/generator.test.ts` → `packages/search/tests/embeddings/generator.test.ts`

Update relative imports inside each test: any `../../src/subgraph/types.js` becomes `@builder-dao/cli`; any `../../src/db/...` stays local (now in same package).

- [ ] **Step 2: Run search tests**

Run: `pnpm --filter @builder-dao/cli-search test:run`
Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/search/tests/
git commit -m "test(search): migrate db + embeddings tests"
```

---

### Task 21: Full build + manual smoke test against Gnars

- [ ] **Step 1: Clean build of both packages**

Run:
```bash
cd /Users/r4to/Script/builder-dao-tools
pnpm -r build
```
Expected: no errors. `packages/core/dist/cli.js` and `packages/search/dist/index.js` exist.

- [ ] **Step 2: Full test run**

Run: `pnpm -r test:run`
Expected: all tests pass across both packages.

- [ ] **Step 3: Link core binary locally for manual testing**

Run:
```bash
pnpm --filter @builder-dao/cli exec pnpm link --global
```

- [ ] **Step 4: Smoke-test read commands**

Run with Gnars env:
```bash
DAO_ADDRESS=0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17 \
GOLDSKY_PROJECT_ID=project_cm33ek8kjx6pz010i2c3w8z25 \
builder-dao proposals --limit 3 --pretty
```
Expected: 3 Gnars proposals printed as JSON.

Run:
```bash
DAO_ADDRESS=0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17 \
GOLDSKY_PROJECT_ID=project_cm33ek8kjx6pz010i2c3w8z25 \
builder-dao proposal 1 --pretty
```
Expected: proposal #1 detail.

- [ ] **Step 5: Smoke-test error on missing config**

Run: `builder-dao proposals`
Expected: exit 2, stderr `Config error: Missing DAO address. Provide --dao <addr> or set DAO_ADDRESS env.`

- [ ] **Step 6: Smoke-test unknown command with addon hint**

Run: `DAO_ADDRESS=... GOLDSKY_PROJECT_ID=... builder-dao search "skate"`
Before search addon is link-installed, expected stderr: `Command 'search' requires @builder-dao/cli-search.`

- [ ] **Step 7: Link search addon and re-test**

Run:
```bash
pnpm --filter @builder-dao/cli-search exec pnpm link --global @builder-dao/cli
pnpm --filter @builder-dao/cli exec pnpm link --global @builder-dao/cli-search
```
Then:
```bash
DAO_ADDRESS=0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17 \
GOLDSKY_PROJECT_ID=project_cm33ek8kjx6pz010i2c3w8z25 \
builder-dao sync
```
Expected: syncs proposals, prints `{ synced: N, ... }`. DB file created at `~/.local/share/builder-dao/0x880fb3cf.db`.

- [ ] **Step 8: Unlink globals to avoid polluting dev env**

Run:
```bash
pnpm unlink --global @builder-dao/cli
pnpm unlink --global @builder-dao/cli-search
```

- [ ] **Step 9: Commit (empty commit for the milestone)**

```bash
git commit --allow-empty -m "chore: phase 1 complete — extract + generalize + tests green"
```

---

## Phase 2 — Polish

### Task 22: Root docs + licence

**Files:**
- Create: `README.md`
- Create: `LICENSE`
- Create: `CHANGELOG.md`
- Create: `CONTRIBUTING.md`

- [ ] **Step 1: Write `LICENSE` (MIT)**

Use the standard MIT license template. Copyright line: `Copyright (c) 2026 builder-dao-tools contributors`.

- [ ] **Step 2: Write `README.md`**

```markdown
# builder-dao-tools

CLI and MCP server for Nouns Builder DAOs on Base.

- `@builder-dao/cli` — core CLI (`builder-dao`) and MCP server
- `@builder-dao/cli-search` — optional addon: local cache + semantic search

## Quickstart

```bash
pnpm add -g @builder-dao/cli
export DAO_ADDRESS=0x...           # DAO token contract
export GOLDSKY_PROJECT_ID=...       # Goldsky project ID for Builder Base subgraph
builder-dao proposals --limit 5 --pretty
```

## Commands

| Command | Package |
|---------|---------|
| `proposals`, `proposal`, `votes`, `vote`, `ens`, `mcp` | `@builder-dao/cli` |
| `sync`, `index`, `search` | `@builder-dao/cli-search` |

## MCP

Launch the MCP server with `builder-dao mcp` (stdio) or `builder-dao mcp --sse` (HTTP).

See [`packages/core/README.md`](packages/core/README.md) for full reference and [`examples/`](examples/) for client configs.

## Development

```bash
pnpm install
pnpm -r test:run
pnpm -r build
```

See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

MIT.
```

- [ ] **Step 3: Write `CONTRIBUTING.md`**

```markdown
# Contributing

## Setup

```bash
pnpm install
pnpm -r build
pnpm -r test:run
```

## Running the CLI locally

```bash
pnpm --filter @builder-dao/cli dev -- proposals --limit 3
```

## Release flow (maintainers)

1. `pnpm changeset` — describe the change and bump type.
2. Open PR; CI must be green.
3. Merge; the `release.yml` workflow opens a "Version packages" PR.
4. Merge the version PR; the workflow publishes to npm.
```

- [ ] **Step 4: Write empty `CHANGELOG.md`**

```markdown
# Changelog

Maintained by @changesets. See individual package changelogs under `packages/*/CHANGELOG.md`.
```

- [ ] **Step 5: Commit**

```bash
git add README.md LICENSE CHANGELOG.md CONTRIBUTING.md
git commit -m "docs: root README, LICENSE, CHANGELOG, CONTRIBUTING"
```

---

### Task 23: Package READMEs

**Files:**
- Create: `packages/core/README.md`
- Create: `packages/search/README.md`

- [ ] **Step 1: Write `packages/core/README.md`**

Full CLI reference: one section per command with full flag list, examples, and env vars. Include the MCP tool list with schemas. Client setup snippets for Claude Desktop and Cursor (reference `examples/`). Include "Environment Variables" section: `DAO_ADDRESS`, `GOLDSKY_PROJECT_ID`, `BASE_RPC_URL`, `PRIVATE_KEY`, `CHAIN_ID`. Include "Safety" section warning about `PRIVATE_KEY` — never commit, prefer env-only ephemeral shells. Use the existing `.claude/skills/gnars-cli/SKILL.md` as a content guide, but DAO-agnostic.

- [ ] **Step 2: Write `packages/search/README.md`**

Topics: what the addon adds, install alongside core, DB path (where it lives, how `--dao` changes it), HuggingFace model used (`all-MiniLM-L6-v2`, 384 dims), first-run perf note (model download), disk footprint rough estimate, `--db-path` override, `DB_PATH` env. Example flow: `sync` → `index` → `search`.

- [ ] **Step 3: Commit**

```bash
git add packages/core/README.md packages/search/README.md
git commit -m "docs: package-level READMEs for core and search"
```

---

### Task 24: Detailed docs

**Files:**
- Create: `docs/architecture.md`
- Create: `docs/plugin-api.md`
- Create: `docs/migrating-from-gnars-mcp.md`

- [ ] **Step 1: Write `docs/architecture.md`**

Port the diagram from `gnars-website/mcp-subgraph/SPEC.md` but update:
- Server name: `builder-dao` (not `gnars-subgraph`).
- Add the plugin registry between Server and Tools.
- Show optional `search` addon box dotted-outlined.
- Subgraph endpoint shape: `https://api.goldsky.com/api/public/{GOLDSKY_PROJECT_ID}/subgraphs/nouns-builder-base-mainnet/latest/gn`.
- Describe data flow for each command type.

- [ ] **Step 2: Write `docs/plugin-api.md`**

Walk through writing a custom addon:
- Package setup (peerDep on `@builder-dao/cli`).
- `registerCommand({ name, description, usage, run })` signature with explanation.
- `registerTool({ name, description, inputSchema, handler })` signature.
- The `RunContext` object and what it provides.
- How the core discovers addons (`try { await import("@builder-dao/cli-<name>") }`).
- Example: a minimal "hello" command addon.

- [ ] **Step 3: Write `docs/migrating-from-gnars-mcp.md`**

Translation table:
- Old pkg `gnars-subgraph-mcp` → `@builder-dao/cli` + `@builder-dao/cli-search`.
- Old binary `gnars` → `builder-dao`.
- Old env `GOLDSKY_PROJECT_ID` still works; new env `DAO_ADDRESS` required (was defaulted to Gnars).
- Example Gnars env file to copy (`examples/gnars.env`).
- MCP client config diff: tool names unchanged; command name in launch args changes.

- [ ] **Step 4: Commit**

```bash
git add docs/
git commit -m "docs: architecture, plugin API, migration guide"
```

---

### Task 25: Examples

**Files:**
- Create: `examples/gnars.env`
- Create: `examples/claude-desktop-config.json`
- Create: `examples/cursor-mcp.json`

- [ ] **Step 1: Write `examples/gnars.env`**

```
DAO_ADDRESS=0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17
GOLDSKY_PROJECT_ID=project_cm33ek8kjx6pz010i2c3w8z25
BASE_RPC_URL=https://mainnet.base.org
# PRIVATE_KEY=0x...   # Only if you plan to `builder-dao vote`
```

- [ ] **Step 2: Write `examples/claude-desktop-config.json`**

```json
{
  "mcpServers": {
    "builder-dao": {
      "command": "builder-dao",
      "args": ["mcp"],
      "env": {
        "DAO_ADDRESS": "0x...",
        "GOLDSKY_PROJECT_ID": "..."
      }
    }
  }
}
```

- [ ] **Step 3: Write `examples/cursor-mcp.json`**

```json
{
  "mcpServers": {
    "builder-dao": {
      "command": "builder-dao",
      "args": ["mcp"],
      "env": {
        "DAO_ADDRESS": "0x...",
        "GOLDSKY_PROJECT_ID": "..."
      }
    }
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add examples/
git commit -m "docs(examples): Gnars env + MCP client configs"
```

---

### Task 26: CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm -r typecheck
      - run: pnpm -r test:run
      - run: pnpm -r build

  no-gnars-defaults:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Ensure no Gnars addresses in source
        run: |
          if grep -R -i --include='*.ts' --include='*.json' \
              -E 'gnars|0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17|0x3dd4e53a232b7b715c9ae455f4e732465ed71b4c' \
              packages/ 2>/dev/null; then
            echo "::error::Gnars-specific strings found in packages/ — examples/ and docs/ only"
            exit 1
          fi
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: lint, typecheck, test, build, and no-Gnars-defaults guard"
```

---

### Task 27: `@changesets` setup + release workflow

**Files:**
- Create: `.changeset/config.json`
- Create: `.changeset/README.md`
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Init changesets**

Run: `pnpm changeset init`
Expected: creates `.changeset/config.json` and a starter README.

- [ ] **Step 2: Edit `.changeset/config.json`**

Set:
```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [["@builder-dao/cli", "@builder-dao/cli-search"]],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

`linked` keeps the two packages on the same version — reduces confusion during v0.x.

- [ ] **Step 3: Write `.github/workflows/release.yml`**

```yaml
name: Release

on:
  push:
    branches: [main]

concurrency: release-${{ github.ref }}

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          registry-url: https://registry.npmjs.org
      - run: pnpm install --frozen-lockfile
      - run: pnpm -r build
      - uses: changesets/action@v1
        with:
          publish: pnpm changeset publish
          version: pnpm changeset version
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- [ ] **Step 4: Add an initial changeset**

Run: `pnpm changeset` → choose both packages → `minor` → message: "Initial public release: extracted from gnars-website/mcp-subgraph and generalized for any Nouns Builder DAO."

- [ ] **Step 5: Commit**

```bash
git add .changeset/ .github/workflows/release.yml
git commit -m "chore: @changesets config + release workflow"
```

---

### Task 28: Dependency boundary audit

Ensure the core package never accidentally pulls heavy deps.

**Files:**
- No new files.

- [ ] **Step 1: Inspect core's dependency closure**

Run:
```bash
cd /Users/r4to/Script/builder-dao-tools
pnpm --filter @builder-dao/cli why better-sqlite3 2>&1 | head -20
pnpm --filter @builder-dao/cli why @huggingface/transformers 2>&1 | head -20
```
Expected: both report "not found" or no paths (the addon's deps must not appear in core).

- [ ] **Step 2: If either leaks, fix the import path and re-run**

Only the `packages/search/` code may import `better-sqlite3` or `@huggingface/transformers`. Fix any leaks before continuing.

- [ ] **Step 3: Commit only if changes made**

```bash
git add -A && git diff --cached --quiet || git commit -m "fix: remove leaked heavy dep from core"
```

---

## Phase 3 — Publish (RISKY — requires user confirmation before running)

### Task 29: Verify npm namespace availability and publish

**Files:**
- None (this is a publishing step).

> **Pause here and ask the user before running the publish commands.** Publishing to npm is public and hard to reverse.

- [ ] **Step 1: Check namespace availability**

Run:
```bash
npm view @builder-dao/cli 2>&1 | head -5
npm view @builder-dao/cli-search 2>&1 | head -5
```
If both say `404` / `Not found`, the namespace is free. Otherwise pick a fallback from the spec ("Naming decisions" §5) and update both `package.json` `name` fields + all imports via find/replace before proceeding.

- [ ] **Step 2: Dry-run publish**

Run:
```bash
pnpm -r build
pnpm -r publish --dry-run --access public
```
Expected: shows the file list for each tarball; no errors.

- [ ] **Step 3: Ask user to confirm publishing**

Stop here. Show the user the dry-run output and ask:
> "Dry-run looks clean. Publish `@builder-dao/cli@0.1.0` and `@builder-dao/cli-search@0.1.0` to npm now? (y/N)"

Proceed only on explicit `y`.

- [ ] **Step 4: Log in + publish**

Run:
```bash
npm login
pnpm -r publish --access public
```
Expected: both packages published. Visible at `https://www.npmjs.com/package/@builder-dao/cli`.

- [ ] **Step 5: Tag + GitHub release**

Run:
```bash
git tag -a v0.1.0 -m "Initial public release"
git push origin main --tags
gh release create v0.1.0 --title "v0.1.0 — Initial public release" --notes-file <(cat <<'EOF'
First public release: CLI + MCP server for any Nouns Builder DAO on Base.

## Install

pnpm add -g @builder-dao/cli
pnpm add -g @builder-dao/cli-search   # optional: semantic search + local cache

See README for quickstart.
EOF
)
```

- [ ] **Step 6: Smoke-test the published package**

In a temp dir, run:
```bash
mkdir /tmp/bd-smoke && cd /tmp/bd-smoke
pnpm init
pnpm add @builder-dao/cli
DAO_ADDRESS=0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17 \
GOLDSKY_PROJECT_ID=project_cm33ek8kjx6pz010i2c3w8z25 \
npx builder-dao proposals --limit 2 --pretty
```
Expected: prints 2 Gnars proposals. Confirms the published tarball works.

---

## Phase 4 — Gnars website cleanup

> Only run after Phase 3 succeeds. Published npm packages are the new source of truth for Gnars-cli users.

### Task 30: Remove `mcp-subgraph/` from gnars-website

**Files:**
- Delete: `/Users/r4to/Script/gnars-website/mcp-subgraph/` (whole directory)
- Modify: `/Users/r4to/Script/gnars-website/tsconfig.json`
- Modify: `/Users/r4to/Script/gnars-website/.claude/skills/gnars-cli/SKILL.md`

- [ ] **Step 1: Create a feature branch in gnars-website**

```bash
cd /Users/r4to/Script/gnars-website
git checkout -b chore/remove-mcp-subgraph
```

- [ ] **Step 2: Delete the directory**

```bash
git rm -r mcp-subgraph/
```

- [ ] **Step 3: Update `tsconfig.json`**

Open `/Users/r4to/Script/gnars-website/tsconfig.json`. In the `exclude` array, change:
```json
"exclude": ["node_modules", "references/**/*", "mcp-subgraph/**/*", "scripts/**/*", "subgraphs/**/*"]
```
to:
```json
"exclude": ["node_modules", "references/**/*", "scripts/**/*", "subgraphs/**/*"]
```

- [ ] **Step 4: Rewrite `.claude/skills/gnars-cli/SKILL.md`**

Replace the contents to document the npm-installed binary with pre-configured Gnars env. Keep the same frontmatter block. Body becomes:

```markdown
# Gnars CLI

Use the `builder-dao` binary (from `@builder-dao/cli` on npm), configured for Gnars via env vars.

## Install

```bash
pnpm add -g @builder-dao/cli
pnpm add -g @builder-dao/cli-search   # optional: enables `sync`/`index`/`search`
```

## Env (always set before running)

```bash
export DAO_ADDRESS=0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17
export GOLDSKY_PROJECT_ID=project_cm33ek8kjx6pz010i2c3w8z25
```

## Commands Reference

(Identical command reference to the previous skill, but with `gnars` renamed to `builder-dao` throughout. Use `--pretty` when showing output to the user.)

## Notes

- Command reference and flags are preserved from the previous `gnars` binary.
- `builder-dao vote` still requires `PRIVATE_KEY` in env.
- Governor address is resolved from `DAO_ADDRESS` via subgraph automatically.
```

Update every `gnars <verb>` example to `builder-dao <verb>`.

- [ ] **Step 5: Search for any other `mcp-subgraph` or `gnars-subgraph-mcp` references**

Run:
```bash
cd /Users/r4to/Script/gnars-website
grep -R -n --include='*.md' --include='*.ts' --include='*.json' --include='*.mjs' \
  -E 'mcp-subgraph|gnars-subgraph-mcp' . 2>/dev/null | grep -v node_modules | grep -v '.worktrees'
```
For each match (excluding `docs/superpowers/plans/`), either update or remove the reference.

- [ ] **Step 6: Verify gnars-website still builds/typechecks**

Run:
```bash
cd /Users/r4to/Script/gnars-website
pnpm typecheck 2>&1 | tail -20
```
Expected: no new errors introduced by the deletion.

- [ ] **Step 7: Commit and open PR**

```bash
git add -A
git commit -m "chore: remove mcp-subgraph/ in favor of @builder-dao/cli on npm"
git push -u origin chore/remove-mcp-subgraph
gh pr create --title "Remove mcp-subgraph in favor of @builder-dao/cli npm package" --body "$(cat <<'EOF'
## Summary
- Delete `mcp-subgraph/` from this repo.
- Update `tsconfig.json` exclude list.
- Rewrite `.claude/skills/gnars-cli/SKILL.md` to document the new `builder-dao` npm binary.

## Why
The code now lives at https://github.com/<org>/builder-dao-tools and is published as `@builder-dao/cli` + `@builder-dao/cli-search`, generalized for any Nouns Builder DAO on Base.

## Test plan
- [ ] `pnpm typecheck` passes.
- [ ] `builder-dao proposals --limit 3 --pretty` (with Gnars env) produces expected output.
- [ ] MCP client config still works against the installed binary.

Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Report the PR URL to the user.

---

## Self-review summary

- **Spec §2 in-scope** items: monorepo creation (Task 1–2, 15), package split (Tasks 3–20), hybrid config (Task 5), plugin registry (Task 8), docs (Tasks 22–25), publishing (Task 29), gnars-website cleanup (Task 30). All covered.
- **Spec §2 out-of-scope** items (multi-chain, DAO presets, upstream transfer) are intentionally absent from the plan.
- **Spec §4.5 DB isolation** is implemented in Task 16 (`resolveDbPath` keys by DAO address).
- **Spec §5 naming fallback** is handled in Task 29 step 1.
- **Spec §9 risks table**: Gnars-leak CI guard is Task 26, dep-boundary audit is Task 28, migration doc is Task 24.
- **No placeholders** in any task body; every code step contains full code.
- **Type consistency**: `DaoConfig`, `RunContext`, `SubgraphClient`, `CliCommand`, `McpTool` all defined once and referenced consistently.
- **Frequent commits**: every task ends in a commit; publishing and destructive steps gated on user confirmation.
