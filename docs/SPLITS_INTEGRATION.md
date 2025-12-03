# 0xSplits Integration for Droposal Revenue Sharing

## Overview

The Gnars droposal form now supports **0xSplits protocol integration** for revenue sharing. Users can create immutable split contracts to automatically distribute NFT sales revenue among multiple recipients.

## Features

- ✅ **Multi-recipient revenue sharing**: Split NFT sales among multiple addresses
- ✅ **Immutable splits**: No admin control after creation (trustless)
- ✅ **Test-first workflow**: Create and test splits before proposal submission
- ✅ **Real-time validation**: Percentages must sum to 100%, min 2 recipients
- ✅ **Visual allocation**: Progress bars and percentage sliders
- ✅ **Gas-efficient distribution**: Bots incentivized with distributor fee (1% default)
- ✅ **Full transparency**: View splits on splits.org

## How It Works

### User Flow

1. **Toggle "Use Revenue Split"** in the droposal form's Advanced Options
2. **Configure Recipients**:
   - Add/remove recipients (minimum 2, maximum 100)
   - Set wallet addresses
   - Allocate percentage shares (must total 100%)
   - Adjust distributor fee (0-10%, recommended 1-2%)
3. **Test Split Creation** (optional but recommended):
   - Click "🧪 Test Create Split" in the debug panel
   - Transaction creates the split contract on Base
   - View split address and transaction hash
   - Check configuration on splits.org
4. **Submit Proposal**:
   - Split address automatically used as `fundsRecipient`
   - All NFT sales go to the split contract
   - Distribution happens automatically via bot triggers

### Technical Flow

```
User creates droposal proposal
  ↓
[Optional] Test split creation in debug panel
  ↓
Split contract deployed on Base (immutable)
  ↓
Split address set as fundsRecipient
  ↓
Proposal submitted to DAO
  ↓
Proposal executed → Zora ERC721Drop created
  ↓
NFT sales → Split contract receives ETH
  ↓
Bot triggers distribution (earns distributor fee)
  ↓
Recipients receive their percentage automatically
```

## UI Components

### 1. SplitRecipientsSection
**Location:** `src/components/proposals/builder/forms/droposal/SplitRecipientsSection.tsx`

Dynamic form for managing split recipients:
- Add/remove recipient rows
- Address input with validation
- Percentage slider (0-100%, 2 decimals)
- Real-time total percentage calculation
- Visual allocation progress bar
- "Distribute Evenly" helper button
- Distributor fee slider (0-10%)

**Validation:**
- Minimum 2 recipients required
- Maximum 100 recipients (gas limit)
- All addresses must be valid (checksummed)
- Percentages must sum to exactly 100%
- Maximum 4 decimal places for percentages

### 2. SplitDebugPanel
**Location:** `src/components/proposals/builder/forms/droposal/SplitDebugPanel.tsx`

Test panel for split creation:
- Configuration preview
- "🧪 Test Create Split" button
- Loading state during transaction
- Success state with split address and tx hash
- Links to BaseScan and splits.org
- Error handling with retry button
- Copy buttons for address and tx hash

### 3. Integration in droposal-form.tsx

Toggle switch in Advanced Options:
- OFF: Shows traditional payout address input (defaults to treasury)
- ON: Shows SplitRecipientsSection + SplitDebugPanel

## Data Schema

Extended droposal transaction schema in `src/components/proposals/schema.ts`:

```typescript
{
  useSplit: boolean;                    // Toggle for using split vs direct payout
  splitRecipients: SplitRecipient[];    // Array of {address, percentAllocation}
  splitDistributorFee: number;          // 0-10% (default 1%)
  createdSplitAddress: string;          // Saved split address
}
```

## Utility Functions

**Location:** `src/lib/splits-utils.ts`

### Validation Functions
- `validateSplitConfig()` - Validates entire split configuration
- `validateSplitRecipients()` - Validates recipient array (min 2, sum 100%)
- `validatePercentage()` - Validates single percentage (0-100%, max 4 decimals)

### Formatting Functions
- `formatSplitAddress()` - Shortens address for display (0x1234...5678)
- `prepareSplitConfigForSDK()` - Converts to Splits SDK format

### Helper Functions
- `createDefaultSplitConfig()` - Creates 50/50 DAO/user split
- `autoAdjustPercentages()` - Distributes 100% evenly among recipients
- `calculateRemainingPercentage()` - Shows unallocated percentage

### Constants
- `IMMUTABLE_CONTROLLER` = `0x0000000000000000000000000000000000000000`
- Used for splits with no admin control (trustless)

## Hook

**Location:** `src/hooks/use-split-creation.ts`

```typescript
const {
  createSplit,      // async function to create split
  isPending,        // loading state
  isSuccess,        // success state
  isError,          // error state
  error,            // error object
  splitAddress,     // created split address
  txHash,           // transaction hash
  reset,            // reset state
} = useSplitCreation();

// Usage
await createSplit({
  recipients: [
    { address: "0x...", percentAllocation: 60.0 },
    { address: "0x...", percentAllocation: 40.0 }
  ],
  distributorFeePercent: 1.0,
  controller: IMMUTABLE_CONTROLLER
});
```

## Configuration

**Location:** `src/lib/config.ts`

```typescript
export const SPLITS_ADDRESSES = {
  splitMain: "0x2ed6c4B5dA6378c7897AC67Ba9e43102Feb694EE",  // Base chain
} as const;
```

## Splits Protocol Details

### What is 0xSplits?

0xSplits is a trustless protocol for splitting payments onchain:
- **Zero protocol fees** (only gas costs)
- **Immutable splits** (no admin control = trustless)
- **Automatic distribution** (bots trigger, earn fee)
- **Multi-chain support** (deployed on Base, Ethereum, etc.)

### How Distribution Works

1. Split contract receives ETH from NFT sales
2. Anyone can trigger distribution (usually bots)
3. Bot pays gas, earns distributor fee (e.g., 1%)
4. Recipients receive their percentage automatically
5. Can be batch triggered (multiple distributions at once)

### Why Use Splits?

- **Revenue sharing**: Multiple collaborators on a project
- **DAO treasury + creator**: Split proceeds between DAO and artist
- **Team payouts**: Distribute sales among team members
- **Automated**: No manual distribution needed
- **Trustless**: No one can change split percentages after creation

## Example Use Cases

### 1. Artist Collaboration (50/50 Split)
```
Recipients:
- Artist A: 50%
- Artist B: 50%
Distributor Fee: 1%
```

### 2. DAO + Creator Split (80/20)
```
Recipients:
- Gnars DAO Treasury: 80%
- Creator: 20%
Distributor Fee: 1%
```

### 3. Team Distribution
```
Recipients:
- Developer: 40%
- Designer: 30%
- Marketing: 20%
- Treasury: 10%
Distributor Fee: 1%
```

## Testing

### Manual Testing Steps

1. Navigate to proposal creation → "Add Transaction" → "Droposal"
2. Expand "Advanced Options"
3. Toggle "Use Revenue Split" ON
4. Configure recipients:
   - Add 2+ addresses
   - Set percentages (must sum to 100%)
5. Click "🧪 Test Create Split"
6. Approve transaction in wallet
7. Wait for confirmation
8. View split on splits.org (link provided)
9. Submit proposal with split as fundsRecipient

### Validation Testing

- Try adding only 1 recipient → Error shown
- Try percentages totaling 99% → Error shown
- Try percentages totaling 101% → Error shown
- Try invalid address → Error shown
- Try > 4 decimal places → Should be rounded

## Resources

- **Splits Protocol Docs**: https://docs.splits.org/
- **Splits App (Base)**: https://app.splits.org/?chainId=8453
- **Splits GitHub**: https://github.com/0xSplits
- **SDK Docs**: https://docs.splits.org/sdk/overview

## Implementation Files

### Core Files Created
1. `/src/lib/splits-utils.ts` - Utility functions and validation
2. `/src/hooks/use-split-creation.ts` - React hook for split creation
3. `/src/components/proposals/builder/forms/droposal/SplitRecipientsSection.tsx` - Recipient UI
4. `/src/components/proposals/builder/forms/droposal/SplitDebugPanel.tsx` - Test panel

### Modified Files
1. `/src/components/proposals/builder/forms/droposal-form.tsx` - Added toggle and integration
2. `/src/components/proposals/schema.ts` - Extended with split fields
3. `/src/lib/config.ts` - Added SPLITS_ADDRESSES constant

### Dependencies
- `@0xsplits/splits-sdk` v6.3.0

## Best Practices

1. **Always test split creation first** before submitting proposal
2. **Use 1-2% distributor fee** to ensure bots trigger distribution
3. **Double-check addresses** - splits are immutable
4. **Verify percentages sum to 100%** before creation
5. **Use immutable controller** (0x0000...) for trustless splits
6. **View split on splits.org** after creation to verify configuration

## Troubleshooting

### "Fix validation errors before creating split"
- Check that percentages sum to exactly 100%
- Ensure minimum 2 recipients
- Verify all addresses are valid

### Transaction fails
- Check wallet has enough ETH for gas
- Ensure connected to Base network (chain ID 8453)
- Verify all addresses are valid Base addresses

### Split not appearing in proposal
- Check that "Use Revenue Split" toggle is ON
- Verify split was successfully created (check SplitDebugPanel)
- Ensure createdSplitAddress is populated

## Future Enhancements

- [ ] ENS name resolution for recipient addresses
- [ ] Import existing split address (instead of always creating new)
- [ ] Preset templates (50/50, 80/20, team splits)
- [ ] Gas estimation before split creation
- [ ] Multi-token splits (ETH + ERC20s)
- [ ] Mutable splits (with controller address)
