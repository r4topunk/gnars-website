# Zora Coins – Research Index

_Last updated: 2025-11-18_

This document collects the canonical, up-to-date context for the **Zora Coins Protocol** (the “every post is a coin” system on Zora), and points to the full docs, contracts, and ABIs you need to investigate behavior.

---

## 0. High-Level Orientation

- Zora is an onchain social network where **every post becomes a coin**, i.e. an ERC-20-like token tied to content or a creator profile.:contentReference[oaicite:0]{index=0}  
- Coins trade on Uniswap under the hood, and creators earn a share of fees paid in **$ZORA**.:contentReference[oaicite:1]{index=1}  
- There are two main coin types:  
  - **Creator Coins** – profile-level tokens (1B supply, vesting, ZORA-backed).:contentReference[oaicite:2]{index=2}  
  - **Content Coins** – per-post tokens, backed by ETH / ZORA / creator coins and routed via Uniswap v4.:contentReference[oaicite:3]{index=3}  

The canonical implementation lives in the public monorepo:

- GitHub monorepo: **`ourzora/zora-protocol`**:contentReference[oaicite:4]{index=4}  

> **Local goal:** clone this monorepo and treat `packages/coins` as the source of truth for contracts + ABIs, and `docs/` (plus docs.zora.co) as the source of protocol docs.

---

## 1. Official Docs (Zora Coins)

### 1.1 Entry point

- **Zora Docs home:**  
  - https://docs.zora.co/ :contentReference[oaicite:5]{index=5}  
- **Zora Coins Protocol section:**  
  - https://docs.zora.co/coins :contentReference[oaicite:6]{index=6}  

From the docs home you get direct links to:

- **Coins SDK** – API surface to create/query coins  
- **Coins Protocol** – conceptual / contract docs  
- **Rewards, fees, hooks, migration**  

---

### 1.2 Contract-level docs (Coins)

Key pages you will want in full:

- **Protocol overview (Coins):**  
  - https://docs.zora.co/coins (orientation, concepts, protocol roles):contentReference[oaicite:7]{index=7}  

- **Contract architecture:**  
  - https://docs.zora.co/coins/contracts/architecture :contentReference[oaicite:8]{index=8}  
  - Shows the graph of contracts: `CreatorCoin`, `ContentCoin`, `ZoraV4CoinHook`, `ZoraFactory`, `ProtocolRewards`, Uniswap `PoolManager`, etc.

- **Creating a coin (direct contracts):**  
  - https://docs.zora.co/coins/contracts/creating-a-coin :contentReference[oaicite:9]{index=9}  
  - Details:  
    - `ZoraFactory` address on Base / Base Sepolia  
    - `deploy` and `deployCreatorCoin` signatures  
    - `coinAddress` helper for deterministic address prediction  
    - Parameters, poolConfig semantics (version, backing currency, curve, supply distribution)  
    - Events: `CoinCreated`, `CoinCreatedV4`, `CreatorCoinCreated` with indexing guidance.

- **Coin rewards / fees (V4):**  
  - https://docs.zora.co/coins/contracts/rewards :contentReference[oaicite:10]{index=10}  
  - Details:  
    - V3 vs V4 difference, and the June 6th 2025 cut-over for V4 coins.  
    - Current **1% total trading fee** and split between creator, platform referral, trade referral, protocol, Doppler.  
    - Multi-hop conversion (Content Coin → Creator Coin → ZORA) for rewards distribution.  
    - How referral addresses are passed and stored.

- **Factory contract deep-dive (`ZoraFactory.sol`):**  
  - https://zora-protocol-private-protocol-sdk.preview.zora.co/coins/contracts/factory :contentReference[oaicite:11]{index=11}  
  - Details:  
    - Upgradeable factory, canonical address per chain.  
    - `deploy` parameters (legacy V3 path).  
    - Error modes + invariants.  
    - Example usage with the SDK.

---

## 2. Monorepo (Contracts + Docs in Markdown/MDX)

### 2.1 Clone and build

```bash
git clone https://github.com/ourzora/zora-protocol.git
cd zora-protocol
pnpm install
````

Build contracts + ABIs:

```bash
# Full Solidity compile + artifacts (for behavior analysis, tests, etc.)
pnpm build

# JS/TS artifacts only (ABIs + wagmi types, no full compile)
pnpm build:js
```

Build docs locally (Coins + NFT):

```bash
pnpm build:docs:coins
pnpm build:docs:nft
```

> After `build:docs:coins` you have a static docs bundle; all source content lives under `docs/` in MDX/markdown form.([GitHub][1])

---

### 2.2 Repository layout (relevant bits)

From the root README:([GitHub][1])

* `packages/coins` – **Coins protocol contracts** (Solidity) and TS support code
* `packages/coins-sdk` – **Coins SDK** (TypeScript)
* `docs/` – MDX docs, including Coins docs which are built into docs.zora.co
* `legacy/` and `nft-docs/` – legacy NFT protocol (mostly irrelevant for Coins, but useful for historical context)

Inside Coins docs and examples you will see imports like:([docs.zora.co][2])

```solidity
import {IZoraFactory} from "@zoralabs/coins/src/interfaces/IZoraFactory.sol";
import {CoinConfigurationVersions} from "@zoralabs/coins/src/libs/CoinConfigurationVersions.sol";
```

That implies:

* Source interfaces under: `packages/coins/src/interfaces/`
* Libs / config helpers under: `packages/coins/src/libs/`
* Core contracts (`ZoraFactory`, `CreatorCoin`, `ContentCoin`, hooks) under `packages/coins/src/…`

You should read those Solidity files directly for real behavior, but for quick ABI-only work, see §4.

---

## 3. Canonical On-Chain Addresses (Base)

### 3.1 Factory

From the **Creating a Coin** doc:([docs.zora.co][2])

* `ZoraFactory` (canonical factory, V3/V4 aware)

  * **Base (8453):** `0x777777751622c0d3258f214F9DF38E35BF45baF3`
  * **Base Sepolia (84532):** same address

The docs’ Solidity example hard-codes this address as `FACTORY_ADDRESS`.([docs.zora.co][2])

---

### 3.2 $ZORA token

From Zora support + airdrop guides:([support.zora.co][3])

* Official **$ZORA token** contract:

  * `0x1111111111166b7fe7bd91427724b487980afc69`
  * Max supply: 10B ZORA
  * Deployed on **Base**, with bridge/sync to Ethereum context.

The Creating-a-Coin example also uses this address as `ZORA_TOKEN_ADDRESS` constant, confirming it is the canonical backing token for Creator Coins.([docs.zora.co][2])

---

### 3.3 Coins / pools / hooks (behavioral anchors)

From the **Creating a Coin**, **Rewards**, and **Architecture** docs:([docs.zora.co][2])

* Every new coin is created by `ZoraFactory` + a Uniswap v4 pool with a singleton hook.
* V4 coins use a **Zora v4 hook** contract (`IZoraV4CoinHook` in the ABIs) which:

  * Collects Uniswap LP fees
  * Splits into LP rewards vs market rewards
  * Multi-hops payouts into ZORA and distributes to recipients
* Content Coins are paired against Creator Coins; Creator Coins are paired against ZORA.
* All rewards are ultimately paid in ZORA.

You’ll find the concrete hook contract implementation and addresses in:

* `packages/coins/src/hooks/…` (Solidity)
* The coins deployment package (`packages/protocol-deployments`) for per-chain addresses.

---

## 4. ABIs and Programmatic Access

You don’t have to reverse-engineer ABIs from Etherscan; Zora publishes them.

### 4.1 @zoralabs/coins-sdk (TypeScript)

* npm: [https://www.npmjs.com/package/@zoralabs/coins-sdk](https://www.npmjs.com/package/@zoralabs/coins-sdk) ([docs.zora.co][4])

Features:

* High-level helpers to:

  * `createCoin` – deploy an onchain coin via the factory
  * `createCoinCall` – raw call data for custom tx flows (wagmi / viem)
  * Query functions to get coin details, activity, balances, etc.([docs.zora.co][5])

This is the most convenient way to inspect and exercise protocol behavior from code.

---

### 4.2 @zoralabs/coins ABIs via CDN

* jsDelivr listing: [https://cdn.jsdelivr.net/npm/@zoralabs/coins@2.0.0/abis/](https://cdn.jsdelivr.net/npm/@zoralabs/coins@2.0.0/abis/) ([jsDelivr][6])

Relevant ABI files (JSON):

* `IZoraFactory.json` – factory interface
* `IZoraV4CoinHook.json` – Uniswap v4 hook interface
* `ProtocolRewards.json` – protocol rewards contract
* `IPoolManager.json`, `IHooks.json`, etc. – Uniswap v4 infrastructure
* `LiquidityMigration*.json` – migration tools
* Owner/multi-owner helpers (`MultiOwnable.json`, etc.)

> For static analysis you can pull all these ABIs and feed them into your own tooling (slither, custom analyzers, simulations).

---

## 5. Key Behavior Surfaces to Inspect

This section is a checklist of what to read, not the full analysis.

### 5.1 Creation flow

Contracts/docs to inspect:

* `ZoraFactory` (creation entrypoint) – docs + Solidity([ZORA Docs][7])
* `CoinConfigurationVersions` and poolConfig encoding libs([docs.zora.co][2])
* Events emitted on creation:

  * `CoinCreated` (legacy V3, Uniswap v3 pool address)
  * `CoinCreatedV4` (Content Coins, v4 `PoolKey`)
  * `CreatorCoinCreated` (Creator Coins, v4 `PoolKey`)([docs.zora.co][2])

Questions to answer with your own reading:

* How is **platformReferrer** enforced and stored?
* How is **payoutRecipient** updated or locked?
* How deterministic is coin address derivation? (`coinSalt`, `coinAddress`)
* What are the validation rules for `poolConfig`?

---

### 5.2 Trading + fee mechanics (Uniswap v4 hook)

Docs:

* **Coin Rewards (V4)** – fee split, LP reward behavior, multi-hop conversion, upgrade path.([docs.zora.co][8])
* **Architecture** – relationship between hook, pool manager, coins.([docs.zora.co][9])

Contracts to inspect (in `packages/coins/src`):

* Hook implementation (`ZoraV4CoinHook` or similar)
* `ProtocolRewards` and associated interfaces
* Any upgrade gate / versioned contract base classes.

Behavior questions:

* Exact **fee formula** per swap (pre-2.2.0 vs post-2.2.0).
* Edge cases around **liquidity migration** (migrating to newer hook version).([docs.zora.co][8])
* How trade-referral data is passed and validated when using routers (`UniversalRouter`, `IV4Router`, etc.).([docs.zora.co][8])

---

### 5.3 Rewards and vesting (Creator Coins)

Docs:

* **Coin Rewards** – Creator Coins vs Content Coins fee splits and vesting mechanics.([docs.zora.co][8])

Contracts:

* Creator coin implementation (search in `packages/coins/src` for `CreatorCoin`).
* Vesting logic and reward accounting (whether in CreatorCoin or a separate rewards contract).

Behavior questions:

* How vesting interacts with **on-trade vesting** (only vest as trades happen) vs pure time-based vest.([Blockworks][10])
* What happens when the creator changes payoutRecipient mid-stream.

---

### 5.4 Indexing & analytics

Docs:

* **Creating a Coin** – section “Indexing guidance” for events and normalization.([docs.zora.co][2])

External references:

* Blockworks Zora analytics: [https://blockworks.co/analytics/zora](https://blockworks.co/analytics/zora) ([Blockworks][11])
* Case study on liquidity & routing: [https://0x.org/case-studies/zora](https://0x.org/case-studies/zora) ([0x.org][12])

Indexing pattern:

* Subscribe to `ZoraFactoryImpl` events for `CoinCreated`, `CoinCreatedV4`, `CreatorCoinCreated`.
* Normalize into a single “Coin” table with type `{legacy | content | creator}`, store `PoolKey` / `PoolKeyHash` for v4, and pool address for v3.([docs.zora.co][2])

---

## 6. Ancillary Context

Not strictly necessary for contract behavior, but useful context:

* **$ZORA token economics & airdrop:** Zora’s official and third-party guides — token supply, sector, positioning vs pump.fun, etc.([phantom.com][13])
* **Ecosystem writeups on Zora Coins and Content Coins:**

  * Blockworks "content coin fad" article (creator incentives, volatility, and pump-style speculation).([Blockworks][10])
  * OneKey / Bitget / BingX explainers on the “post-as-coin” model.([OneKey][14])
* **Third-party protocol ideas** (e.g., lending against Creator Coins) for thinking about risk profiles:([Medium][15])

---

## 7. Minimal Local Setup Checklist

To have “full docs + full contracts” locally for deep investigation:

1. **Clone repo + install:**

   ```bash
   git clone https://github.com/ourzora/zora-protocol.git
   cd zora-protocol
   pnpm install
   ```

2. **Compile contracts and generate ABIs:**

   ```bash
   pnpm build        # full Solidity build
   pnpm build:js     # TS + ABIs only
   ```

3. **Build Coins docs (MDX → static):**

   ```bash
   pnpm build:docs:coins
   ```

4. **Optional: vendor ABIs directly:**

   ```bash
   mkdir -p external/zora/abis
   cd external/zora/abis
   # e.g. fetch IZoraFactory + IZoraV4CoinHook:
   curl -O https://cdn.jsdelivr.net/npm/@zoralabs/coins@2.0.0/abis/IZoraFactory.json
   curl -O https://cdn.jsdelivr.net/npm/@zoralabs/coins@2.0.0/abis/IZoraV4CoinHook.json
   ```

5. **Index on-chain events from Base:**

   * Network: Base mainnet (chain id 8453)
   * Factory: `0x777777751622c0d3258f214F9DF38E35BF45baF3`
   * Token: `0x1111111111166b7fe7bd91427724b487980afc69`
   * Events: `CoinCreated`, `CoinCreatedV4`, `CreatorCoinCreated` from `ZoraFactoryImpl`.

With this setup you have:

* Full Solidity source for all Coins contracts
* Full ABI set (factory, coins, hooks, rewards)
* Local copies of the docs that power docs.zora.co
* A clear map for analyzing behavior around creation, trading, fees, and rewards.

[1]: https://github.com/ourzora/zora-protocol "GitHub - ourzora/zora-protocol: Monorepo for Zora Protocol (contracts & sdks)"
[2]: https://docs.zora.co/coins/contracts/creating-a-coin "Creating a Coin | ZORA Docs"
[3]: https://support.zora.co/en/articles/5654721?utm_source=chatgpt.com "What is the $ZORA Contract Address? - Help Centre"
[4]: https://docs.zora.co/coins/sdk?utm_source=chatgpt.com "Coins SDK"
[5]: https://docs.zora.co/coins/sdk/create-coin?utm_source=chatgpt.com "Coins SDK"
[6]: https://cdn.jsdelivr.net/npm/%40zoralabs/coins%402.0.0/abis/?utm_source=chatgpt.com "@zoralabs/coins CDN by jsDelivr - A free, fast, and reliable Open ..."
[7]: https://zora-protocol-private-protocol-sdk.preview.zora.co/coins/contracts/factory?utm_source=chatgpt.com "ZoraFactory.sol"
[8]: https://docs.zora.co/coins/contracts/rewards "Coin Rewards | ZORA Docs"
[9]: https://docs.zora.co/coins/contracts/architecture?utm_source=chatgpt.com "Contract Architecture"
[10]: https://blockworks.co/news/zora-latest-content-coin-fad?utm_source=chatgpt.com "Breaking down Zora's latest 'Content Coin' fad"
[11]: https://blockworks.co/analytics/zora?utm_source=chatgpt.com "Zora: Overview - Analytics Dashboard"
[12]: https://0x.org/case-studies/zora?utm_source=chatgpt.com "Zora Case Study"
[13]: https://phantom.com/learn/crypto-101/zora-airdrop?utm_source=chatgpt.com "Zora Airdrop: The $ZORA Token Guide (2025)"
[14]: https://onekey.so/blog/ecosystem/zora-the-on-chain-creator-economy-protocol-where-every-post-becomes-a-coin/?utm_source=chatgpt.com "ZORA: The On-Chain Creator Economy Protocol Where ..."
[15]: https://medium.com/%40aryangodara_19887/lending-protocol-for-zora-creator-coins-architecture-risks-incentives-e0179ad3ed4e?utm_source=chatgpt.com "Lending Protocol for Zora Creator Coins"

