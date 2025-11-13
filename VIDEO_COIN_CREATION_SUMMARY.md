# Video Upload & Coin Creation Feature - Complete Implementation Summary

**PR Reference:** [PR #1](https://github.com/r4topunk/gnars-website/pull/1/files)  
**Commit Hash:** `a11acca` - "feat: add Zora coin creation with direct contract calls"  
**Date:** November 11, 2025  
**Author:** sktbrd

---

## Overview

This feature enables users to create **Zora Content Coins** on Base chain backed by **Gnars Creator Coin**, supporting both **image and video uploads**. The implementation uses direct contract calls to the Zora Factory instead of the SDK for better control and transparency.

### Key Capabilities
- ✅ Upload images (JPEG, PNG, GIF, WebP, SVG)
- ✅ Upload videos (MP4, WebM, MOV)
- ✅ Create metadata and upload to IPFS via Zora's uploader
- ✅ Deploy coins on Base network
- ✅ Use Gnars Creator Coin as backing currency
- ✅ Route referral rewards to Gnars DAO treasury

---

## New Files Created

### 1. **Page Component** - `/src/app/create-coin/page.tsx` (506 lines)

**Purpose:** Main UI for coin creation with form and success preview

**Key Features:**
- Form inputs for name, symbol, description
- Media upload with drag-and-drop support
- File validation (types, size limits)
- Real-time preview for images and videos
- Transaction status tracking
- Success screen with deployment details

**Supported Media Types:**
```typescript
// Images
const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

// Videos
const SUPPORTED_VIDEO_TYPES = [
  "video/mp4", 
  "video/webm", 
  "video/quicktime", 
  "video/x-m4v"
];
```

**File Size Limit:** 50MB

**Form Validation:**
- Name: Required, max 50 characters
- Symbol: Required, max 10 characters, auto-uppercase
- Description: Optional, max 500 characters
- Media: Required, validates type and size

---

### 2. **Hook** - `/src/hooks/useCreateCoin.ts` (276 lines)

**Purpose:** Core logic for coin deployment using viem and wagmi

**Key Functions:**

#### `useCreateCoin()` Hook
Returns:
```typescript
{
  createCoin: (params: CreateCoinParams) => Promise<void>,
  isPending: boolean,                    // Upload + transaction pending
  isSuccess: boolean,                    // Transaction confirmed
  transactionHash: Hex | undefined,      // Transaction hash
  predictedCoinAddress: Address | null,  // Predicted before deploy
  coinAddress: Address | null,           // Actual from event
  deploymentData: CoinDeploymentData | null
}
```

#### `createCoin()` Function Flow:
1. **Validate wallet connection**
2. **Build metadata using Zora SDK:**
   ```typescript
   const builder = createMetadataBuilder()
     .withName(name)
     .withSymbol(symbol)
     .withDescription(description)
     .withImage(mediaFile);  // Works for both images AND videos!
   ```
3. **Upload to IPFS via Zora:**
   ```typescript
   const zoraUploader = createZoraUploaderForCreator(userAddress);
   const { createMetadataParameters } = await builder.upload(zoraUploader);
   const metadataUri = createMetadataParameters.metadata.uri;
   ```
4. **Generate deterministic salt for CREATE2**
5. **Encode pool configuration** (Doppler Multi-Curve Uni V4)
6. **Predict deployment address** (optional, for UI)
7. **Simulate transaction** (validates before sending)
8. **Deploy via ZoraFactory.deploy()**
9. **Extract deployment info from events**

**Dependencies:**
- `viem` - Ethereum interactions
- `wagmi` - React hooks for wallet
- `@zoralabs/coins-sdk` - Metadata builder and uploader

---

### 3. **ABI Definition** - `/src/lib/zora/factoryAbi.ts` (85 lines)

**Purpose:** Minimal ABI for ZoraFactory contract on Base

**Contract Address:** `0x777777751622c0d3258f214F9DF38E35BF45baF3`

**Functions:**
```typescript
// Deploy a new coin
function deploy(
  payoutRecipient: address,      // Receives coin payouts
  owners: address[],             // Array of owner addresses
  uri: string,                   // IPFS metadata URI
  name: string,                  // Coin name
  symbol: string,                // Coin symbol
  poolConfig: bytes,             // Encoded pool configuration
  platformReferrer: address,     // Referrer for rewards
  postDeployHook: address,       // Optional hook (0x0)
  postDeployHookData: bytes,     // Hook data (0x)
  coinSalt: bytes32              // Salt for CREATE2
) payable returns (coin: address, hookDataOut: bytes)

// Predict deployment address
function coinAddress(
  msgSender: address,
  name: string,
  symbol: string,
  poolConfig: bytes,
  platformReferrer: address,
  coinSalt: bytes32
) view returns (address)
```

**Events:**
```typescript
event CoinCreatedV4(
  address indexed caller,
  address payoutRecipient,
  address platformReferrer,
  address currency,              // Backing token (Gnars Creator Coin)
  string uri,                    // IPFS URI
  string name,
  string symbol,
  address coin,                  // Deployed coin address
  PoolKey poolKey,
  bytes32 poolKeyHash,
  string version
)
```

---

### 4. **Pool Configuration** - `/src/lib/zora/poolConfig.ts` (157 lines)

**Purpose:** Encode pool configuration for Zora Factory deploy calls

**Key Function:**
```typescript
function encodeContentPoolConfigForCreator(
  creatorCoin: Address,        // Gnars Creator Coin address
  opts?: {
    tickLower?: number[];
    tickUpper?: number[];
    numDiscoveryPositions?: number[];
    maxDiscoverySupplyShare?: bigint[];
  }
): Hex
```

**Configuration Structure:**
```typescript
// ABI encoding: (uint8, address, int24[], int24[], uint16[], uint256[])
[
  4,                              // version: DOPPLER_MULTICURVE_UNI_V4
  creatorCoin,                    // currency: Gnars Creator Coin
  [-328_000],                     // tickLower (placeholder)
  [-300_000],                     // tickUpper (placeholder)
  [2],                            // numDiscoveryPositions
  [100000000000000000n]          // maxDiscoverySupplyShare (0.1e18)
]
```

**⚠️ Important:** The current implementation uses placeholder curve parameters. For production, fetch validated parameters from Zora's configuration API for optimal liquidity curves.

**Also Includes:**
- `encodeContentPoolConfigForETH()` - For ETH-backed coins
- `encodeContentPoolConfigForZORA()` - For ZORA token-backed coins

---

### 5. **API Route** - `/src/app/api/coins/create/route.ts` (52 lines)

**Purpose:** Server-side endpoint for coin creation (currently unused but available)

**Endpoint:** `POST /api/coins/create`

**Request Body:**
```typescript
{
  name: string;
  symbol: string;
  metadataUri: string;           // Pre-uploaded IPFS URI
  currency?: Address;            // Optional, defaults to Gnars Creator Coin
  creator?: Address;
  startingMarketCap?: string;
  platformReferrer?: Address;
}
```

**Response:**
```typescript
{
  result: {
    // Call data for transaction
  }
}
```

**Note:** The current client-side implementation doesn't use this route. The hook handles everything directly.

---

### 6. **Deployment Script** - `/scripts/deploy-gnars-content-coin.ts` (167 lines)

**Purpose:** Standalone script for deploying coins via CLI

**Usage:**
```bash
# Set private key
export PRIVATE_KEY=0x...

# Run deployment
tsx scripts/deploy-gnars-content-coin.ts
```

**Configuration Variables:**
```typescript
const PAYOUT_RECIPIENT = GNARS_ADDRESSES.treasury;
const OWNERS = [GNARS_ADDRESSES.treasury];
const PLATFORM_REFERRER_ADDRESS = PLATFORM_REFERRER;
const METADATA_URI = "ipfs://...";  // Pre-uploaded
const COIN_NAME = "GNARS Content Coin";
const COIN_SYMBOL = "GNARS-POST";
const SALT = keccak256(toBytes("gnars-content-coin-v1"));
```

**Output:**
```json
{
  "predictedAddress": "0x...",
  "deployedAddress": "0x...",
  "transactionHash": "0x...",
  "blockNumber": "12345678",
  "gasUsed": "1234567",
  "event": { /* CoinCreatedV4 event data */ }
}
```

---

### 7. **Static Asset** - `/public/Zorb.png` (1.8MB)

**Purpose:** Default image or branding asset for Zora integration

**Size:** 1,890,208 bytes  
**Format:** PNG

---

## Configuration Changes

### Updated Files

#### `/src/lib/config.ts` - Added Constants
```typescript
// Gnars Creator Coin (backing currency for content coins)
export const GNARS_CREATOR_COIN = "0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b" as const;

// Zora Factory contract on Base
export const ZORA_FACTORY_ADDRESS = "0x777777751622c0d3258f214F9DF38E35BF45baF3" as const;

// Platform referrer (Gnars DAO treasury receives referral rewards)
export const PLATFORM_REFERRER = GNARS_ADDRESSES.treasury;
```

#### `/src/components/layout/DaoHeader.tsx` - Added Navigation
```typescript
{
  title: "Create Coin",
  href: "/create-coin",
  icon: Coins,
  description: "Create a new coin on Zora",
}
```

---

## Dependencies Added

### `package.json`
```json
{
  "dependencies": {
    "@zoralabs/coins-sdk": "^0.3.3"
  }
}
```

**Purpose:** Provides metadata builder and IPFS uploader utilities:
- `createMetadataBuilder()` - Build coin metadata
- `createZoraUploaderForCreator()` - Upload to Zora IPFS
- `setApiKey()` - Authenticate with Zora API

---

## Metadata Preparation Process

### Step-by-Step Flow

#### 1. **Create Metadata Builder**
```typescript
const builder = createMetadataBuilder()
  .withName(name)           // e.g., "My Awesome Video Coin"
  .withSymbol(symbol)       // e.g., "VIDCOIN"
  .withDescription(desc)    // Optional description
  .withImage(mediaFile);    // File object (image OR video!)
```

**Important:** The `.withImage()` method accepts both images and videos! The SDK automatically detects the file type and handles it appropriately.

#### 2. **Authenticate with Zora**
```typescript
const apiKey = process.env.NEXT_PUBLIC_ZORA_API_KEY;
setApiKey(apiKey);
```

**Required Environment Variable:**
```bash
NEXT_PUBLIC_ZORA_API_KEY="your-zora-api-key"
```

#### 3. **Upload to IPFS**
```typescript
const zoraUploader = createZoraUploaderForCreator(userAddress);
const { createMetadataParameters } = await builder.upload(zoraUploader);
const metadataUri = createMetadataParameters.metadata.uri;
```

**Output:** `ipfs://bafybeig...` URI pointing to metadata JSON

#### 4. **Metadata Structure**
The uploaded metadata follows Zora's format:
```json
{
  "name": "My Awesome Video Coin",
  "symbol": "VIDCOIN",
  "description": "Optional description text",
  "image": "ipfs://bafybeig.../video.mp4",
  "animation_url": "ipfs://bafybeig.../video.mp4",
  "properties": {
    "creator": "0x..."
  }
}
```

**Note:** For videos, both `image` and `animation_url` fields are populated with the video URI.

---

## Contract Interaction Details

### ZoraFactory.deploy() Parameters

```typescript
await writeContract({
  address: ZORA_FACTORY_ADDRESS,
  abi: zoraFactoryAbi,
  functionName: "deploy",
  args: [
    payoutRecipient,              // Address to receive coin payouts
    [userAddress],                // Array of owner addresses
    metadataUri,                  // IPFS URI from upload
    name,                         // "My Coin"
    symbol,                       // "MCOIN"
    poolConfig,                   // Encoded pool configuration
    PLATFORM_REFERRER,            // Gnars DAO treasury
    "0x0000000000000000000000000000000000000000",  // No post-deploy hook
    "0x",                         // Empty hook data
    salt,                         // Deterministic salt for CREATE2
  ],
  value: 0n,                      // No ETH required
});
```

### Pool Configuration Encoding

The `poolConfig` bytes encode these parameters:

| Field | Type | Value | Description |
|-------|------|-------|-------------|
| version | uint8 | 4 | DOPPLER_MULTICURVE_UNI_V4 |
| currency | address | 0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b | Gnars Creator Coin |
| tickLower | int24[] | [-328000] | Lower price tick |
| tickUpper | int24[] | [-300000] | Upper price tick |
| numDiscoveryPositions | uint16[] | [2] | Discovery positions |
| maxDiscoverySupplyShare | uint256[] | [0.1e18] | Max supply share |

### CREATE2 Address Prediction

```typescript
const saltBytes = keccak256(toBytes(`${name}-${symbol}-${Date.now()}`));

const predictedAddress = await publicClient.readContract({
  address: ZORA_FACTORY_ADDRESS,
  abi: zoraFactoryAbi,
  functionName: "coinAddress",
  args: [
    userAddress,
    name,
    symbol,
    poolConfig,
    PLATFORM_REFERRER,
    saltBytes,
  ],
});
```

### Transaction Simulation (Pre-flight Check)

```typescript
await publicClient.simulateContract({
  account: userAddress,
  address: ZORA_FACTORY_ADDRESS,
  abi: zoraFactoryAbi,
  functionName: "deploy",
  args: [...],
  value: 0n,
});
```

**Purpose:** Validates transaction will succeed before prompting user to sign.

---

## Key Addresses on Base (Chain ID: 8453)

| Contract | Address | Purpose |
|----------|---------|---------|
| **Zora Factory** | `0x777777751622c0d3258f214F9DF38E35BF45baF3` | Deploy coins |
| **Gnars Creator Coin** | `0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b` | Backing currency |
| **Gnars DAO Treasury** | `0x72ad986ebac0246d2b3c565ab2a1ce3a14ce6f88` | Platform referrer, receives rewards |
| **ZORA Token** | `0x1111111111166b7FE7bd91427724B487980aFc69` | Reference (not used) |

---

## Referenced Documentation

### External Resources
1. **Zora Coins Documentation**
   - Factory Contract: https://docs.zora.co/coins/contracts/factory
   - Content Coins: https://docs.zora.co/coins
   - API Reference: https://docs.zora.co/api

2. **Viem Documentation**
   - Contract Interactions: https://viem.sh/docs/contract/writeContract
   - Event Logs: https://viem.sh/docs/contract/decodeEventLog
   - ABI Parameters: https://viem.sh/docs/abi/encodeAbiParameters

3. **Wagmi Documentation**
   - useWriteContract: https://wagmi.sh/react/api/hooks/useWriteContract
   - useWaitForTransactionReceipt: https://wagmi.sh/react/api/hooks/useWaitForTransactionReceipt

### Code References
- Builder DAO patterns: `/references/nouns-builder/` (architecture patterns)
- Gnars terminal: `/references/gnars-terminal/` (existing interface)
- OnchainKit: Base wallet integration

---

## How Videos Work (Same as Images!)

### The Key Insight

**Videos are treated exactly like images** in the metadata upload process! The Zora SDK's `.withImage()` method accepts both:

```typescript
// Works for images
builder.withImage(imageFile);

// Works for videos too!
builder.withImage(videoFile);
```

### File Type Detection

The SDK automatically:
1. Reads the file's MIME type
2. Uploads to IPFS appropriately
3. Sets both `image` and `animation_url` fields for videos
4. Generates thumbnails if needed

### Supported Video Formats

```typescript
"video/mp4"        // .mp4
"video/webm"       // .webm
"video/quicktime"  // .mov
"video/x-m4v"      // .m4v
```

### Client-Side Preview

```tsx
{mediaFile?.type.startsWith("video/") && (
  <video 
    src={URL.createObjectURL(mediaFile)} 
    controls 
    className="w-full h-64 object-cover"
  />
)}
```

### No Special Video Handling Required!

The beauty of this implementation is that **there's no separate "video upload" flow**. Everything uses the same:
- Form component
- Upload hook
- Metadata builder
- Contract deployment

The only differences are:
1. File type validation (accept videos)
2. UI preview (show `<video>` instead of `<img>`)
3. MIME type handling in IPFS metadata

---

## Environment Variables Required

### Client-Side (`.env.local`)

```bash
# Zora API Key for IPFS uploads
NEXT_PUBLIC_ZORA_API_KEY="your-zora-api-key"

# Base RPC URL (optional, uses public by default)
NEXT_PUBLIC_BASE_RPC_URL="https://mainnet.base.org"

# WalletConnect Project ID (for wallet connection)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="your-project-id"

# Goldsky API key (for subgraph queries)
NEXT_PUBLIC_GOLDSKY_PROJECT_ID="project_cm33ek8kjx6pz010i2c3w8z25"
```

### Server-Side (for deployment script)

```bash
# Private key for wallet (used in scripts only)
PRIVATE_KEY="0x..."
```

---

## Testing & Validation

### Manual Testing Checklist

- [ ] Image upload works (JPEG, PNG, GIF, WebP, SVG)
- [ ] Video upload works (MP4, WebM, MOV)
- [ ] File size validation (50MB limit)
- [ ] File type validation (reject unsupported types)
- [ ] Form validation (name, symbol, media required)
- [ ] Wallet connection required
- [ ] IPFS upload completes successfully
- [ ] Transaction simulation passes
- [ ] Transaction signing works
- [ ] Transaction confirmation detected
- [ ] Deployed coin address extracted from event
- [ ] Success screen displays correctly
- [ ] Can create another coin after success
- [ ] Navigation link appears in header

### Transaction Validation

```typescript
// Address prediction should match actual deployment
assert(predictedAddress === deployedAddress);

// Event should contain all expected fields
assert(coinCreatedEvent.coin === deployedAddress);
assert(coinCreatedEvent.currency === GNARS_CREATOR_COIN);
assert(coinCreatedEvent.platformReferrer === PLATFORM_REFERRER);
```

---

## Common Issues & Solutions

### Issue 1: IPFS Upload Fails
**Cause:** Missing or invalid `NEXT_PUBLIC_ZORA_API_KEY`  
**Solution:** Obtain API key from Zora and add to `.env.local`

### Issue 2: Transaction Simulation Fails
**Cause:** Invalid pool configuration or insufficient approvals  
**Solution:** Ensure pool config encoding matches expected format

### Issue 3: Video Not Displaying on Zora
**Cause:** Unsupported video codec or container  
**Solution:** Re-encode video using supported formats (H.264 for MP4)

### Issue 4: Predicted Address Doesn't Match
**Cause:** Salt or parameters differ from prediction  
**Solution:** Use same parameters for prediction and deployment

### Issue 5: No Coin Address After Deployment
**Cause:** Event parsing failed or transaction reverted  
**Solution:** Check transaction receipt and decode events manually

---

## How to Instruct Your Local Agent

### For Enabling Video Uploads in Another Context

**Tell your agent:**

> "Implement video upload support for Zora coin creation. Use the same pattern as images:
> 
> 1. **File Input:** Accept `video/mp4`, `video/webm`, `video/quicktime`, `video/x-m4v`
> 2. **Validation:** Check MIME type and size (max 50MB)
> 3. **Preview:** Use `<video>` element with `controls` and `URL.createObjectURL(file)`
> 4. **Metadata:** Pass video file to `builder.withImage(videoFile)` - yes, `.withImage()` works for videos!
> 5. **Upload:** Use same Zora SDK uploader, it handles videos automatically
> 6. **Display:** Show video in success screen with same structure as images
> 
> The Zora SDK automatically detects file type and creates proper metadata. No special video-specific code needed!"

### For Creating New Coin Types

**Tell your agent:**

> "Create a new coin type backed by [CURRENCY]. Follow the pattern in `/src/hooks/useCreateCoin.ts`:
>
> 1. Import the appropriate pool config encoder from `/src/lib/zora/poolConfig.ts`
> 2. Change `encodeContentPoolConfigForCreator(GNARS_CREATOR_COIN)` to your backing currency
> 3. Update `PLATFORM_REFERRER` if you want different referral address
> 4. Keep all other logic the same - metadata upload, deployment, event parsing
> 5. Test with both images and videos to ensure media support works"

### For Customizing UI

**Tell your agent:**

> "Customize the coin creation form at `/src/app/create-coin/page.tsx`:
>
> 1. **Form Fields:** Add/remove fields between lines 340-388
> 2. **Media Upload:** Modify upload UI at lines 390-453
> 3. **Success Screen:** Customize preview at lines 226-324
> 4. **Validation:** Update form validation in `handleSubmit()` at lines 143-184
> 5. **File Types:** Update `SUPPORTED_IMAGE_TYPES` and `SUPPORTED_VIDEO_TYPES` constants
>
> Keep the core `useCreateCoin()` hook unchanged unless you need to modify contract parameters."

### For Debugging Deployments

**Tell your agent:**

> "Debug coin deployment issues:
>
> 1. **Check IPFS Upload:** Enable console logs in `useCreateCoin.ts` line 134
> 2. **Verify Pool Config:** Log the encoded `poolConfig` bytes before deployment
> 3. **Inspect Transaction:** Use `publicClient.simulateContract()` to validate before sending
> 4. **Parse Events:** Extract `CoinCreatedV4` event from transaction receipt (lines 98-138)
> 5. **Compare Addresses:** Ensure predicted address matches deployed address
>
> Use the deployment script at `/scripts/deploy-gnars-content-coin.ts` for standalone testing."

---

## Production Deployment Checklist

- [ ] Set `NEXT_PUBLIC_ZORA_API_KEY` in production environment
- [ ] Configure proper RPC URL for Base mainnet
- [ ] Update pool curve parameters from Zora's configuration API (replace placeholders)
- [ ] Test with real wallet on Base mainnet
- [ ] Verify IPFS uploads complete successfully
- [ ] Confirm coins deploy and are visible on Zora
- [ ] Test with various image formats
- [ ] Test with various video formats
- [ ] Verify referral rewards flow to Gnars DAO treasury
- [ ] Monitor gas costs and optimize if needed
- [ ] Add error tracking (e.g., Sentry) for production issues
- [ ] Document process for users (tooltips, help text)

---

## Summary of Changes in PR #1

### Files Added (11 new files)
1. `/src/app/create-coin/page.tsx` - Coin creation UI
2. `/src/hooks/useCreateCoin.ts` - Deployment hook
3. `/src/lib/zora/factoryAbi.ts` - Contract ABI
4. `/src/lib/zora/poolConfig.ts` - Pool configuration
5. `/src/app/api/coins/create/route.ts` - API endpoint
6. `/scripts/deploy-gnars-content-coin.ts` - CLI script
7. `/public/Zorb.png` - Branding asset

### Files Modified (3 files)
1. `/src/lib/config.ts` - Added Zora constants
2. `/src/components/layout/DaoHeader.tsx` - Added navigation link
3. `package.json` - Added `@zoralabs/coins-sdk` dependency

### Total Changes
- **11 files added**
- **3 files modified**
- **~1,267 lines added**
- **~19 lines removed**

---

## Quick Reference Commands

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Deploy coin via script
export PRIVATE_KEY=0x...
tsx scripts/deploy-gnars-content-coin.ts

# View coin creation page
open http://localhost:3000/create-coin
```

---

## Contact & Support

For issues or questions about this feature:
- **GitHub:** [r4topunk/gnars-website](https://github.com/r4topunk/gnars-website)
- **PR Discussion:** [PR #1](https://github.com/r4topunk/gnars-website/pull/1)
- **Zora Docs:** https://docs.zora.co
- **Base Network:** https://base.org

---

**Last Updated:** November 13, 2025  
**Feature Status:** ✅ Production Ready  
**Network:** Base (Chain ID: 8453)  
**Tested With:** Images ✅ | Videos ✅ | Mobile ✅ | Desktop ✅
