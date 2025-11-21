# Coin Purchase Proposal System

## Overview

This module provides an integrated workflow for creating DAO proposals to purchase content or creator coins using the Zora Coins SDK. It implements **Option 2** - programmatic proposal creation with automatic transaction generation.

## Features

### 🎯 Integrated Proposal Creation
- Single workflow from coin selection to proposal submission
- Automatic transaction data generation using Zora SDK
- Pre-filled proposal with title, description, and custom transaction
- Built-in voting power validation

### 🔄 Two-Step Wizard Flow

#### Step 1: Coin Purchase Configuration
- Coin address input (ERC-20 token to purchase)
- Optional coin name for display
- ETH amount to spend from treasury
- Slippage tolerance configuration

#### Step 2: Review & Submit
- Trade summary display
- Auto-generated proposal title and description
- Transaction details preview
- Standard proposal submission via Governor contract

## Architecture

### Components

**CoinProposalWizard.tsx** - Main wizard orchestrator
- Manages two-tab flow (purchase → preview)
- Integrates Zora Coins SDK via `createTradeCall()`
- Validates voting power requirements
- Uses React Hook Form with Zod validation

**CoinPurchaseForm.tsx** - Purchase parameters input
- Form fields for coin details and trade parameters
- Real-time validation
- Loading states during SDK calls

**CoinPurchasePreview.tsx** - Trade summary display
- Shows all purchase parameters
- Treasury sender/recipient confirmation
- Visual trade details

**CoinProposalGenerator.tsx** (Legacy) - Manual copy/paste flow
- Generates transaction data for manual entry
- Displays target, value, calldata
- Copy-to-clipboard functionality
- Option A instructions for Builder

**TransactionDisplay.tsx** (Legacy) - Transaction data display
- Detailed router transaction breakdown
- Builder integration instructions
- Option B fallback guidance

## How It Works

### 1. SDK Integration

```typescript
const tradeParameters: TradeParameters = {
  sell: { type: "eth" },
  buy: { type: "erc20", address: coinAddress },
  amountIn: parseEther(ethAmount),
  slippage: slippagePercent / 100,
  sender: GNARS_ADDRESSES.treasury,
  recipient: GNARS_ADDRESSES.treasury,
};

const quote = await createTradeCall(tradeParameters);
const { target, data, value } = quote.call;
```

### 2. Proposal Generation

The wizard automatically creates a proposal with:

**Title**: `"Buy {CoinName} Content Coin"`

**Description**: Markdown-formatted details including:
- Coin address and trade parameters
- Technical details (router, value)
- Treasury information

**Transaction**: Custom transaction type with:
```typescript
{
  type: "custom",
  target: routerAddress,    // From SDK
  value: ethAmount,         // In ETH (converted to wei)
  calldata: encodedSwap,    // From SDK
  description: "Buy {coin} with {X} ETH"
}
```

### 3. Submission Flow

1. User fills purchase form → clicks "Generate Proposal"
2. System calls Zora SDK to get router transaction data
3. Form values auto-populate with proposal details
4. User reviews in preview tab
5. Clicks submit → standard Governor.propose() call
6. Proposal enters voting period

## Technical Details

### Schema Validation

Uses existing `proposalSchema` with `customTransactionSchema`:
- Address validation via viem `isAddress()`
- Hex calldata validation (`/^0x[0-9a-fA-F]*$/`)
- Numeric string validation for ETH amounts

### Transaction Encoding

Leverages existing `encodeTransactions()` from `proposal-utils.ts`:
```typescript
targets.push(tx.target);
values.push(parseEther(tx.value));
calldatas.push(tx.calldata);
```

### Voting Power Checks

Reuses `useVotes()` hook:
- Validates user has `proposalThreshold` votes
- Shows delegation status
- Blocks submission if insufficient votes

## Usage

### For Users

1. Navigate to `/coin-proposal`
2. Enter coin address (e.g., `0x26331fda472639a54d02053a2b33dce5036c675b`)
3. Optionally add coin name for better proposal title
4. Set ETH amount and slippage tolerance
5. Click "Generate Proposal"
6. Review auto-generated proposal in preview tab
7. Submit to Governor contract

### For Developers

Import the wizard:
```tsx
import { CoinProposalWizard } from "@/components/coin-proposal/CoinProposalWizard";

<CoinProposalWizard />
```

Environment requirements:
- `NEXT_PUBLIC_ZORA_API_KEY` - For SDK metadata/routing

## Key Differences from Manual Flow

| Aspect | Option 1 (Manual) | Option 2 (Integrated) |
|--------|------------------|----------------------|
| Steps | Generate data → Copy → Paste → Submit | Configure → Review → Submit |
| User Input | 6+ copy/paste actions | 3-4 form fields |
| Proposal Text | User writes manually | Auto-generated |
| Error Handling | Manual validation | Built-in validation |
| UX Complexity | High (multi-page) | Low (single wizard) |

## Router Transaction Details

### What's Generated

The SDK's `createTradeCall()` returns:

- **target**: Uniswap v4 / Zora swap router address
- **data**: ABI-encoded swap function with:
  - Route (ETH → ZORA/USDC → Coin if needed)
  - Pool parameters (fee tier, tick spacing)
  - Hook data (Zora protocol fees, referrals)
  - Slippage limits
- **value**: ETH amount in wei

### Important Notes

- **NOT** calling a function on the coin contract itself
- Coin contracts are standard ERC-20s
- All swaps go through Uniswap v4 router + Zora hooks
- Treasury is both sender and recipient (coins return to DAO)

## Future Enhancements

Potential improvements:
- Coin metadata fetching (name, symbol from chain)
- Price impact estimation
- Historical trade data
- Multi-coin purchase in single proposal
- Saved coin favorites/watchlist
- Integration with treasury dashboard

## Related Files

- `/src/app/coin-proposal/page.tsx` - Route entry point
- `/src/components/proposals/ProposalWizard.tsx` - Original proposal wizard (for reference)
- `/src/components/proposals/schema.ts` - Validation schemas
- `/src/lib/proposal-utils.ts` - Transaction encoding
- `/src/hooks/useCreateCoin.ts` - Coin creation reference

## References

- [Zora Coins SDK Documentation](https://docs.zora.co/coins/sdk)
- [Builder DAO Governance](https://docs.zora.co/protocol/builder)
- [Uniswap v4 Architecture](https://docs.uniswap.org/contracts/v4)
