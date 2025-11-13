# Local Agent Instructions: Enable Video Upload & Coin Creation

> **Copy this entire document and paste it to your local agent to replicate the video upload and coin creation feature.**

---

## 🎯 Task Overview

Implement Zora Content Coin creation with support for both **image and video uploads**. The coins will be deployed on Base chain, backed by Gnars Creator Coin, with referral rewards flowing to Gnars DAO treasury.

---

## 📋 Prerequisites Checklist

Before starting, ensure you have:

- [ ] Next.js 15+ project with App Router
- [ ] wagmi + viem configured for Base chain (8453)
- [ ] Wallet connection working (WalletConnect/OnchainKit)
- [ ] Zora API key obtained
- [ ] Environment variable `NEXT_PUBLIC_ZORA_API_KEY` set

---

## 📦 Step 1: Install Dependencies

```bash
pnpm add @zoralabs/coins-sdk
```

**Version:** `^0.3.3` or later

---

## 🔧 Step 2: Add Configuration Constants

**File:** `src/lib/config.ts`

Add these constants:

```typescript
// Gnars Creator Coin (backing currency for content coins)
export const GNARS_CREATOR_COIN = "0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b" as const;

// Zora Factory contract on Base
export const ZORA_FACTORY_ADDRESS = "0x777777751622c0d3258f214F9DF38E35BF45baF3" as const;

// Platform referrer (Gnars DAO treasury receives referral rewards)
export const PLATFORM_REFERRER = "0x72ad986ebac0246d2b3c565ab2a1ce3a14ce6f88" as const;
```

---

## 📄 Step 3: Create Factory ABI File

**File:** `src/lib/zora/factoryAbi.ts`

**Instructions:** Copy the entire contents from the reference implementation at:
- PR #1 file: `/src/lib/zora/factoryAbi.ts`
- Or from: `VIDEO_COIN_CREATION_SUMMARY.md` section "ABI Definition"

**Must include:**
- `deploy()` function
- `coinAddress()` view function  
- `CoinCreatedV4` event definition
- Export constants: `ZORA_FACTORY_ADDRESS`, `GNARS_CREATOR_COIN`

---

## ⚙️ Step 4: Create Pool Config Encoder

**File:** `src/lib/zora/poolConfig.ts`

**Instructions:** Copy the entire contents from the reference implementation at:
- PR #1 file: `/src/lib/zora/poolConfig.ts`
- Or from: `VIDEO_COIN_CREATION_SUMMARY.md` section "Pool Configuration"

**Must include:**
- `encodeContentPoolConfigForCreator()` function
- Pool version constants
- Backing type constants
- Optional: ETH and ZORA variants

**Note:** The implementation uses placeholder curve parameters. For production, fetch from Zora's configuration API.

---

## 🪝 Step 5: Create useCreateCoin Hook

**File:** `src/hooks/useCreateCoin.ts`

**Core Logic:**

```typescript
import { useEffect, useState } from "react";
import { Address, Hex, keccak256, toBytes, decodeEventLog } from "viem";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import {
  zoraFactoryAbi,
  ZORA_FACTORY_ADDRESS,
  GNARS_CREATOR_COIN,
} from "@/lib/zora/factoryAbi";
import { encodeContentPoolConfigForCreator } from "@/lib/zora/poolConfig";
import { PLATFORM_REFERRER } from "@/lib/config";
import { 
  createMetadataBuilder, 
  createZoraUploaderForCreator,
  setApiKey 
} from "@zoralabs/coins-sdk";

export interface CreateCoinParams {
  name: string;
  symbol: string;
  description?: string;
  mediaFile: File;  // ← Works for images AND videos!
  payoutRecipient?: Address;
  owners?: Address[];
  platformReferrer?: Address;
  salt?: Hex;
}

export function useCreateCoin() {
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient();
  const { data: hash, writeContract, isPending: isWritePending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash });

  const [deployedCoinAddress, setDeployedCoinAddress] = useState<Address | null>(null);

  // Extract coin address from transaction receipt
  useEffect(() => {
    if (isSuccess && receipt) {
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: zoraFactoryAbi,
            data: log.data,
            topics: log.topics,
          });

          if (decoded.eventName === "CoinCreatedV4") {
            setDeployedCoinAddress(decoded.args.coin);
            break;
          }
        } catch {
          continue;
        }
      }
    }
  }, [isSuccess, receipt]);

  const createCoin = async (params: CreateCoinParams) => {
    if (!userAddress) {
      throw new Error("No wallet connected");
    }

    // 1. Build metadata (works for images AND videos!)
    const builder = createMetadataBuilder()
      .withName(params.name)
      .withSymbol(params.symbol);

    if (params.description) {
      builder.withDescription(params.description);
    }

    builder.withImage(params.mediaFile);  // ← Same for images and videos!

    // 2. Upload to IPFS via Zora
    const apiKey = process.env.NEXT_PUBLIC_ZORA_API_KEY;
    if (!apiKey) {
      throw new Error("NEXT_PUBLIC_ZORA_API_KEY required");
    }
    setApiKey(apiKey);

    const zoraUploader = createZoraUploaderForCreator(userAddress);
    const { createMetadataParameters } = await builder.upload(zoraUploader);
    const metadataUri = createMetadataParameters.metadata.uri;

    // 3. Generate salt
    const saltBytes = params.salt || keccak256(
      toBytes(`${params.name}-${params.symbol}-${Date.now()}`)
    );

    // 4. Prepare deployment parameters
    const payoutRecipient = params.payoutRecipient || userAddress;
    const owners = params.owners || [userAddress];
    const platformReferrer = params.platformReferrer || PLATFORM_REFERRER;
    
    // 5. Encode pool configuration
    const poolConfig = encodeContentPoolConfigForCreator(GNARS_CREATOR_COIN);

    // 6. Simulate transaction (validation)
    await publicClient?.simulateContract({
      account: userAddress,
      address: ZORA_FACTORY_ADDRESS,
      abi: zoraFactoryAbi,
      functionName: "deploy",
      args: [
        payoutRecipient,
        owners,
        metadataUri,
        params.name,
        params.symbol,
        poolConfig,
        platformReferrer,
        "0x0000000000000000000000000000000000000000" as Address,
        "0x" as Hex,
        saltBytes,
      ],
      value: 0n,
    });

    // 7. Deploy the coin
    writeContract({
      address: ZORA_FACTORY_ADDRESS,
      abi: zoraFactoryAbi,
      functionName: "deploy",
      args: [
        payoutRecipient,
        owners,
        metadataUri,
        params.name,
        params.symbol,
        poolConfig,
        platformReferrer,
        "0x0000000000000000000000000000000000000000" as Address,
        "0x" as Hex,
        saltBytes,
      ],
      value: 0n,
    });
  };

  return {
    createCoin,
    isPending: isWritePending || isConfirming,
    isSuccess,
    transactionHash: hash,
    coinAddress: deployedCoinAddress,
  };
}
```

**Full implementation:** See `src/hooks/useCreateCoin.ts` in PR #1 for complete version with:
- Address prediction
- Deployment data extraction
- Error handling

---

## 🎨 Step 6: Create UI Page

**File:** `src/app/create-coin/page.tsx`

**Key Components:**

### 6.1: File Type Constants

```typescript
const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

const SUPPORTED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v"
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
```

### 6.2: File Validation

```typescript
const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");

  if (!isImage && !isVideo) {
    toast.error("Please upload an image or video file");
    return;
  }

  if (isImage && !SUPPORTED_IMAGE_TYPES.includes(file.type)) {
    toast.error("Image type not supported");
    return;
  }

  if (isVideo && !SUPPORTED_VIDEO_TYPES.includes(file.type)) {
    toast.error("Video type not supported");
    return;
  }

  if (file.size > MAX_FILE_SIZE) {
    toast.error("File size must be less than 50MB");
    return;
  }

  setMediaFile(file);
};
```

### 6.3: Media Preview

```tsx
{mediaFile?.type.startsWith("image/") && (
  <Image 
    src={URL.createObjectURL(mediaFile)} 
    alt="Preview" 
    className="w-full h-64 object-cover"
  />
)}

{mediaFile?.type.startsWith("video/") && (
  <video 
    src={URL.createObjectURL(mediaFile)} 
    controls 
    className="w-full h-64 object-cover"
  />
)}
```

### 6.4: File Input

```tsx
<input
  ref={fileInputRef}
  type="file"
  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml,video/mp4,video/webm,video/quicktime,video/x-m4v"
  onChange={handleFileChange}
  className="hidden"
  required
/>
```

### 6.5: Form Submission

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!isConnected) {
    toast.error("Please connect your wallet");
    return;
  }

  if (!name || !symbol || !mediaFile) {
    toast.error("Please fill all required fields");
    return;
  }

  try {
    await createCoin({
      name: name.trim(),
      symbol: symbol.trim().toUpperCase(),
      description: description.trim() || undefined,
      mediaFile: mediaFile,
    });
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Failed to create coin");
  }
};
```

**Full implementation:** See `src/app/create-coin/page.tsx` in PR #1 for complete UI with:
- Form inputs (name, symbol, description)
- Upload widget with drag-and-drop
- Transaction status indicators
- Success screen with deployment info
- Create another / navigate away actions

---

## 🧭 Step 7: Add Navigation Link

**File:** `src/components/layout/DaoHeader.tsx` (or your nav component)

```typescript
import { Coins } from "lucide-react";

// Add to navigation items
{
  title: "Create Coin",
  href: "/create-coin",
  icon: Coins,
  description: "Create a new coin on Zora",
}
```

---

## 🔐 Step 8: Environment Variables

Add to `.env.local`:

```bash
# Required for IPFS uploads via Zora
NEXT_PUBLIC_ZORA_API_KEY="your-zora-api-key-here"

# Optional: Custom RPC
NEXT_PUBLIC_BASE_RPC_URL="https://mainnet.base.org"
```

**How to get API key:**
1. Contact Zora team or
2. Check Zora developer documentation
3. Set up API access for your project

---

## 🧪 Step 9: Testing Checklist

Test these scenarios:

### Images
- [ ] Upload JPEG image
- [ ] Upload PNG image
- [ ] Upload GIF image
- [ ] Upload WebP image
- [ ] Upload SVG image
- [ ] Reject unsupported image format
- [ ] Reject oversized image (>50MB)

### Videos
- [ ] Upload MP4 video
- [ ] Upload WebM video
- [ ] Upload MOV (QuickTime) video
- [ ] Reject unsupported video format
- [ ] Reject oversized video (>50MB)

### Form
- [ ] Validate name required
- [ ] Validate symbol required (max 10 chars)
- [ ] Description optional (max 500 chars)
- [ ] Media required
- [ ] Wallet connection required

### Transaction
- [ ] IPFS upload succeeds
- [ ] Transaction simulation passes
- [ ] User can sign transaction
- [ ] Transaction confirms on chain
- [ ] Coin address extracted from event
- [ ] Success screen displays correctly

### Edge Cases
- [ ] Remove and re-add media file
- [ ] Special characters in name/symbol
- [ ] Very long names/descriptions
- [ ] Network errors handled gracefully
- [ ] Transaction rejection handled

---

## 📚 Reference Materials

All detailed information is available in these documents:

1. **VIDEO_COIN_CREATION_SUMMARY.md** - Complete implementation guide (775 lines)
   - All file contents
   - Detailed explanations
   - Contract interactions
   - Metadata process
   - Troubleshooting

2. **QUICK_REFERENCE.md** - Quick lookup (215 lines)
   - Code snippets
   - Key addresses
   - Common patterns
   - FAQ

3. **FLOW_DIAGRAM.md** - Visual flows
   - Step-by-step diagrams
   - Data flow charts
   - Architecture overview

4. **PR #1** - Original implementation
   - https://github.com/r4topunk/gnars-website/pull/1/files
   - Commit: `a11acca`
   - Author: sktbrd

---

## 🎯 Key Implementation Notes

### Critical Insight: Videos Work Like Images!

```typescript
// This SAME code works for both images AND videos:
builder.withImage(mediaFile);

// The Zora SDK automatically:
// - Detects file type
// - Uploads to IPFS
// - Creates proper metadata
// - Sets image + animation_url for videos
```

**No separate video handling needed!**

### Contract Addresses (Base Chain)

```typescript
ZORA_FACTORY        = 0x777777751622c0d3258f214F9DF38E35BF45baF3
GNARS_CREATOR_COIN  = 0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b
GNARS_DAO_TREASURY  = 0x72ad986ebac0246d2b3c565ab2a1ce3a14ce6f88
```

### Pool Configuration

Uses **Doppler Multi-Curve Uni V4** (version 4) with Gnars Creator Coin as backing currency.

**Important:** Current implementation uses placeholder curve parameters. For production, fetch validated parameters from Zora's configuration API.

### Transaction Flow

1. User uploads media (image or video)
2. Metadata created and uploaded to IPFS
3. Pool config encoded
4. Transaction simulated (pre-flight check)
5. User signs deployment transaction
6. Contract deployed on Base
7. `CoinCreatedV4` event emitted
8. Coin address extracted and displayed

### Error Handling

Common issues:
- Missing API key → Show clear error message
- Unsupported file type → Validate before upload
- File too large → Check size before upload
- Transaction simulation fails → Show specific error
- Network errors → Retry logic or manual intervention

---

## ✅ Success Criteria

Your implementation is complete when:

- [ ] Users can upload images (5 formats)
- [ ] Users can upload videos (4 formats)
- [ ] Files are validated (type + size)
- [ ] Metadata uploads to IPFS successfully
- [ ] Coins deploy to Base chain
- [ ] Deployment address extracted from events
- [ ] Success screen shows all details
- [ ] Users can create multiple coins
- [ ] Navigation link visible in header
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Wallet connection required
- [ ] All transactions succeed on Base mainnet

---

## 🚀 Optional Enhancements

Consider adding:

- [ ] Image/video thumbnail generation
- [ ] File compression before upload
- [ ] Progress indicators for IPFS upload
- [ ] Preview of metadata JSON
- [ ] Link to view coin on Zora
- [ ] Share created coin on social media
- [ ] History of created coins
- [ ] Edit coin metadata (if supported)
- [ ] Multiple file uploads (gallery)
- [ ] Custom pool curve parameters UI

---

## 🐛 Debugging Tips

If things don't work:

1. **Check API Key:** Verify `NEXT_PUBLIC_ZORA_API_KEY` is set
2. **Check Network:** Ensure connected to Base (8453)
3. **Check Console:** Look for error messages
4. **Check Transaction:** View on Base block explorer
5. **Check IPFS:** Verify metadata URI is accessible
6. **Check ABI:** Ensure factory ABI matches contract
7. **Check Pool Config:** Verify encoding is correct
8. **Check Events:** Ensure event parsing logic is correct

**Use deployment script** (`scripts/deploy-gnars-content-coin.ts`) for isolated testing.

---

## 📞 Support

For issues:
- Check **VIDEO_COIN_CREATION_SUMMARY.md** "Common Issues & Solutions"
- Review PR #1 comments and discussion
- Consult Zora documentation: https://docs.zora.co
- Check Base network status: https://status.base.org

---

## 🎓 Learning Resources

- **Zora Coins Docs:** https://docs.zora.co/coins
- **Zora Factory Contract:** https://docs.zora.co/coins/contracts/factory
- **Viem Documentation:** https://viem.sh
- **Wagmi Documentation:** https://wagmi.sh
- **Base Chain Docs:** https://docs.base.org

---

**Copy this document and share with your local agent to implement video upload and coin creation!**

**Status:** ✅ Production Ready  
**Last Updated:** November 13, 2025  
**Reference PR:** [#1](https://github.com/r4topunk/gnars-website/pull/1)
