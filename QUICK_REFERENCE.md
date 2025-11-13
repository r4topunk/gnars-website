# Quick Reference - Video Upload & Coin Creation

## TL;DR - The Key Insight

**Videos work exactly like images!** Just pass the video file to `.withImage()` and the Zora SDK handles everything.

```typescript
// This works for BOTH images and videos:
builder.withImage(mediaFile);
```

---

## Essential Files Map

| File | Purpose | Lines |
|------|---------|-------|
| `src/app/create-coin/page.tsx` | UI form & success screen | 506 |
| `src/hooks/useCreateCoin.ts` | Core deployment logic | 276 |
| `src/lib/zora/factoryAbi.ts` | Contract ABI | 85 |
| `src/lib/zora/poolConfig.ts` | Pool config encoder | 157 |
| `scripts/deploy-gnars-content-coin.ts` | CLI deployment | 167 |

---

## Key Addresses (Base Chain)

```typescript
ZORA_FACTORY          = 0x777777751622c0d3258f214F9DF38E35BF45baF3
GNARS_CREATOR_COIN    = 0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b
GNARS_DAO_TREASURY    = 0x72ad986ebac0246d2b3c565ab2a1ce3a14ce6f88
```

---

## Required Environment Variable

```bash
NEXT_PUBLIC_ZORA_API_KEY="your-key-here"
```

---

## Supported File Types

### Images ✅
- JPEG, JPG, PNG, GIF, WebP, SVG

### Videos ✅
- MP4, WebM, MOV (QuickTime), M4V

**Max Size:** 50MB

---

## 5-Step Coin Creation Flow

1. **Upload Media** → Zora IPFS via SDK
2. **Encode Pool Config** → Doppler Multi-Curve V4
3. **Simulate TX** → Validate before signing
4. **Deploy Contract** → ZoraFactory.deploy()
5. **Extract Address** → From CoinCreatedV4 event

---

## Core Code Snippets

### Upload Any Media Type
```typescript
import { createMetadataBuilder, createZoraUploaderForCreator, setApiKey } from "@zoralabs/coins-sdk";

setApiKey(process.env.NEXT_PUBLIC_ZORA_API_KEY);

const builder = createMetadataBuilder()
  .withName(name)
  .withSymbol(symbol)
  .withDescription(description)
  .withImage(mediaFile);  // ← Works for images AND videos!

const uploader = createZoraUploaderForCreator(userAddress);
const { createMetadataParameters } = await builder.upload(uploader);
const metadataUri = createMetadataParameters.metadata.uri;
```

### Deploy Coin
```typescript
import { zoraFactoryAbi, ZORA_FACTORY_ADDRESS } from "@/lib/zora/factoryAbi";
import { encodeContentPoolConfigForCreator } from "@/lib/zora/poolConfig";
import { GNARS_CREATOR_COIN, PLATFORM_REFERRER } from "@/lib/config";

const poolConfig = encodeContentPoolConfigForCreator(GNARS_CREATOR_COIN);

await writeContract({
  address: ZORA_FACTORY_ADDRESS,
  abi: zoraFactoryAbi,
  functionName: "deploy",
  args: [
    userAddress,                // payoutRecipient
    [userAddress],             // owners
    metadataUri,               // IPFS URI
    name,                      // coin name
    symbol,                    // coin symbol
    poolConfig,                // encoded config
    PLATFORM_REFERRER,         // Gnars DAO
    "0x0000000000000000000000000000000000000000",
    "0x",
    saltBytes,                 // CREATE2 salt
  ],
  value: 0n,
});
```

### Extract Deployed Address
```typescript
const receipt = await waitForTransactionReceipt({ hash });

for (const log of receipt.logs) {
  const decoded = decodeEventLog({
    abi: zoraFactoryAbi,
    data: log.data,
    topics: log.topics,
  });
  
  if (decoded.eventName === "CoinCreatedV4") {
    const coinAddress = decoded.args.coin;
    // ✅ Got it!
  }
}
```

---

## File Validation Pattern

```typescript
const isImage = file.type.startsWith("image/");
const isVideo = file.type.startsWith("video/");

const isSupportedImage = SUPPORTED_IMAGE_TYPES.includes(file.type);
const isSupportedVideo = SUPPORTED_VIDEO_TYPES.includes(file.type);

if (isImage && !isSupportedImage) {
  throw new Error("Image type not supported");
}

if (isVideo && !isSupportedVideo) {
  throw new Error("Video type not supported");
}

if (file.size > 50 * 1024 * 1024) {
  throw new Error("File size must be less than 50MB");
}
```

---

## UI Preview Pattern

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

---

## Pool Config Structure

```typescript
// Encoded as: (uint8, address, int24[], int24[], uint16[], uint256[])
[
  4,                              // DOPPLER_MULTICURVE_UNI_V4
  GNARS_CREATOR_COIN,            // Backing currency
  [-328_000],                    // tickLower (placeholder)
  [-300_000],                    // tickUpper (placeholder)
  [2],                           // numDiscoveryPositions
  [100000000000000000n]         // maxDiscoverySupplyShare (0.1e18)
]
```

⚠️ **Production Note:** Replace placeholder tick values with validated parameters from Zora's configuration API.

---

## Navigation Addition

```typescript
// src/components/layout/DaoHeader.tsx
import { Coins } from "lucide-react";

{
  title: "Create Coin",
  href: "/create-coin",
  icon: Coins,
  description: "Create a new coin on Zora",
}
```

---

## Testing Checklist

- [ ] Upload image (PNG, JPEG, GIF, WebP, SVG)
- [ ] Upload video (MP4, WebM, MOV)
- [ ] Reject oversized files (>50MB)
- [ ] Reject unsupported types
- [ ] IPFS upload succeeds
- [ ] Transaction simulation passes
- [ ] Deployment succeeds
- [ ] Address extracted from event
- [ ] Success screen shows correctly

---

## Common Issues

| Issue | Solution |
|-------|----------|
| IPFS upload fails | Add `NEXT_PUBLIC_ZORA_API_KEY` |
| Transaction fails | Check pool config encoding |
| Video doesn't display | Re-encode with H.264 codec |
| No coin address | Check event parsing logic |

---

## CLI Deployment

```bash
# Set private key
export PRIVATE_KEY=0x...

# Edit configuration in script
vim scripts/deploy-gnars-content-coin.ts

# Run deployment
tsx scripts/deploy-gnars-content-coin.ts

# Output
{
  "predictedAddress": "0x...",
  "deployedAddress": "0x...",
  "transactionHash": "0x..."
}
```

---

## Dependency

```json
{
  "@zoralabs/coins-sdk": "^0.3.3"
}
```

**Install:** `pnpm add @zoralabs/coins-sdk`

---

## Official Documentation

- **Zora Coins:** https://docs.zora.co/coins
- **Factory Contract:** https://docs.zora.co/coins/contracts/factory
- **Viem Docs:** https://viem.sh
- **Wagmi Docs:** https://wagmi.sh

---

## Key Takeaway for Your Local Agent

```
"Use the exact same code for videos as images. 
The Zora SDK's .withImage() method accepts both file types 
and automatically handles metadata creation, IPFS upload, 
and proper field population. No special video-specific 
logic required!"
```

---

**For full details, see:** `VIDEO_COIN_CREATION_SUMMARY.md`
