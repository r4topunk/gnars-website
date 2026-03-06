# BUG: Droposal Split Configuration Not Creating Contract

## Problem
When a user enables "Use Revenue Split" on a droposal, the split contract is not automatically created. The system falls back to using the DAO treasury address instead of the intended split recipients.

## Root Cause
1. `SplitDebugPanel` only appears in development mode (`NODE_ENV === "development"`)
2. Even in dev, split creation is optional/manual (user must click "Test Create Split")
3. When transaction is saved without creating split, `payoutAddress` is empty
4. `encodeTransactions()` falls back to treasury: `(tx.payoutAddress || GNARS_ADDRESSES.treasury)`

## Files Affected
- `src/components/proposals/builder/forms/droposal-form.tsx` (lines 289-295)
- `src/components/proposals/builder/ActionForms.tsx` (handleSubmit logic)
- `src/lib/proposal-utils.ts` (line 140)

## Solution: Auto-Create Split Before Saving Transaction

### Step 1: Modify ActionForms.tsx

Add split creation logic before saving droposal transactions:

```typescript
// src/components/proposals/builder/ActionForms.tsx

import { useSplitCreation } from "@/hooks/use-split-creation";
import { validateSplitRecipients, prepareSplitConfigForSDK, IMMUTABLE_CONTROLLER } from "@/lib/splits-utils";

export function ActionForms({ index, actionType, onSubmit, onCancel }: ActionFormsProps) {
  const { handleSubmit, setValue, getValues } = useFormContext<ProposalFormValues>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [sdkError, setSDKError] = useState<string | null>(null);
  
  // Add split creation hook
  const { createSplit } = useSplitCreation();

  // ... existing code ...

  // NEW: Handle split creation for droposals
  const handleDroposalSubmit = async () => {
    const tx = getValues(`transactions.${index}`);

    if (tx.type !== "droposal") {
      onSubmit();
      return;
    }

    // Check if using split
    const useSplit = tx.useSplit;
    const splitRecipients = tx.splitRecipients;
    const splitDistributorFee = tx.splitDistributorFee || 0;

    if (!useSplit || !splitRecipients || splitRecipients.length === 0) {
      // Not using split, proceed normally
      onSubmit();
      return;
    }

    // Validate split configuration
    const validationErrors = validateSplitRecipients(splitRecipients);
    if (validationErrors.length > 0) {
      setSDKError(`Split configuration invalid: ${validationErrors.map(e => e.message).join(', ')}`);
      return;
    }

    setIsGenerating(true);
    setSDKError(null);

    try {
      // Create split contract
      const splitConfig = {
        recipients: splitRecipients,
        distributorFeePercent: splitDistributorFee,
        controller: IMMUTABLE_CONTROLLER,
      };

      const sdkConfig = prepareSplitConfigForSDK(splitConfig);
      const splitAddress = await createSplit(sdkConfig);

      if (!splitAddress) {
        throw new Error("Failed to create split contract - no address returned");
      }

      // Save split address to form
      setValue(`transactions.${index}.createdSplitAddress`, splitAddress);
      setValue(`transactions.${index}.payoutAddress`, splitAddress);

      console.log(`✅ Split created: ${splitAddress}`);

      // Proceed with submit
      onSubmit();
    } catch (error) {
      console.error("Error creating split:", error);
      setSDKError(error instanceof Error ? error.message : "Failed to create split contract");
    } finally {
      setIsGenerating(false);
    }
  };

  // Modify the submit button to use new handler
  return (
    <Card>
      <CardHeader>
        {/* ... existing header ... */}
      </CardHeader>
      <CardContent className="space-y-6">
        {renderForm()}

        {sdkError && (
          <Alert variant="destructive">
            <AlertDescription>{sdkError}</AlertDescription>
          </Alert>
        )}

        <Separator />

        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={onCancel} disabled={isGenerating}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit(
              actionType === 'droposal' ? handleDroposalSubmit : 
              actionType === 'buy-coin' ? handleBuyCoinSubmit : 
              onSubmit,
              onError
            )}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {actionType === 'droposal' ? 'Creating Split...' : 'Generating...'}
              </>
            ) : (
              "Save Transaction"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Step 2: Update Schema (if needed)

Ensure schema includes split-related fields:

```typescript
// src/components/proposals/schema.ts

export const droposalTransactionSchema = z.object({
  type: z.literal("droposal"),
  // ... existing fields ...
  useSplit: z.boolean().optional(),
  splitRecipients: z.array(splitRecipientSchema).optional(),
  splitDistributorFee: z.number().min(0).max(10).optional(),
  createdSplitAddress: z.string().optional(),
  payoutAddress: z.string().optional(),
});
```

### Step 3: Update droposal-form.tsx

Make split creation status visible (optional UX improvement):

```typescript
// src/components/proposals/builder/forms/droposal-form.tsx

// After line 295, add status alert when split is saved:
{createdSplitAddress && (
  <Alert className="bg-green-50 border-green-200">
    <Check className="h-4 w-4 text-green-600" />
    <AlertDescription>
      <div className="space-y-2">
        <strong className="text-green-900">Split Contract Ready</strong>
        <code className="block bg-white px-2 py-1 rounded text-xs border">
          {createdSplitAddress}
        </code>
        <p className="text-xs text-green-900">
          This address will receive NFT sales and be included in the proposal.
        </p>
      </div>
    </AlertDescription>
  </Alert>
)}
```

## Testing Checklist

1. ✅ User enables "Use Revenue Split"
2. ✅ Configures recipients (e.g., 50% treasury, 30% artist, 20% DAO member)
3. ✅ Clicks "Save Transaction"
4. ✅ System automatically creates split contract (user sees loading state)
5. ✅ Split address is saved as `payoutAddress`
6. ✅ Preview shows correct payout recipient (split address, not treasury)
7. ✅ When proposal executes, funds go to split contract
8. ✅ Recipients can withdraw their share from splits.org

## Edge Cases

- **User cancels while split is being created:** Transaction rolls back, form reset
- **Split creation fails:** Show error, allow retry, don't save transaction
- **User changes recipients after creating split:** Need to either:
  - Option A: Clear existing split, create new one on next save
  - Option B: Warn user split is immutable, must create new droposal
- **Network congestion:** Add timeout + retry logic to split creation

## Migration Notes

- Existing proposals (already submitted) are unaffected
- Future proposals will auto-create splits
- SplitDebugPanel can remain as dev-only preview tool
- No database migration needed (split address stored in proposal calldata)

## Estimated Impact

- **Severity:** HIGH (funds go to wrong recipient)
- **Frequency:** Every droposal with splits enabled
- **Users Affected:** All droposal creators using splits
- **Fix Complexity:** MEDIUM (SDK integration, async flow)
- **Testing Time:** ~2 hours (unit + integration + manual)
