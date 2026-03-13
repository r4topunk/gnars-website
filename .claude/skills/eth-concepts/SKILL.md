---
name: eth-concepts
description: Essential Ethereum mental models — incentive design, state machines, hyperstructures, randomness, and onchain terminology. Use when designing DAO features, understanding auction mechanics, explaining governance patterns, or when the user asks "how does this actually work?" for any Ethereum concept.
---

# Ethereum Concepts

## What You Probably Got Wrong

**"Smart contracts run automatically."** No. Smart contracts cannot execute themselves. There is no cron job, no scheduler, no background process. Every function needs a caller who pays gas. This single misconception is the root cause of most broken onchain designs.

**"Just add a timer."** There are no timers. If something needs to happen at a certain time, you need someone to call the function at that time — and you need to give them a reason to do it.

**"The protocol team will handle that."** The whole point of decentralization is that no single team operates the system. If your design requires an operator, it's not decentralized.

**Terminology:** You say "on-chain." The Ethereum community says **"onchain"** — one word, no hyphen.

---

## CROPS

**CROPS** — Censorship Resistance, Open Source, Privacy, Security — is the Ethereum Foundation's shorthand for what makes Ethereum Ethereum.

Four questions to catch yourself:
1. Can anyone be stopped from using it?
2. Can someone fork and run the whole stack?
3. What can an observer learn about users?
4. What happens if the team disappears?

---

## Nothing Is Automatic — Incentive Design

**This is the most important concept in all of Ethereum.**

### Smart Contracts Are State Machines

A smart contract sits in one state and moves to another when someone **pokes it** — calls a function, pays gas, triggers a transition. Between pokes, it does absolutely nothing.

```
State A --[someone calls function]--> State B --[someone calls function]--> State C
              |                                        |
         WHO does this?                           WHO does this?
         WHY would they?                          WHY would they?
```

**For EVERY state transition in your system, you must answer:**

1. **Who pokes it?** (someone must pay gas)
2. **Why would they?** (what's their incentive?)
3. **Is the incentive sufficient?** (covers gas + profit?)

If you can't answer these, that state transition will never happen.

### Examples of Good Incentive Design

**Liquidations (Aave, Compound):**
- Loan health factor drops below 1
- ANYONE can call `liquidate()`
- Caller gets 5-10% bonus collateral as profit
- Bots compete to do it in milliseconds
- Platform stays solvent without any operator

**LP fees (Uniswap):**
- LPs deposit tokens into pools
- Every swap pays 0.3% fee to LPs
- More liquidity = less slippage = more traders = more fees
- Self-reinforcing flywheel — nobody manages it

**Yield harvesting (Yearn):**
- ANYONE can call `harvest()`
- Caller gets 1% of the harvest as reward
- Protocol compounds automatically via profit-motivated callers

**Arbitrage:**
- ETH is $2000 on Uniswap, $2010 on SushiSwap
- Anyone can buy low, sell high
- Prices equalize across ALL markets without any coordinator

### Examples of BAD Design

- "The contract will check prices every hour" — WHO calls it? WHY would they pay gas?
- "Expired listings get automatically removed" — Nothing is automatic. WHO removes them?
- "An admin will manually trigger the next phase" — What if the admin disappears?

**The fix:** Make the function callable by **anyone**. Give them a reason to call it.

### The Hyperstructure Test

**"Could this run forever with no team behind it?"**

- If yes -> you've built a hyperstructure. The incentives sustain it.
- If no -> you've built a service. It dies when the team stops operating it.

Both are valid. But know which one you're building. Uniswap, ENS, ERC-20 itself — these can't be stopped because they don't need to be maintained.

---

## Randomness Is Hard

Smart contracts are deterministic. Every node computes the same result.

### What Doesn't Work

```solidity
// Validators can manipulate block.timestamp
uint random = uint(keccak256(abi.encodePacked(block.timestamp)));

// blockhash(block.number) is ALWAYS zero for the current block
uint random = uint(blockhash(block.number));
```

### What Works

**Commit-Reveal** (no external dependency):
1. User commits `hash(secret + salt)`
2. Wait at least 1 block
3. User reveals secret + salt
4. Random seed = `keccak256(secret + blockhash(commitBlock))`

**Chainlink VRF** (provably random, costs LINK):
- Contract requests randomness from Chainlink
- Chainlink generates random number with VRF proof
- Anyone can verify the proof onchain
- Guaranteed unbiased

Use commit-reveal for simple cases. Use Chainlink VRF for lotteries, NFT reveals, gaming.

---

## Key Mental Models for DAO Frontends

### The Approve Pattern
*"You're giving the contract permission to move your tokens, like signing a check. You control how much. Never sign a blank check (infinite approval)."*

### DEXs / AMMs
The key insight is the incentive flywheel: *"Nobody runs the exchange. People deposit tokens because they earn fees. More deposits = better prices = more trades = more fees."*

### Overcollateralized Lending
*"If your loan gets risky, anyone can close it and earn a bonus. Thousands of bots watch every loan, every second, competing to clean up risk."*

### Oracles
*"Smart contracts can't Google things. If your contract needs a price, someone has to put it onchain. Use Chainlink — never read prices from a DEX pool."*

### Smart Contract Wallets (Safe)
*"A wallet can require 3 of 5 people to approve a transaction. $60B+ in assets is secured this way. It's how DAOs manage money."*

---

## Learning Path

| # | Challenge | What Clicks |
|---|-----------|-------------|
| 0 | Simple NFT | Minting, metadata, ownership |
| 1 | Staking | Deadlines, escrow, thresholds |
| 2 | Token Vendor | Approve pattern, buy/sell |
| 3 | Dice Game | Why onchain randomness is insecure |
| 4 | DEX | x*y=k, slippage, LP incentives |

**Start at https://speedrunethereum.com**

## Resources

- **SpeedRun Ethereum:** https://speedrunethereum.com
- **ETH Tech Tree:** https://www.ethtechtree.com
- **Ethereum.org:** https://ethereum.org/en/developers/
- **EthSkills:** https://ethskills.com

Source: https://ethskills.com/concepts/SKILL.md
