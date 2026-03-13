---
name: eth-tools
description: Ethereum development tools for contract exploration and testing. Use when inspecting Gnars DAO contracts, checking auction/treasury state, testing transactions locally, or scripting onchain reads via cast/anvil/viem. Covers Foundry cast commands, abi.ninja, Blockscout MCP, RPC providers, block explorers, and fork testing.
---

# Ethereum Development Tools

## What You Probably Got Wrong

**Blockscout MCP server exists:** https://mcp.blockscout.com/mcp — gives AI agents structured blockchain data via Model Context Protocol.

**abi.ninja is essential:** https://abi.ninja — paste any verified contract address, get a UI to call any function. Zero setup. Supports mainnet + all major L2s. Perfect for contract exploration.

**Foundry is the default for new projects in 2026.** Not Hardhat. 10-100x faster tests, Solidity-native testing, built-in fuzzing.

## Tool Discovery Pattern for AI Agents

When an agent needs to interact with Ethereum:

1. **Read operations:** Blockscout MCP, Etherscan API, or `cast call`
2. **Write operations:** Foundry `cast send` or viem
3. **Contract exploration:** abi.ninja (browser) or `cast interface` (CLI)
4. **Testing:** Fork mainnet/Base with `anvil`, test locally
5. **Deployment:** `forge create` or `forge script`
6. **Verification:** `forge verify-contract` or Etherscan API

## Essential Foundry cast Commands

```bash
# Read contract state
cast call 0xAddr "balanceOf(address)(uint256)" 0xWallet --rpc-url $RPC

# Read with named function
cast call 0xAddr "totalSupply()(uint256)" --rpc-url $RPC

# Send transaction
cast send 0xAddr "transfer(address,uint256)" 0xTo 1000000 \
  --private-key $KEY --rpc-url $RPC

# Gas price / base fee
cast gas-price --rpc-url $RPC
cast base-fee --rpc-url $RPC

# Decode calldata
cast 4byte-decode 0xa9059cbb...

# ENS resolution
cast resolve-name vitalik.eth --rpc-url $RPC

# Get contract ABI from Etherscan/Basescan
cast interface 0xAddr --etherscan-api-key $KEY --chain base

# Check ETH balance
cast balance 0xAddr --rpc-url $RPC

# Convert units
cast to-wei 1.5 ether    # -> 1500000000000000000
cast from-wei 1500000000000000000  # -> 1.5

# Block info
cast block latest --rpc-url $RPC
cast block-number --rpc-url $RPC

# Get logs/events
cast logs --address 0xAddr --from-block 12345 --to-block latest --rpc-url $RPC
```

### Gnars DAO Contract Exploration Examples

```bash
# Base RPC
export BASE_RPC="https://mainnet.base.org"

# Check current auction
cast call 0x494eaa55ecf6310658b8fc004b0888dcb698097f \
  "auction()(uint256,uint256,address,uint256,uint256,bool)" \
  --rpc-url $BASE_RPC

# Check token total supply
cast call 0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17 \
  "totalSupply()(uint256)" --rpc-url $BASE_RPC

# Check treasury ETH balance
cast balance 0x72ad986ebac0246d2b3c565ab2a1ce3a14ce6f88 --rpc-url $BASE_RPC

# Check a proposal
cast call 0x3dd4e53a232b7b715c9ae455f4e732465ed71b4c \
  "getProposal(bytes32)" PROPOSAL_ID --rpc-url $BASE_RPC

# Check voting power
cast call 0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17 \
  "getVotes(address)(uint256)" 0xVOTER_ADDRESS --rpc-url $BASE_RPC
```

## Fork Testing with Anvil

Fork Base locally to test against real contracts with fake ETH:

```bash
# Fork Base at latest block
anvil --fork-url https://mainnet.base.org

# Fork at specific block (reproducible)
anvil --fork-url https://mainnet.base.org --fork-block-number 12345678

# Now test against real contracts at http://localhost:8545
# Anvil gives you 10 funded accounts with 10,000 ETH each
```

**Use cases for Gnars DAO:**
- Test bidding on auctions without spending real ETH
- Simulate proposal creation and voting
- Debug contract interactions locally
- Verify frontend data fetching against forked state

## Blockscout MCP Server

**URL:** https://mcp.blockscout.com/mcp

A Model Context Protocol server for structured blockchain data:
- Transaction, address, contract queries
- Token info and balances
- Smart contract interaction helpers
- Multi-chain support

## abi.ninja

**URL:** https://abi.ninja

Paste any contract address, interact with all functions. Multi-chain. Zero setup.

**Quick exploration of Gnars contracts:**
1. Go to https://abi.ninja
2. Select Base network
3. Paste contract address (e.g., `0x494eaa55ecf6310658b8fc004b0888dcb698097f` for Auction)
4. Call any read function directly in browser

## RPC Providers

**Free (testing/development):**
- `https://mainnet.base.org` — Base public RPC
- `https://eth.llamarpc.com` — Ethereum mainnet, no key
- `https://rpc.ankr.com/eth` — Ankr free tier

**Paid (production):**
- **Alchemy** — generous free tier (300M CU/month)
- **Infura** — established, MetaMask default
- **QuickNode** — performance-focused

**Community:** `rpc.buidlguidl.com`

## Block Explorers

| Network | Explorer | API |
|---------|----------|-----|
| **Base** | https://basescan.org | Etherscan-compatible |
| Mainnet | https://etherscan.io | https://api.etherscan.io |
| Arbitrum | https://arbiscan.io | Etherscan-compatible |
| Optimism | https://optimistic.etherscan.io | Etherscan-compatible |

## Viem Quick Reference (Used in This Project)

```typescript
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const client = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org'),
});

// Read contract
const totalSupply = await client.readContract({
  address: '0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17',
  abi: tokenAbi,
  functionName: 'totalSupply',
});

// Multicall (batch reads in one RPC call)
const results = await client.multicall({
  contracts: [
    { address: tokenAddr, abi: erc721Abi, functionName: 'totalSupply' },
    { address: auctionAddr, abi: auctionAbi, functionName: 'auction' },
    { address: treasuryAddr, abi: treasuryAbi, functionName: 'delay' },
  ],
});

// Watch for events (real-time)
const unwatch = client.watchContractEvent({
  address: auctionAddr,
  abi: auctionAbi,
  eventName: 'AuctionBid',
  onLogs: (logs) => console.log('New bid:', logs),
});
```

## What Changed in 2025-2026

- **Foundry became default** over Hardhat for new projects
- **Viem gaining on ethers.js** (smaller, better TypeScript)
- **MCP servers emerged** for agent-blockchain interaction
- **Deprecated:** Truffle (use Foundry/Hardhat), Goerli/Rinkeby (use Sepolia)

Source: https://ethskills.com/tools/SKILL.md
