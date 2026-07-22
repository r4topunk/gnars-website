# Gnars Migration — implementation & verified protocol facts

Status of the `/migrate` page and the on-chain facts it's built against. Companion to
`gnars-token-migration.md` (strategy) and `gnars-migration-decisions.md` (decision checklist).

## Goal (unchanged)

Move $gnars off Zora onto Clanker and drop ZORA from the path:
`ETH ↔ ZORA ↔ old $gnars ↔ content coins` → `ETH ↔ new $gnars ↔ content coins`.

## Key token facts (verified on-chain)

- **old $gnars** `0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b` — a Zora **Creator Coin**,
  paired with **ZORA** in a Uniswap **V4** pool, hook
  `0xd61A675F8a0c67A73DC3B54FB7318B4D91409040` (Zora CreatorCoinHook, does not restrict swappers).
- **ZORA** `0x1111111111166b7FE7bd91427724B487980aFc69` — the routing hub for every Zora coin.
- Content coins pair with their creator coin; creator coins pair with ZORA (nested topology, confirmed).
- Liquidity is thin and mostly **protocol-owned** (Zora multicurve): old $gnars pool ≈ $3K,
  skatehacker ≈ $5K, most content coins <$300. Creators hold _tokens_, not the LP position.

## Migration engine: Upgrader (verified, not ours)

- Core contract (verified source, Base): **`0x999Cd4Dcb412A8272a62BeeB271662d1C72d3c7e`**.
  Reader lens: `0x76a51fBC42e932ed3a5e1Ec413a7E03a3EC800AE`. ABI dumped during research.
- Flow: `schedule(tokens)` (onlyOwner) → users `deposit(id,user,token,amt,donation)` → `execute(...)`
  (onlyOwner: sells all deposits via a per-token route registry, then deploys the new token on
  Clanker and dev-buys it) → `claim(id,user)` pro-rata to each depositor's sale proceeds.
- **Sells Zora V4 hooked pools** (no aggregator) — proven in production. Old $gnars is routable
  (gnars→ZORA→WETH), but no Zora coin has been routed live yet; routes are set manually by the operator.
- New token comes out **WETH-paired** (deployer hardwired to WETH) — matches our goal state.
- **Risks:** operator-run (`schedule`/`execute` are onlyOwner EOA); router+deployer bytecode unverified;
  **partial fills** on thin pools (a past upgrade sold ~33% and left the rest with the operator);
  no on-chain deadline (timing coordinated socially). Deposit/claim UI is self-hostable against the
  verified contract.
- **No native ETH/presale.** USDC was accepted before, so a **WETH deposit lane** is the closest
  "contribute fresh capital" path — and the one that dominates proceeds given thin token liquidity.
  Clanker's own presale extensions exist but aren't needed: Upgrader's deposit→dev-buy already
  gives everyone one shared entry price.

## Interim temp multisig (operational decision)

Migration proceeds, the Clanker **founder-vault** allocation, and collected fees route to a
**temporary DAO multisig** during the migration — avoiding a governance proposal per step — then
sweep to the treasury in one governed move at the end. Encoded as `MIGRATION_MULTISIG` in
`src/lib/config.ts` (env `NEXT_PUBLIC_MIGRATION_MULTISIG`). Address:
**`0xBe6C3D651d2F6e9eFA562b5a7CDf411304cad076`** — verified on-chain as a Safe v1.3.0 (3-of-N) on
Base. This is also the address to set as the Upgrader founder-vault beneficiary.

## What's built on `/migrate`

- Tabs: **Consolidate** (Zora-only, scam-filtered holdings via `getProfileBalances`; multi-select;
  live quotes coin→ZORA→$gnars; per-coin + grouped route map; burn/slippage preview),
  **Get $GNARS** (buy old $gnars with ETH via `useTradeCreatorCoin` — Zora router, works where 0x can't),
  **Guide** (4-step tutorial, EN + PT-BR).
- Data layer: `src/hooks/use-gnars-migration.ts`. Config: `src/lib/config.ts`.

## Not built yet (deliberately)

- **Batch-sell execution** — moves user funds; needs the sell-side Permit2 / SA-batch spike + testing first.
- **Upgrader deposit/claim UI** — blocked on a scheduled `upgradeId` and coordination with the operator.

## Open asks for the Upgrader / Clanker team (@kompreni / @niftytime / Jack)

1. Register the **gnars→ZORA→WETH** route (2-hop; confirm route chaining).
2. How are **partial-fill leftovers** handled on thin pools?
3. Add a **WETH deposit lane** (fresh-capital contribution path).
4. Set the **founder-vault beneficiary = temp multisig** (`MIGRATION_MULTISIG`); confirm vault %, vesting, fees.
5. Timing for `schedule`/`execute`; confirm we can **self-host** deposit/claim UI against `0x999C…3c7e`.
