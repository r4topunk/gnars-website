# ✅ Visual Test Results — Split Creation UI

## Screenshot Analysis (localhost:3007/propose)

### ✅ CONFIRMED: UI Components Present

**Step 1: Basic Information**
- ✅ Collection Name field
- ✅ Collection Symbol field  
- ✅ Collection Description field

**Step 2: Media Section**
- ✅ Media file upload area
- ✅ Supports video/image

**Step 3: Pricing & Supply**
- ✅ Price per NFT (ETH) field
- ✅ **"Use Revenue Split" toggle** 🎯 (THIS IS THE KEY COMPONENT)

**Step 4: Split Configuration** (visible when toggle is ON)
- ✅ Split recipients section expanded
- ✅ Shows 2 default recipients (50% + 50%)
- ✅ "Add Recipient" button
- ✅ "Distribute Evenly" option
- ✅ Split Creation Test Panel (dev mode)
- ✅ Configuration display:
  - Recipients: 2
  - Distributor Fee: 0%
  - Controller: Immutable

**Step 5: Split Creation Button**
- ✅ "🧪 Test Create Split" button (dev-only panel)
- ⚠️ **NOTE:** In production, split will be created automatically on "Save Transaction" (not via test panel)

---

## What Happens Next (Manual Test by Vlad)

### Prerequisites
1. Connect wallet (Base network)
2. Wallet must have ≥0.001 ETH for gas

### Critical Steps
1. Fill collection details
2. Toggle "Use Revenue Split" → ON
3. Configure recipients (or use defaults)
4. Click **"Save Transaction"** ← THIS TRIGGERS AUTO-CREATION

### Expected Behavior
```
Click "Save Transaction"
  ↓
Button text changes to "Creating Split..." ⏳
  ↓
Wallet prompts for signature 📝
  ↓
Wait ~5-10 seconds ⌛
  ↓
Green alert appears ✅
  ↓
Shows split address: 0x...
  ↓
Link to splits.org
```

### Verification
- [ ] Console logs: `✅ Split created: 0x...`
- [ ] Form state: `transactions[0].createdSplitAddress` populated
- [ ] Form state: `transactions[0].payoutAddress` = split address (NOT treasury)
- [ ] Preview tab shows split address (not 0x72aD...88)

---

## Known Limitation

**Dev Mode Only:**  
The "🧪 Split Creation Test Panel" only appears in dev (`NODE_ENV === "development"`).  

In production, users won't see the test panel — split will be created automatically when they click "Save Transaction" (no extra steps needed).

---

## Next: Vlad Tests in Production

After manual test in dev passes:
1. Deploy to production
2. Create test proposal with split
3. Verify split on Basescan
4. **DO NOT** submit proposal (delete draft)
5. Document results
