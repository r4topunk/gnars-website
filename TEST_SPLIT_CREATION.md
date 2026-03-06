# Manual Test Plan: Split Creation on Droposal

## Setup
- ✅ Dev server running: `http://localhost:3007`
- ✅ Code changes deployed
- ✅ Build passed

## Test Steps

### 1. Conectar Carteira
1. Navigate to http://localhost:3007/propose
2. Click "Connect" button (top right)
3. Connect wallet with Base network
4. Ensure wallet has:
   - ≥0.001 ETH for gas (split creation)
   - Must be on Base mainnet (chainId: 8453)

### 2. Preencher Detalhes da Proposta
1. Tab "Details" (step 1/3)
2. Fill:
   - **Proposal Title:** "Test Droposal Split Creation"
   - **Description:** "Testing automatic split contract creation"
   - **Banner Image:** (optional)
3. Click "Next: Add Transactions"

### 3. Criar Droposal Transaction
1. Tab "Transactions" (step 2/3)
2. Click "Create Droposal" card
3. Fill basic info:
   - **Collection Name:** "Test Drop"
   - **Collection Symbol:** "TESTDROP"
   - **Collection Description:** "Testing split creation"
   - **Price per NFT:** "0.001"

### 4. Configure Media
1. Scroll to "Media" section
2. Upload or paste IPFS URL:
   - **Animation URI:** (video/animation)
   - **Image URI:** (fallback image)

### 5. Enable Split (CRITICAL STEP)
1. Scroll to "Pricing & Supply" section
2. Toggle **"Use Revenue Split"** → ON
3. Should see "Split Recipients" section appear

### 6. Configure Split Recipients
1. Default recipients should appear:
   - Treasury: 50%
   - Creator: 50%
2. Verify percentages add up to 100%
3. (Optional) Click "Add Recipient" to test multiple recipients

### 7. Save Transaction (TRIGGER SPLIT CREATION)
1. Click "Save Transaction" button (bottom right)
2. **EXPECTED BEHAVIOR:**
   - Button text changes to "Creating Split..."
   - Loading spinner appears
   - Wallet prompts for signature (createSplit transaction)
   - Wait ~5-10 seconds for split creation
   - Green success alert appears with split address

### 8. Verify Split Creation
After transaction completes:

**Check 1: UI Feedback**
- ✅ Green alert box appears
- ✅ Shows split contract address (0x...)
- ✅ Link to splits.org is present

**Check 2: Console Logs**
Open browser DevTools → Console, verify:
```
🔄 Creating split contract...
✅ Split created: 0x... (address)
```

**Check 3: Form State**
In DevTools → React DevTools → ProposalWizard:
```js
transactions[0].createdSplitAddress = "0x..." // Should be populated
transactions[0].payoutAddress = "0x..." // Should match split address
transactions[0].useSplit = true
```

**Check 4: On-Chain (Basescan)**
1. Copy split address from green alert
2. Go to https://basescan.org/address/0x...
3. Verify:
   - Contract created
   - "Contract Creator" is your wallet
   - No transactions yet (split not activated)

**Check 5: Splits.org**
1. Click "View on Splits.org" link in alert
2. Or go to: `https://app.splits.org/accounts/{splitAddress}/?chainId=8453`
3. Verify:
   - Recipients match configuration
   - Percentages match
   - Distributor fee is correct

### 9. Preview Proposal
1. Click "Next: Preview & Submit"
2. **EXPECTED BEHAVIOR:**
   - In "Proposed Transactions" section
   - Droposal shows:
     - **Payout Address:** Split contract (NOT treasury)
     - **Funds Recipient:** 0x... (split address)

### 10. Submit Proposal (Optional)
If testing on testnet:
1. Click "Submit Proposal"
2. Wallet prompts for propose transaction
3. Verify on-chain after submission

---

## Expected vs Buggy Behavior

### ✅ AFTER FIX (Expected)
```
User enables split
  ↓
Configures recipients (50% treasury, 50% artist)
  ↓
Clicks "Save Transaction"
  ↓
System automatically creates split contract (wallet signature required)
  ↓
Split address saved as payoutAddress
  ↓
Preview shows split address (NOT treasury)
  ↓
Proposal executes → funds go to split contract
```

### ❌ BEFORE FIX (Buggy)
```
User enables split
  ↓
Configures recipients
  ↓
Clicks "Save Transaction"
  ↓
NO split contract created
  ↓
payoutAddress = empty
  ↓
Preview shows treasury (fallback)
  ↓
Proposal executes → funds go to treasury (recipients ignored!)
```

---

## Troubleshooting

### Error: "Split configuration invalid"
- Check percentages add up to 100%
- Verify all addresses are valid Ethereum addresses
- Ensure at least 1 recipient

### Error: "Failed to create split contract"
- Check wallet is connected
- Verify network is Base (chainId 8453)
- Ensure sufficient ETH for gas
- Check console for detailed error

### Wallet doesn't prompt
- Check wallet is unlocked
- Try refreshing page
- Check network (must be Base)

### Split address not appearing in preview
- Verify createdSplitAddress is saved in form state
- Check console for errors
- Ensure split creation succeeded (green alert appeared)

---

## Test Cases Checklist

- [ ] Split creation with 2 recipients (50/50)
- [ ] Split creation with 3+ recipients
- [ ] Split creation with distributor fee
- [ ] Cancel while split is being created (form reset)
- [ ] Split creation fails (error handling)
- [ ] User changes recipients after creating split (should clear old split)
- [ ] Preview shows split address (not treasury)
- [ ] Proposal submission includes split address

---

## Production Test

After manual test passes in dev:
1. Deploy to staging/production
2. Create test proposal with split
3. Verify split contract on Basescan
4. DO NOT submit proposal (delete draft)
5. If split works, document for team

---

## Rollback Plan

If split creation fails in production:
1. Revert commits:
   ```bash
   git revert HEAD~1  # Revert droposal-form.tsx
   git revert HEAD~2  # Revert ActionForms.tsx
   ```
2. Redeploy
3. Users can manually create splits via splits.org
4. Debug issue and re-deploy fixed version
