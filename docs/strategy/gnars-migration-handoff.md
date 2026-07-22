# Gnars Migration — handoff for kompreni

Hey kompreni 👋 — this is the gnars.com side of the Zora → Clanker $gnars migration. It's built,
merged to `main`, and live as a **hidden route** (`/migrate`, unlisted in nav) for testing. Below is
what we built, what we need from you, and copy-paste prompts for your AI to finish the two remaining
pieces on our repo.

Repo: `r4topunk/gnars-website` · Route: `/migrate` (Next.js 16 App Router, thirdweb v5 + wagmi + `@zoralabs/coins-sdk`).

## What we built (working today)

A `/migrate` hub with three tabs:

- **Consolidate** — pulls the user's Zora coins from Zora's indexer (`getProfileBalances`, `excludeHidden`)
  so only real coins show (scams/airdrops/random ERC-20s are filtered out). Multi-select, live quotes,
  a step-by-step **route map**, and **sequential execution** that converts the selected coins into old
  **$gnars**. Routing is per coin: **gnars-paired coins swap straight to $gnars (one hop); everything
  else goes coin → ZORA → then one ΣZORA → $gnars.**
- **Get $GNARS** — buy old $gnars with ETH (via the Zora router — works where 0x/Matcha can't route the
  V4 creator-coin pool).
- **Guide** — a 4-step tutorial (Convert → Hold → Deposit → Claim), EN + PT-BR.

Swaps sign via `useWriteAccount` → the user's **EOA** for external wallets (not the sponsored-but-empty
smart account). **Verified on-chain:** a real run converted LUNCH/KCFPFD/GDROP/GNARgentina2 directly to
$gnars and mlibty via ZORA→$gnars, all in clean single txns.

Key files:

- `src/app/[locale]/migrate/{page,MigrateTabs,MigrationWidget,GetGnarsWidget}.tsx`
- `src/hooks/{use-gnars-migration,use-execute-migration,use-trade-creator-coin}.ts`
- `src/lib/config.ts` — addresses + `MIGRATION_MULTISIG` + `MIGRATION_TRADE_REFERRER`
- messages: `messages/{en,pt-br}/migrate.json`

## What we need from you (the Upgrader / Clanker side)

1. **`schedule` + `execute` the upgrade** for old $gnars (`0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b`).
   You confirmed you'll do this — let's coordinate a date/time (no on-chain deadline, so it's social).
2. **Register the sell route** `gnars → ZORA → WETH` (V4 hooked pool, hook `0xd61A675F8a0c67A73DC3B54FB7318B4D91409040`).
   Confirm 2-hop chaining works.
3. **Add the WETH deposit lane** so people can contribute fresh ETH/WETH (the "party" capital path).
4. **Tokenomics** (we'll confirm final numbers): swap fee **1%**, treasury/vault **30%**, vesting **7 days**,
   **founder-vault beneficiary = our temp multisig `0xBe6C3D651d2F6e9eFA562b5a7CDf411304cad076`**
   (verified Safe 3-of-N on Base; it sweeps to the DAO treasury at the end).
5. Give us the **`upgradeId`** once scheduled, and the **new $gnars token address** after `execute`.

## Two tasks to finish on our repo — prompts for your AI

Both are scoped so your AI can pick them up in `r4topunk/gnars-website`. Please follow the repo
conventions (bottom of this doc).

### Task A — Upgrader deposit/claim portal (needs the `upgradeId`)

> In the gnars-website repo, add a 4th tab "Deposit" to `src/app/[locale]/migrate/MigrateTabs.tsx`
> that lets users deposit old $gnars into the Upgrader and claim the new token, self-hosted (kompreni
> wants it here, not upgrader.co). Use the verified Upgrader contract on Base
> `0x999Cd4Dcb412A8272a62BeeB271662d1C72d3c7e` and the reader `0x76a51fBC42e932ed3a5e1Ec413a7E03a3EC800AE`.
> Flow: `ERC20.approve(upgrader, amount)` → `deposit(upgradeId, user, token, amount, false)`;
> `withdraw(...)` before execute; `claim(upgradeId, user)` after. Read status with
> `getBuyToken/getSellProceeds/getBuyProceeds/getUserClaim` and per-user data via `UpgraderReader`.
> Take the `upgradeId` from an env/config constant. Sign via `useWriteAccount` (see
> `src/hooks/use-execute-migration.ts` for the thirdweb + viem pattern). Mirror the existing tab UI.
> ⚠️ Show a warning: unsold leftovers are stuck forever, so steer thin holders to the WETH lane.

Grab the full Upgrader ABI from the contract on Basescan/Blockscout (it's verified).

### Task B — capture the Zora trade-referrer fee → fund $gnars buyback/burn

> In gnars-website, make the migration + Get-$GNARS swaps attribute a Zora **trade referrer** so the
> fee accrues to `MIGRATION_TRADE_REFERRER` (in `src/lib/config.ts`, = haxixe.eth). Problem: the Zora
> SDK's `tradeCoin`/`createTradeCall` do NOT forward a referrer. So POST directly to
> `https://api-sdk.zora.engineering/quote` with `referrer` in the body (the `PostQuoteData.body.referrer`
> field), then execute the returned `call` ({target,value,data} + permits) via the viem walletClient —
> handling the Permit2 signatures for ERC-20 sells (ETH sells need no permit). Replace the internal
> `tradeCoin` calls in `use-execute-migration.ts` and `use-trade-creator-coin.ts` with this referred
> path, keeping the current behavior as a fallback if the referred quote fails. Test with a tiny amount.

Context on the buyback: we removed the old per-trade "1% burn" (it was never implemented — misleading).
The intended flywheel is now: **referrer fees accrue to haxixe.eth → periodically claim in Zora → buy
$gnars → burn.** That's DAO revenue from Zora's fee, not a tax on migrators. Per-trade buying is too
gas-heavy; batch it.

(Optional Task C: atomic one-tx batching of the Consolidate sells — thirdweb SA
`sendBatchTransaction` with Permit2, so it's one signature instead of one per coin.)

## Repo conventions (please follow)

- Branch from `main`, open a **PR** (no direct commits to `main`).
- `pnpm lint` + `pnpm format:check` before PR; new UI strings via next-intl in **both** en + pt-br.
- Verify at runtime (`pnpm dev` → `/en/migrate`) before marking done.
- Full guide: `CLAUDE.md`. Companion docs: `gnars-migration-implementation.md` (verified on-chain facts),
  `gnars-token-migration.md` (strategy), `gnars-migration-decisions.md` (open decisions).

Thanks 🙏 — ping Vlad (haxixe.eth) to coordinate the schedule/execute timing.
