---
name: eth-addresses
description: Verified contract addresses for major Ethereum protocols across mainnet and L2s (especially Base). Use when you need a contract address for USDC, WETH, Uniswap, Aave, Chainlink, Safe, ENS, Aerodrome, or any major protocol. Never hallucinate addresses — check here first.
---

# Contract Addresses

> **CRITICAL:** Never hallucinate a contract address. Wrong addresses mean lost funds. If an address isn't listed here, look it up on the block explorer or the protocol's official docs before using it.

**Last Verified:** March 3, 2026

---

## Stablecoins

### USDC (Circle) — Native
| Network | Address |
|---------|---------|
| Mainnet | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |
| Arbitrum | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |
| Optimism | `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85` |
| **Base** | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Polygon | `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` |

### USDT (Tether)
| Network | Address |
|---------|---------|
| Mainnet | `0xdAC17F958D2ee523a2206206994597C13D831ec7` |
| **Base** | `0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2` |

### DAI (MakerDAO)
| Network | Address |
|---------|---------|
| Mainnet | `0x6B175474E89094C44Da98b954EedeAC495271d0F` |
| **Base** | `0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb` |

---

## Wrapped ETH (WETH)

| Network | Address |
|---------|---------|
| Mainnet | `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2` |
| Arbitrum | `0x82aF49447D8a07e3bd95BD0d56f35241523fBab1` |
| Optimism | `0x4200000000000000000000000000000000000006` |
| **Base** | `0x4200000000000000000000000000000000000006` |

---

## Liquid Staking

### Lido — wstETH
| Network | Address |
|---------|---------|
| Mainnet | `0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0` |
| **Base** | `0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452` |

---

## DeFi Protocols

### Uniswap V3 Multi-Chain
| Contract | Arbitrum | Optimism | **Base** |
|----------|----------|----------|------|
| SwapRouter02 | `0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45` | `0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45` | `0x2626664c2603336E57B271c5C0b26F421741e481` |
| Factory | `0x1F98431c8aD98523631AE4a59f267346ea31F984` | `0x1F98431c8aD98523631AE4a59f267346ea31F984` | `0x33128a8fC17869897dcE68Ed026d694621f6FDfD` |

### Uniswap V4
| Contract | **Base** |
|----------|------|
| PoolManager | `0x498581ff718922c3f8e6a244956af099b2652b2b` |
| PositionManager | `0x7c5f5a4bbd8fd63184577525326123b519429bdc` |

### Universal Router (V4)
| Network | Address |
|---------|---------|
| **Base** | `0x6ff5693b99212da76ad316178a184ab56d299b43` |

### Permit2 (Universal Token Approval)
| Network | Address |
|---------|---------|
| All chains | `0x000000000022D473030F116dDEE9F6B43aC78BA3` |

### 1inch Aggregation Router V6
| Network | Address |
|---------|---------|
| All chains (CREATE2) | `0x111111125421cA6dc452d289314280a0f8842A65` |

### Aave V3
| Contract | **Base** |
|----------|------|
| Pool | `0xA238Dd80C259a72e81d7e4664a9801593F98d1c5` |
| PoolAddressesProvider | `0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D` |

### Compound V3 Comet (USDC)
| Network | Address |
|---------|---------|
| **Base** | `0xb125E6687d4313864e53df431d5425969c15Eb2F` |

---

## Aerodrome (Base) — Dominant DEX

The largest DEX on Base by TVL (~$500-600M). Uses ve(3,3) model.

| Contract | Address |
|----------|---------|
| AERO Token | `0x940181a94A35A4569E4529A3CDfB74e38FD98631` |
| Router | `0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43` |
| Voter | `0x16613524e02ad97eDfeF371bC883F2F5d6C480A5` |
| VotingEscrow | `0xeBf418Fe2512e7E6bd9b87a8F0f294aCDC67e6B4` |
| PoolFactory | `0x420DD381b31aEf6683db6B902084cB0FFECe40Da` |

---

## Infrastructure

### Safe (Gnosis Safe)
| Contract | Address |
|----------|---------|
| Singleton 1.4.1 | `0x41675C099F32341bf84BFc5382aF534df5C7461a` |
| ProxyFactory | `0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2` |
| MultiSend | `0x38869bf66a61cF6bDB996A6aE40D5853Fd43B526` |

### Account Abstraction (ERC-4337)
| Contract | Address |
|----------|---------|
| EntryPoint v0.7 | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` |
| EntryPoint v0.6 | `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789` |

### ENS (Mainnet)
| Contract | Address |
|----------|---------|
| Registry | `0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e` |
| Public Resolver | `0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63` |

### Chainlink Price Feeds
| Feed | Mainnet | **Base** |
|------|---------|------|
| ETH/USD | `0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419` | `0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70` |
| LINK Token | `0x514910771AF9Ca656af840dff83E8264EcF986CA` | `0x88Fb150BDc53A65fe94Dea0c9BA0a6dAf8C6e196` |

### Chainlink CCIP Router
| Network | Address |
|---------|---------|
| **Base** | `0x881e3A65B4d4a04dD529061dd0071cf975F58Bcd` |

### Across Protocol SpokePool (Bridge)
| Network | Address |
|---------|---------|
| **Base** | `0x09aea4b2242abC8bb4BB78D537A67a245A7bEC64` |

### Multicall3
| Network | Address |
|---------|---------|
| All chains | `0xcA11bde05977b3631167028862bE2a173976CA11` |

### Morpho Blue (Base)
| Contract | Address |
|----------|---------|
| Morpho | `0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb` |

---

## How to Verify Addresses

```bash
# Check bytecode exists
cast code 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 --rpc-url https://eth.llamarpc.com
```

**Cross-reference:** Protocol docs -> CoinGecko -> block explorer -> GitHub deployments.

## Address Discovery Resources

- **Uniswap:** https://docs.uniswap.org/contracts/v3/reference/deployments/
- **Aave:** https://docs.aave.com/developers/deployed-contracts/
- **Chainlink:** https://docs.chain.link/data-feeds/price-feeds/addresses
- **Aerodrome:** https://github.com/aerodrome-finance/contracts
- **Lido:** https://docs.lido.fi/deployed-contracts/
- **CoinGecko:** https://www.coingecko.com (token addresses)
- **DeFi Llama:** https://defillama.com (TVL rankings by chain)

Source: https://ethskills.com/addresses/SKILL.md
