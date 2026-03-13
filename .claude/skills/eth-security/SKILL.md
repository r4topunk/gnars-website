---
name: eth-security
description: Solidity security patterns and common vulnerabilities with defensive code. Use when reviewing smart contract interactions, building transaction flows, handling token approvals, or integrating with DeFi protocols. Covers reentrancy, oracle safety, decimal handling, approval exploits, MEV protection, and proxy patterns.
---

# Smart Contract Security

## What You Probably Got Wrong

**"Solidity 0.8+ prevents overflows, so I'm safe."** Overflow is one of dozens of attack vectors. The big ones today: reentrancy, oracle manipulation, approval exploits, and decimal mishandling.

**"I tested it and it works."** Working correctly is not the same as being secure. Most exploits call functions in orders or with values the developer never considered.

## Critical Vulnerabilities (With Defensive Code)

### 1. Token Decimals Vary

**USDC has 6 decimals, not 18.** This is the #1 source of "where did my money go?" bugs.

```solidity
// WRONG — assumes 18 decimals
uint256 oneToken = 1e18;

// CORRECT — check decimals
uint256 oneToken = 10 ** IERC20Metadata(token).decimals();
```

Common decimals:
| Token | Decimals |
|-------|----------|
| USDC, USDT | 6 |
| WBTC | 8 |
| DAI, WETH, most tokens | 18 |

### 2. No Floating Point in Solidity

Division truncates to zero. **Always multiply before dividing.**

```solidity
// WRONG — this equals 0
uint256 fivePercent = 5 / 100;

// CORRECT — basis points (1 bp = 0.01%)
uint256 FEE_BPS = 500; // 5% = 500 basis points
uint256 fee = (amount * FEE_BPS) / 10_000;
```

### 3. Reentrancy

Checks-Effects-Interactions (CEI) pattern:
1. **Checks** — validate inputs and conditions
2. **Effects** — update all state
3. **Interactions** — external calls last

```solidity
// SAFE — CEI pattern + reentrancy guard
function withdraw() external nonReentrant {
    uint256 bal = balances[msg.sender];
    require(bal > 0, "Nothing to withdraw");
    balances[msg.sender] = 0;  // Effect BEFORE interaction
    (bool success,) = msg.sender.call{value: bal}("");
    require(success, "Transfer failed");
}
```

### 4. SafeERC20

Some tokens (notably USDT) don't return `bool` on `transfer()`. Use SafeERC20.

```solidity
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
using SafeERC20 for IERC20;

token.safeTransfer(to, amount);
token.safeApprove(spender, amount);
```

**Other token quirks:**
- **Fee-on-transfer tokens:** Amount received < amount sent. Check balance before and after.
- **Rebasing tokens (stETH):** Balance changes without transfers. Use wrapped versions (wstETH).
- **Pausable tokens (USDC):** Transfers can revert if the token is paused.
- **Blocklist tokens (USDC, USDT):** Specific addresses can be blocked.

### 5. Never Use DEX Spot Prices as Oracles

A flash loan can manipulate any pool's spot price within a single transaction.

```solidity
// DANGEROUS — manipulable in one transaction
function getPrice() internal view returns (uint256) {
    (uint112 reserve0, uint112 reserve1,) = uniswapPair.getReserves();
    return (reserve1 * 1e18) / reserve0;
}

// SAFE — Chainlink with staleness + sanity checks
function getPrice() internal view returns (uint256) {
    (, int256 price,, uint256 updatedAt,) = priceFeed.latestRoundData();
    require(block.timestamp - updatedAt < 3600, "Stale price");
    require(price > 0, "Invalid price");
    return uint256(price);
}
```

### 6. Infinite Approvals

**Never use `type(uint256).max` as approval amount.** Approve only what's needed.

### 7. Access Control

Every state-changing function needs explicit access control. Use OpenZeppelin's `Ownable` or `AccessControl`.

### 8. Input Validation

Never trust inputs. Validate: zero addresses, zero amounts, array length mismatches, bounds.

## MEV & Sandwich Attacks

**Sandwich Attacks** — the most common MEV attack:
1. Attacker sees your swap tx in the mempool
2. Frontruns: buys before you (price rises)
3. Your swap executes at worse price
4. Backruns: attacker sells for profit

### Protection

```solidity
// Set explicit minimum output — don't set amountOutMinimum to 0
amountOutMinimum: 1900e6, // Minimum acceptable output
```

**For users/frontends:**
- Use **Flashbots Protect RPC** (`https://rpc.flashbots.net`) — private mempool
- Set tight slippage limits (0.5-1% for majors)
- L2 transactions are less susceptible (sequencers process in order)

## Proxy Patterns & Upgradeability

**Use UUPS** (recommended by OpenZeppelin). Critical rules:
1. Use `initializer` instead of `constructor`
2. Never change storage layout — only append new variables
3. Use `@openzeppelin/contracts-upgradeable`
4. Transfer upgrade authority to a multisig

## Pre-Deploy Security Checklist

- [ ] Access control on every admin function
- [ ] Reentrancy protection (CEI + `nonReentrant`)
- [ ] Token decimal handling (no hardcoded `1e18`)
- [ ] Oracle safety (Chainlink, not DEX spot)
- [ ] Multiply before divide
- [ ] SafeERC20 for all token operations
- [ ] Input validation on all public functions
- [ ] Events emitted for every state change
- [ ] No infinite approvals
- [ ] Source verified on block explorer

## Automated Security Tools

```bash
slither .                     # Static analysis
mythril analyze Contract.sol  # Symbolic execution
forge test --fuzz-runs 10000  # Fuzz testing
```

## Further Reading

- **OpenZeppelin Contracts:** https://docs.openzeppelin.com/contracts
- **SWC Registry:** https://swcregistry.io
- **Rekt News:** https://rekt.news

Source: https://ethskills.com/security/SKILL.md
