# export-creator-liquidity

Exports two CSVs that snapshot every Gnars DAO member's Zora-created coins and
their pool liquidity, sourced from GeckoTerminal. The intended use is to
prioritize creator outreach for the upcoming liquidity migration to the new
Gnars token on Clanker.

## Run

```bash
# from the main repo (where node_modules + .env.local live)
pnpm tsx scripts/export-creator-liquidity.ts
```

CSVs land in `output/`. Intermediate JSON caches land in `output/cache/`. To
force a refresh of one stage, delete that stage's cache directory:

```bash
rm -rf output/cache/profile-coins   # re-fetch Zora coins per member
rm -rf output/cache/gecko-pools     # re-fetch pool TVL
rm -f  output/cache/members.json    # re-fetch DAO members
rm -f  output/cache/farcaster.json  # re-fetch Farcaster profiles
rm -f  output/cache/ens.json        # re-fetch ENS names
```

Hitting `Ctrl+C` is safe — every stage persists progress, so a rerun resumes
from where it stopped.

## Required env (in `.env.local`)

| Variable                         | Required?   | Notes                                                                  |
| -------------------------------- | ----------- | ---------------------------------------------------------------------- |
| `NEXT_PUBLIC_GOLDSKY_PROJECT_ID` | yes         | Builder DAO subgraph                                                   |
| `NEXT_PUBLIC_ZORA_API_KEY`       | recommended | raises Zora API rate limits                                            |
| `ALCHEMY_API_KEY`                | recommended | mainnet ENS reverse lookup                                             |
| `NEYNAR_API_KEY`                 | optional    | Farcaster username, bio, follower count, Twitter via verified accounts |
| `GECKOTERMINAL_API_KEY`          | optional    | paid tier; without it the run is throttled to ~30 req/min              |

Without an Alchemy or Neynar key, those columns are blank — the run still
completes.

## Stages

1. **Members** — paginates `daotokenOwners` from the Builder DAO subgraph.
2. **ProfileCoins** — `getProfileCoins` per member, paginates via `after` cursor up to 10 pages × 50 coins.
3. **Pools** — GeckoTerminal `/networks/base/tokens/{coin}/pools` for each unique coin, picks the pool with the highest `reserve_in_usd`.
4. **Creators** — Neynar `bulk-by-address` and viem mainnet `getEnsName` only for members who have ≥1 created coin.
5. **CSVs** — aggregates per creator, writes both files with a timestamp suffix.

## Output files

### `creators-YYYYMMDD-HHMMSS.csv`

One row per creator who has at least one created coin. Sorted by `total_tvl_usd` desc.

| Column                    | Notes                                                             |
| ------------------------- | ----------------------------------------------------------------- |
| `creator_address`         | DAO member address (lowercase)                                    |
| `creator_ens`             | mainnet ENS name (if any)                                         |
| `creator_farcaster`       | Neynar-resolved Farcaster username                                |
| `creator_twitter`         | Zora-linked Twitter > Farcaster verified accounts > coin metadata |
| `creator_email`           | best-effort regex on Farcaster bio + Zora handles (often blank)   |
| `creator_gnars_held`      | NFT count from subgraph                                           |
| `creator_delegate`        | who they delegated to (lowercase)                                 |
| `coins_count`             | total created coins matched to this creator                       |
| `coins_with_liquidity`    | coins where pool TVL > $0                                         |
| `total_tvl_usd`           | sum of `reserve_in_usd` across all their pools                    |
| `gnars_paired_tvl_usd`    | sum of TVL where pool currency is the Gnars creator coin          |
| `top_coin_symbol`         | symbol of the coin with the highest TVL                           |
| `top_coin_tvl_usd`        | TVL of that top coin                                              |
| `migration_priority_tier` | `high` (≥$10k), `med` (≥$1k), `low` (>$0), `none`                 |

### `coins-YYYYMMDD-HHMMSS.csv`

One row per created coin. Sorted by `is_gnars_paired` desc, then `pool_tvl_usd` desc.

| Column                     | Notes                                                                          |
| -------------------------- | ------------------------------------------------------------------------------ |
| `creator_address`          |                                                                                |
| `creator_ens`              |                                                                                |
| `creator_farcaster`        |                                                                                |
| `coin_address`             | Zora content coin address (lowercase)                                          |
| `coin_name`                |                                                                                |
| `coin_symbol`              |                                                                                |
| `coin_created_at`          | ISO timestamp from Zora                                                        |
| `is_gnars_paired`          | `true` if pool currency address = `0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b` |
| `has_liquidity`            | `true` if pool `reserve_in_usd` > 0                                            |
| `pool_address`             | Uni V4 / Uni V3 pool                                                           |
| `pool_url`                 | GeckoTerminal explorer link                                                    |
| `backing_currency_symbol`  | from Zora `poolCurrencyToken.name` falling back to Gecko quote symbol          |
| `backing_currency_address` |                                                                                |
| `pool_tvl_usd`             | sum of both sides of the pool, USD                                             |
| `base_reserve_usd`         | one-side approx (≈ TVL/2; Gecko doesn't expose exact split)                    |
| `quote_reserve_usd`        | one-side approx (≈ TVL/2)                                                      |
| `market_cap_usd`           | from Gecko, falling back to Zora                                               |
| `volume_24h_usd`           |                                                                                |
| `total_volume_usd`         | lifetime, from Zora                                                            |
| `price_usd`                | Zora `tokenPrice.priceInUsdc`                                                  |
| `holders_count`            | Zora `uniqueHolders`                                                           |
| `fee_bps`                  | pool fee in basis points                                                       |
| `dex`                      | Gecko DEX id (e.g. `uniswap-v4`)                                               |
| `zora_url`                 | `https://zora.co/coin/base:{address}`                                          |

## Caveats

- **Per-side reserves are approximations.** GeckoTerminal exposes the total
  pool USD reserve but not the split. The script reports `≈ TVL/2` for each
  side; this is accurate for balanced V3/V4 ranges but skewed for one-sided
  Doppler-style launches. For migration decisions, use `pool_tvl_usd` as the
  authoritative number.
- **Creator filter.** The script only includes a coin if `coin.creatorAddress`
  matches the DAO member's address. Members who hold Gnars NFTs at one address
  but deploy Zora coins from a different wallet will be missed. If that
  becomes a gap, drop the `if (creatorAddr !== m.owner) continue;` check in
  `buildCoinRows` and let coins flow under the address Zora reports.
- **Email column is best-effort.** Zora and Farcaster don't expose email
  directly; the script regex-scans bio text. Most rows will be blank.
- **Free-tier GeckoTerminal is slow.** Expect ~3–5 minutes per 100 unique
  coins on the free tier. Set `GECKOTERMINAL_API_KEY` for a paid tier if you
  need it faster.
