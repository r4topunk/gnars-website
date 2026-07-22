# $gnars Token — product spec (Zora → Clanker migration)

The product spec for the new $gnars token and the migration that produces it. Companion to
`gnars-migration-handoff.md` (what's built on the site + tasks for the Upgrader team). Supersedes the
earlier `gnars-token-migration.md` / `gnars-migration-decisions.md` / `gnars-migration-implementation.md`
(consolidated here; still in git history).

## Goal

Move $gnars off Zora onto **Clanker** and drop ZORA from the token graph:

- Now: `ETH ↔ ZORA ↔ old $gnars (Zora creator coin) ↔ content coins`
- Target: `ETH ↔ new $gnars (Clanker) ↔ content coins`

One strong DAO token, backed by the community's creators + content — not value fragmented across
dozens of thin creator/content coins.

## Current state (old token)

- **old $gnars** `0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b` — Zora Creator Coin on Base, 18 decimals,
  **1,000,000,000 (1B)** supply. Paired with ZORA in a thin Uniswap V4 pool (~$3–5K). Treasury holds
  ~562,256 (~0.056%).
- Content coins are paired with their creator coin; creator coins with ZORA (all thin/illiquid).
- DAO on Base: Governor `0x3dd4e53a232b7b715c9ae455f4e732465ed71b4c`, Treasury
  `0x72ad986ebac0246d2b3c565ab2a1ce3a14ce6f88`, NFT `0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17`.

## New token (Clanker)

- **Deployed via Clanker** (through the Upgrader's deployer), **WETH-paired** — this is the `ETH ↔ GNARS`
  future. Launches with single-sided token liquidity placed by the Clanker factory (no ETH needed to
  seed the pool).
- **Supply:** proposed **100B** (Clanker standard; 100× the old 1B). — _open, see below._

## Tokenomics (kompreni's standards; DAO to ratify)

- **Swap fee:** ~**1%** on trades.
- **Treasury / founder vault:** ~**30%** of supply, locked/vesting to the DAO, with **~7-day vesting**.
  Beneficiary = the interim migration multisig (below), which sweeps to the DAO treasury at the end.
- **Buy-and-burn flywheel:** the Zora **trade-referrer** on migration/buy swaps is set to
  `MIGRATION_TRADE_REFERRER` (haxixe.eth). Those referral rewards fund a periodic **claim → buy $gnars →
  burn**. This is DAO revenue from Zora's fee, not a tax on migrators. (The old per-trade "1% burn" idea
  was dropped — it was never on-chain.)

## Allocations / distribution (OPEN — needs DAO sign-off)

The Upgrader mints the new token and distributes to depositors pro-rata to their sale proceeds; the rest
is split per the deploy config. Percentages to finalize:

- Existing-holder migration (deposit old $gnars → claim new): \_\_\_\_%
- Airdrop by contribution / snapshot of key creator+content coin holders: \_\_\_\_%
- Treasury / vault reserve: ~30% (see tokenomics)
- Initial liquidity on Clanker: \_\_\_\_%
- Ops / team (if any): \_\_\_\_%

Note: proceeds from selling deposited coins are **capped by pool depth** (the old $gnars pool is thin),
so fresh **ETH/WETH via the deposit lane** is the real backing — the value engine, not the dust.

## Migration mechanics

Runs through **Upgrader** (Onchain Inc, verified on Base `0x999Cd4Dcb412A8272a62BeeB271662d1C72d3c7e`,
reader `0x76a51fBC42e932ed3a5e1Ec413a7E03a3EC800AE`):

1. `schedule(tokens)` → users `deposit(upgradeId, user, token, amt, false)` → `execute(...)` (sells all
   deposits, deploys the new token on Clanker, dev-buys it) → `claim(upgradeId, user)` pro-rata.
2. Upgrader can sell Zora V4 hooked pools (register the **gnars→ZORA→WETH** route). Old $gnars is
   sellable this way.
3. **WETH deposit lane** for fresh-capital contributions (the "party" path) — the real backing.
4. ⚠️ **Unsold leftovers are stuck forever** — so thin content coins deposited raw can lose their unsold
   portion; steer users to convert first or contribute WETH.

## Interim migration multisig

`0xBe6C3D651d2F6e9eFA562b5a7CDf411304cad076` — verified Safe (v1.3.0, 3-of-N) on Base. Interim
operational signer: receives migration proceeds + founder-vault + fees during the migration (no
per-step governance proposal), then sweeps everything to the DAO treasury at the end. Config:
`MIGRATION_MULTISIG` (`src/lib/config.ts`).

## Verified addresses

| Thing                          | Address                                      |
| ------------------------------ | -------------------------------------------- |
| old $gnars (Zora creator coin) | `0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b` |
| ZORA (routing hub)             | `0x1111111111166b7FE7bd91427724B487980aFc69` |
| Upgrader                       | `0x999Cd4Dcb412A8272a62BeeB271662d1C72d3c7e` |
| UpgraderReader                 | `0x76a51fBC42e932ed3a5e1Ec413a7E03a3EC800AE` |
| Migration multisig (temp)      | `0xBe6C3D651d2F6e9eFA562b5a7CDf411304cad076` |
| Trade referrer (haxixe.eth)    | `0x8Bf5941d27176242745B716251943Ae4892a3C26` |
| DAO treasury                   | `0x72ad986ebac0246d2b3c565ab2a1ce3a14ce6f88` |

## Phases

1. **Pre-migration (now):** campaign people into old $gnars / holding; `/migrate` hub live (hidden route
   - Farcaster mini app); `/create-coin` unlisted so no new content coins are spun up.
2. **Migration:** kompreni `schedule`s + `execute`s the upgrade; deposit/claim portal on the site.
3. **Post-migration:** point content coins at new $gnars; re-list `/create-coin` and `/migrate` nav;
   sweep the multisig to treasury.

## Open decisions (DAO)

Supply (100B?), distribution %s (above), airdrop criteria, how to treat existing Zora content coins,
comms plan, and who drafts the on-chain proposal. Ratify before the on-chain proposal.
