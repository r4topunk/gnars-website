# Batch Coin Purchase - Sequential Execution

## Overview

Purchase multiple Zora content coins sequentially with a streamlined multi-step flow. Each swap executes individually with confirmation waiting, ensuring compatibility with all wallets on Base.

## How It Works

### 1. **Batch Preparation**
- Generate swap calls for each coin using Zora SDK
- Each swap configured with `sender = userAddress` (tokens go directly to user)
- 5% slippage tolerance for volatile content coins
- All swap data prepared upfront for efficiency

### 2. **Sequential Execution**
- Execute one swap at a time with user approval
- Wait for 2 block confirmations after each transaction
- 2-second delay between swaps for RPC sync
- Real-time progress tracking ("Purchasing coin X of Y...")

### 3. **Direct Token Receipt**
- Tokens sent directly to user wallet (no intermediate contract)
- No additional gas for token forwarding
- Simple, auditable architecture

## Files

### Hook
**`src/hooks/use-batch-coin-purchase.ts`**
- Generates swap calls using Zora SDK's `createTradeCall()`
- Executes swaps sequentially via `useSendTransaction`
- Waits for confirmations using `usePublicClient`
- Tracks progress with `currentSwapIndex` and `completedSwaps`

### UI Component
**`src/components/tv/BuyAllModal.tsx`**
- Multi-step purchase flow (select → confirm → executing → success)
- Live progress display during execution
- Paired coin prioritization in default selection
- Error handling with user-friendly messages

## Usage

```tsx
import { useBatchCoinPurchase } from "@/hooks/use-batch-coin-purchase";

const {
  executeBatchPurchase,
  isPreparing,
  currentSwapIndex,
  totalSwaps,
  completedSwaps,
} = useBatchCoinPurchase({
  coins: [
    { address: "0x...", ethAmount: parseEther("0.01") },
    { address: "0x...", ethAmount: parseEther("0.01") },
  ],
  slippageBps: 500,
  onSuccess: () => console.log("All swaps completed!"),
  onError: (error) => console.error("Failed:", error),
});

// Execute sequential purchases
await executeBatchPurchase();

// Track progress
conWhy Sequential Execution?

### ✅ Advantages
1. **Universal compatibility** - Works with any wallet (no ERC-5792 required)
2. **Direct token receipt** - Tokens go straight to user wallet
3. **Partial success** - Continue even if individual swaps fail
4. **Better error handling** - User cancellation vs swap failure
5. **Clear progress** - Real-time visibility into each purchase
6. **Simpler architecture** - No smart contract deployment needed

### ⚠️ Trade-offs
1. **Multiple approvals** - User confirms each transaction individually
2. **Non-atomic** - Swaps succeed/fail independently
3. **Longer execution** - ~4-6 seconds per swap (confirmations + RPC sync)

### Why Not Smart Contracts?
- **Zora SDK limitation**: `sender` parameter hardcodes recipient in swap data
- Router rejects swaps when contract is intermediary
- Tokens must go directly from router to end user

### Why Not ERC-5792?
- **Limited wallet support**: MetaMask/Coinbase Wallet errors with "method not supported"
- Sequential approach has broader compatibility

## Wallet Compatibility
 (paired coins pre-selected by default)
2. Enter total ETH amount (splits evenly across selected coins)
3. Click "Review Purchase" to see breakdown
4. Click "Confirm Purchase"
5. Approve each transaction in wallet
6. Wait for confirmations between swaps
7. View success summary with transaction hashes
- WalletConnect ✅
- Any wallet supporting wagmi's `sendTransaction`

Works with wallets supporting ERC-5792:
- Coinbase Wallet
- MetaMask (with snap)
- Rainbow
- Most modern smart wallets

## Testing  
**Confirmations per swap:** 2 blocks  
**RPC sync delay:** 2 seconds

Adjust settings in `use-batch-coin-purchase.ts`:
```typescript
slippageBps = 500        // 5% slippage (300 = 3%, 1000 = 10%)
confirmations: 2         // Block confirmations to wait
setTimeout(resolve, 2000) // RPC sync delay in ms
```

## Troubleshooting

**"Unable to estimate network fee":**
- Previous transaction still pending
- Wait for confirmation before next swap
- (Fixed by 2-block confirmation waiting + 2s delay)

**Individual swap fails:**
- Increase slippage tolerance for volatile coins
- Check coin has sufficient liquidity
- Remaining swaps continue automatically

**User cancels mid-batch:**
- Gracefully stops execution
- Shows "Completed X of Y swaps" message
- Successfully purchased coins remain in wallet

**Slow execution:**
- Normal: ~4-6 seconds per swap
- Includes: 2 block confirmations + 2s RPC sync delay
- Ensures wallet has confirmed state for next swap
slippageBps = 500 // Change to 300 for 3%, 1000 for 10%, etc.
```

## Troubleshooting

**Batch fails:**
- Increase slippage tolerance (volatile coin prices)
- Reduce number of coins in batch
- Check wallet has sufficient ETH

**"Wallet not compatible":**
- Use Coinbase Wallet or other ERC-5792 wallet
- Update wallet to latest version
