# Gnars Migration — handoff for review / completion

For @kompreni / @niftytime (Upgrader / Onchain Inc) to review or complete the gnars.com side of the
migration. Companion docs: `gnars-migration-implementation.md` (verified facts),
`gnars-token-migration.md` (strategy), `gnars-migration-decisions.md` (open decisions).

## TL;DR

Branch `feat/gnars-migration` adds a `/migrate` page. The **on-ramp** (convert Zora coins → old
$gnars — quotes + sequential execution), the **Get $GNARS** buy, and a **guide** are built and
working. The remaining piece is the **self-hosted Upgrader deposit/claim portal**, which is blocked
only on kompreni scheduling the upgrade (needs the `upgradeId` + new-token address) — that's the part
to complete after the new token exists.

## Run locally

```bash
pnpm install
pnpm dev            # http://localhost:3000/en/migrate
```

Env needed: `NEXT_PUBLIC_ZORA_API_KEY`, `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` (see `.env.example`).
Optional: `NEXT_PUBLIC_MIGRATION_MULTISIG` (interim recipient; defaults to the verified aux
Safe `0xBe6C3D651d2F6e9eFA562b5a7CDf411304cad076`).

## What's built (working)

| Area                                                                                                                                            | File                                              | State                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------- |
| Route + tabs (Consolidate / Get $GNARS / Guide)                                                                                                 | `src/app/[locale]/migrate/{page,MigrateTabs}.tsx` | done                                                                  |
| Consolidate: Zora-only, scam-filtered holdings; multi-select; live quotes coin→ZORA→$gnars; per-coin + grouped route map; burn/slippage preview | `src/app/[locale]/migrate/MigrationWidget.tsx`    | done (read/quote)                                                     |
| Consolidate **execution** — sequential: each coin → ZORA, then ΣZORA → $gnars, with per-step progress                                           | `src/hooks/use-execute-migration.ts`              | done (sequential; untested with real funds — needs a live smoke test) |
| Get $GNARS: buy old $gnars with ETH (Zora router)                                                                                               | `src/app/[locale]/migrate/GetGnarsWidget.tsx`     | done                                                                  |
| Guide: 4-step tutorial, EN + PT-BR                                                                                                              | `messages/{en,pt-br}/migrate.json`                | done                                                                  |
| Data layer (holdings, quotes, route model)                                                                                                      | `src/hooks/use-gnars-migration.ts`                | done                                                                  |
| Config (addresses, burn bps, temp multisig)                                                                                                     | `src/lib/config.ts`                               | done                                                                  |

Wallet layer: thirdweb v5 for writes (`useWriteAccount`, sponsored SA), wagmi for reads.
Holdings via Zora `getProfileBalances(excludeHidden)`. Quotes via `@zoralabs/coins-sdk`
`createTradeCall`.

## What's NOT built — the main task for kompreni to finish

**Self-hosted Upgrader deposit/claim portal.** kompreni confirmed: host it here (not upgrader.co),
and he'll `schedule` + `execute` the upgrade himself. **Blocked only on the new token existing** —
once kompreni schedules the upgrade you get an `upgradeId`, and after `execute` the new $gnars address.
Then build against the verified Upgrader `0x999Cd4Dcb412A8272a62BeeB271662d1C72d3c7e`
(reader `0x76a51fBC42e932ed3a5e1Ec413a7E03a3EC800AE`):

- deposit = `ERC20.approve(upgrader, amt)` → `deposit(upgradeId, user, token, amt, false)`
- `withdraw(...)` pre-execute; `claim(upgradeId, user)` post-execute
- status via `getBuyToken/getSellProceeds/getBuyProceeds/getUserClaim`; UI data via `UpgraderReader`
- add it as a 4th tab on `/migrate` (mirror the existing tab pattern in `MigrateTabs.tsx`)

Also pending: **atomic one-tx batching** of the Consolidate sells (currently sequential — one
signature per coin). Optimization via thirdweb SA `sendBatchTransaction` + Permit2, not required for v1.

## kompreni's confirmed answers (gnars ⇄ upgrader chat)

1. **gnars→ZORA→WETH route** — kompreni registers it **closer to launch**.
2. **Partial fills** — ⚠️ **leftover unsold tokens are stuck in the Upgrader forever.** So depositing
   thin content coins raw risks permanent loss of the unsold portion → steer users to convert to old
   $gnars first (our tool) and/or contribute via the WETH lane (sells fully). Reflect this in the deposit UI.
3. **WETH deposit lane** — yes, will be added (fresh-capital path).
4. **Tokenomics to finalize (DAO decision):** swap fee **~1%** (standard), **~30%** of supply to
   treasury/vault (standard), vesting **~7 days**. Vault beneficiary = temp multisig `MIGRATION_MULTISIG`
   (`0xBe6C3D651d2F6e9eFA562b5a7CDf411304cad076`, verified Safe 3-of-N on Base).
5. **Ops** — kompreni does `schedule`/`execute`; coordinate date/time; self-hosting the UI is welcome.

## Repo conventions (please follow)

PR to `main` (no direct commits); `pnpm lint` + `pnpm format:check` before PR; new UI strings go
through next-intl in **both** en + pt-br; verify at runtime (`pnpm dev`) before marking done.
Full guide: `CLAUDE.md`.
