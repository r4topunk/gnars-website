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

## Allocations / distribution (proposed — DAO to ratify)

Supply proposed **100B** (Clanker standard, 100× the old 1B). Proposed split of the new supply — these
are starting numbers to debate, not decisions:

| Bucket                        | Proposed % | Notes                                                                                                            |
| ----------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------- |
| **Liquidity / public (pool)** | ~55%       | Placed single-sided by the Clanker factory. Migrators + the ETH presale buy from this at launch via the dev-buy. |
| **Founder vault / treasury**  | ~30%       | Locked, ~7-day vesting. Beneficiary = temp multisig → DAO treasury.                                              |
| **Airdrop (snapshot)**        | ~15%       | Merkle airdrop to qualifying holders (see below), ~1-day lockup.                                                 |

**Guiding principle (from the community review):** dust migration is negligible (~$5–15k community-wide,
median member holds $0, and the $gnars pool can't absorb it). So **reward the community via the airdrop**
and **back the token via the ETH presale** — do _not_ over-weight per-token dust migration. Depositor
allocations from migrating are pro-rata to actual sale proceeds, which for dust is ~nothing; that's fine
because the airdrop is what makes holders whole.

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

## ETH presale mechanics

The "ETH presale" is **not a separate contract** — it's the WETH deposit lane inside the same Upgrader
upgrade. It's what gives the new token real backing (dust can't).

1. **Deposit window:** contributors deposit **ETH/WETH** (and/or old $gnars) into the upgrade.
2. **Execute (one tx):** the Upgrader sells token deposits, combines with the deposited ETH, deploys new
   $gnars on Clanker, and runs a **dev-buy** (`ClankerUniv4EthDevBuy`) that swaps the pooled ETH into new
   $gnars **inside the deploy tx** — so the ETH lands in the pool as real liquidity and everyone enters at
   **one shared, snipe-proof price**.
3. **Claim:** depositors claim new $gnars pro-rata to their share of proceeds (ETH contributors get $gnars
   proportional to their ETH).
4. **Anti-MEV:** single-tx dev-buy = one price for all; Clanker MEV modules cover the first ~2 minutes.

Tools: **Upgrader** (engine + WETH lane) · **Clanker** (deploy + dev-buy + vault + MEV) · **gnars.com**
self-hosted deposit/claim UI · **temp multisig** (vault beneficiary → treasury). No custom presale
contract or PartyDAO needed.

**Open params to confirm with kompreni:** min/max raise, per-wallet ETH cap, and the **refund path if the
minimum isn't met**. Timing is coordinated socially (no on-chain deadline).

## Airdrop / snapshot (proposed)

Reward the community without needing their thin liquidity: a merkle airdrop of the ~15% bucket to a
**snapshot taken at a block _before_ the announcement** (anti-gaming). Delivered via `ClankerAirdrop`
(same deploy, if the Upgrader's deployer exposes it) or a separate post-launch airdrop.

Qualifying sets (to finalize):

- Holders of **old $gnars** (the Zora creator coin).
- Holders of the **selected Gnars creator coins** (`GNARS_CREATOR_ALLOWLIST` + the curated creators list)
  and **Gnars-channel content coins**.
- Optionally **Gnars NFT holders** (the governance/community layer).

**Weighting (DAO decision):** value is concentrated in a few wallets and most members hold $0, so a purely
value-weighted airdrop would concentrate heavily. Consider a **blended** model — a flat base per qualifying
holder + a value-weighted top-up — to reward broad participation, not just the largest holders.

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

1. **Pre-migration (now):** campaign people into old $gnars / holding; `/migrate` hub live as a hidden
   route and Farcaster mini app; `/create-coin` unlisted so no new content coins are spun up.
2. **Migration:** kompreni `schedule`s + `execute`s the upgrade; deposit/claim portal on the site.
3. **Post-migration:** point content coins at new $gnars; re-list `/create-coin` and `/migrate` nav;
   sweep the multisig to treasury.

## Open decisions (DAO)

Supply (100B?), distribution %s (above), airdrop criteria, how to treat existing Zora content coins,
comms plan, and who drafts the on-chain proposal. Ratify before the on-chain proposal.
