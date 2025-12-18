# Multi-Swap Implementation Plan

## Overview
Implement a bulk content coin purchase feature that allows users to input ETH/ZORA and receive multiple creator tokens automatically using Splits Protocol's Diversifier template.

## Architecture Decision: Diversifier Contract

### Why Diversifier?
The Diversifier contract from Splits Protocol is the best approach because:

1. **Purpose-built for this use case** - Automatically splits incoming tokens into specific tokens at various ratios
2. **Composable architecture** - Stacks Pass-Through Wallet → Split → Multiple Swappers
3. **Proven & audited** - Battle-tested Splits contracts
4. **One-time deployment** - Can be reused for future bulk purchases
5. **Owner controls** - User owns their diversifier and can modify it

### Contract Flow
```
User (ETH) → PassThroughWallet → Split → [Swapper1, Swapper2, ...] → [Token1, Token2, ...]
```

## Implementation Steps

### Phase 1: UI Enhancement (Current State)
✅ **Already Completed:**
- BuyAllModal with coin selection (20 coins, 10 pre-selected)
- ETH amount input
- Per-coin allocation calculation
- Selection management UI

### Phase 2: Split Flow Visualization
**Reuse existing SplitFlowChart.tsx component**

Location: `src/components/proposals/builder/forms/droposal/SplitFlowChart.tsx`

**Modifications needed:**
1. Create a new component `DiversifierFlowChart.tsx` based on `SplitFlowChart.tsx`
2. Show: User → Split → Swappers (one per selected coin) → Token outputs
3. Display ETH allocation per swapper
4. Add token swap preview (ETH → token icon)

### Phase 3: Diversifier Creation Hook
Create `src/hooks/use-diversifier-creation.ts` based on `use-split-creation.ts`

```typescript
export interface UseDiversifierCreationResult {
  createDiversifier: (config: DiversifierConfig) => Promise<string | null>;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  diversifierAddress: string | null;
  txHash: string | null;
  reset: () => void;
}

export interface DiversifierConfig {
  owner: string; // User's address
  tokens: {
    address: string; // Coin/token address
    percentage: number; // Allocation %
    oracle?: string; // Price oracle (optional)
    discount?: number; // Slippage tolerance
  }[];
  distributorFeePercent?: number;
}
```

**Key differences from Split creation:**
- Uses Splits Templates SDK instead of basic SplitsClient
- Creates PassThroughWallet + Split + Swappers in one transaction
- Requires oracle addresses for each token swap
- Needs to handle slippage/discount parameters

### Phase 4: SDK Integration

**Install Templates SDK:**
```bash
pnpm add @0xsplits/splits-sdk-templates
```

**Example implementation:**
```typescript
import { TemplatesClient } from '@0xsplits/splits-sdk-templates';

const templatesClient = new TemplatesClient({
  chainId: 8453, // Base
  publicClient,
  walletClient,
});

// Create diversifier
const response = await templatesClient.createDiversifier({
  owner: userAddress,
  // Split configuration
  splitConfig: {
    recipients: tokens.map((token, i) => ({
      address: `swapper_${i}`, // Will be created
      percentAllocation: token.percentage
    })),
    distributorFeePercent: 0,
  },
  // Swapper configurations (one per token)
  swapperConfigs: tokens.map(token => ({
    beneficiary: userAddress,
    tokenToBeneficiary: token.address, // Output token
    oracleParams: {
      oracle: UNISWAP_V3_ORACLE, // Or custom oracle
      discount: token.discount || 0, // Slippage tolerance
    }
  }))
});
```

### Phase 5: Oracle Selection

**Challenge:** Need price oracles for token swaps

**Options:**
1. **Uniswap V3 TWAP** - Most reliable for established tokens
2. **0xSplits default oracles** - Pre-configured for major tokens
3. **Chainlink** - Most trusted but may not cover all tokens
4. **Custom oracle** - For lesser-known tokens (higher risk)

**Implementation:**
```typescript
// src/lib/diversifier-utils.ts
export function getOracleForToken(tokenAddress: string, chainId: number): string {
  // Check if token has Uniswap V3 pool
  // Fall back to default oracle
  // Return oracle address
}
```

### Phase 6: Transaction Flow

**Step-by-step user experience:**

1. **User selects coins and enters ETH amount**
   - UI: BuyAllModal (already built)
   - Show preview with per-coin allocation

2. **User clicks "Buy X Coins"**
   - Show loading state
   - Calculate split percentages
   - Fetch oracle addresses for each token

3. **Create Diversifier (if first time)**
   - Deploy PassThroughWallet + Split + Swappers
   - Show transaction progress
   - Save diversifier address to user's profile (optional)

4. **OR Reuse existing Diversifier**
   - Check if user already has a diversifier
   - Update split configuration if needed
   - Skip creation step

5. **Execute swap**
   - Send ETH to diversifier contract
   - Diversifier automatically:
     - Splits ETH according to percentages
     - Each swapper converts to target token
     - Tokens sent to user's wallet

6. **Show success**
   - Display tokens received
   - Link to block explorer
   - Update UI with new balances

### Phase 7: BuyAllModal Integration

**Add to BuyAllModal.tsx:**

```typescript
import { useDiversifierCreation } from "@/hooks/use-diversifier-creation";
import { DiversifierFlowChart } from "./DiversifierFlowChart";

// Inside component:
const [step, setStep] = useState<'select' | 'preview' | 'create' | 'execute'>('select');
const { createDiversifier, isPending, diversifierAddress } = useDiversifierCreation();

// Step 1: Selection (current UI)
// Step 2: Preview with flow chart
// Step 3: Create diversifier (if needed)
// Step 4: Execute swap
```

**UI States:**
- **Select** - Current selection UI
- **Preview** - Show DiversifierFlowChart + "Continue" button
- **Create** - "Creating diversifier contract..." with progress
- **Execute** - "Swapping ETH for tokens..." with progress
- **Success** - Show tokens received with confetti 🎉

### Phase 8: Error Handling & Edge Cases

**Handle:**
1. Insufficient ETH for gas + swap
2. Token has no oracle/pool → Disable selection
3. Slippage too high → Warn user
4. Transaction timeout → Retry logic
5. Diversifier creation fails → Rollback UI
6. Partial swap success → Show which tokens succeeded

### Phase 9: Optimization

**Future improvements:**
1. **Cache diversifier address** per wallet
2. **Reuse diversifier** for multiple bulk purchases
3. **Gas estimation** before transaction
4. **Simulate swap** to show expected output
5. **Support ZORA token input** (currently ETH only)
6. **Save favorite coin bundles** for quick access

## Technical Considerations

### Gas Costs
- **Diversifier creation**: ~500k gas (one-time)
- **Swap execution**: ~150k gas per token
- **Total for 10 tokens**: ~2M gas (~$10-20 at 5 gwei)

**Optimization:** Create diversifier once, reuse for all future swaps

### Slippage Protection
- Default: 5% discount (95% of oracle price)
- Allow user to adjust per-token
- Warn if price impact > 10%

### Security
- User owns their diversifier (can pause swappers)
- Oracle manipulation risk (use TWAP oracles)
- Approve only required amounts
- Validate all inputs client-side

## Files to Create/Modify

### New Files
1. `src/hooks/use-diversifier-creation.ts` - Hook for creating diversifier
2. `src/components/tv/DiversifierFlowChart.tsx` - Visual flow chart
3. `src/lib/diversifier-utils.ts` - Helper functions for diversifier config
4. `src/lib/oracle-registry.ts` - Oracle addresses for tokens
5. `docs/DIVERSIFIER_USAGE.md` - User documentation

### Modify
1. `src/components/tv/BuyAllModal.tsx` - Add multi-step flow
2. `package.json` - Add `@0xsplits/splits-sdk-templates`

## Testing Plan

1. **Unit tests** - Diversifier config generation
2. **Integration tests** - Mock diversifier creation
3. **E2E tests** - Full swap flow on testnet
4. **Manual testing** - Try with 1, 5, 10, 20 tokens

## Rollout Strategy

1. **Alpha** - Enable for team only (feature flag)
2. **Beta** - Open to select users with warning
3. **Production** - Remove limits, add analytics

## Open Questions

1. Should we cache diversifier per user or create new each time?
2. Do we need admin controls to pause/unpause swappers?
3. Should we support batch creation of multiple diversifiers?
4. How to handle tokens with no oracle?
5. Should we show real-time price updates in modal?

## Next Steps

1. Review this plan together
2. Decide on oracle strategy
3. Set up templates SDK
4. Create diversifier hook
5. Integrate flow chart
6. Test on Base testnet
7. Deploy to production

---

**Ready to start implementation?** Let's begin with creating the `use-diversifier-creation.ts` hook and oracle registry.
