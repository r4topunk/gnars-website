# Video/Image Upload Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    USER INTERACTION (UI)                             │
│                  /src/app/create-coin/page.tsx                      │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1: User selects media file (image OR video)                   │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ Supported Types:                                            │    │
│  │ • Images: JPEG, PNG, GIF, WebP, SVG                        │    │
│  │ • Videos: MP4, WebM, MOV, M4V                              │    │
│  │ • Max Size: 50MB                                           │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 2: Create metadata builder (@zoralabs/coins-sdk)             │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  const builder = createMetadataBuilder()                    │    │
│  │    .withName(name)                                          │    │
│  │    .withSymbol(symbol)                                      │    │
│  │    .withDescription(description)                            │    │
│  │    .withImage(mediaFile);  // ← Works for BOTH!            │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 3: Upload to IPFS via Zora uploader                          │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  setApiKey(NEXT_PUBLIC_ZORA_API_KEY);                      │    │
│  │  const uploader = createZoraUploaderForCreator(address);   │    │
│  │  const { createMetadataParameters } =                       │    │
│  │    await builder.upload(uploader);                          │    │
│  │                                                             │    │
│  │  → Uploads media file to IPFS                              │    │
│  │  → Creates metadata JSON                                   │    │
│  │  → Returns: ipfs://bafybeig.../metadata.json               │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 4: Prepare pool configuration                                │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  const poolConfig = encodeContentPoolConfigForCreator(     │    │
│  │    GNARS_CREATOR_COIN  // 0x0cf0c3b75...                   │    │
│  │  );                                                         │    │
│  │                                                             │    │
│  │  Encodes: (version, currency, ticks, positions, shares)    │    │
│  │  → version: 4 (DOPPLER_MULTICURVE_UNI_V4)                  │    │
│  │  → currency: Gnars Creator Coin address                    │    │
│  │  → ticks: [-328000, -300000]                               │    │
│  │  → positions: [2]                                          │    │
│  │  → shares: [0.1e18]                                        │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 5: Simulate transaction (pre-flight check)                   │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  await publicClient.simulateContract({                      │    │
│  │    address: ZORA_FACTORY_ADDRESS,                          │    │
│  │    abi: zoraFactoryAbi,                                    │    │
│  │    functionName: "deploy",                                 │    │
│  │    args: [...],                                            │    │
│  │  });                                                        │    │
│  │                                                             │    │
│  │  ✓ Validates transaction will succeed                      │    │
│  │  ✗ Throws error if parameters invalid                      │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 6: Deploy coin contract                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  await writeContract({                                      │    │
│  │    address: ZORA_FACTORY_ADDRESS,                          │    │
│  │    abi: zoraFactoryAbi,                                    │    │
│  │    functionName: "deploy",                                 │    │
│  │    args: [                                                 │    │
│  │      payoutRecipient,                                      │    │
│  │      [userAddress],                                        │    │
│  │      metadataUri,      // ← IPFS URI from step 3          │    │
│  │      name,                                                 │    │
│  │      symbol,                                               │    │
│  │      poolConfig,       // ← From step 4                    │    │
│  │      PLATFORM_REFERRER, // Gnars DAO treasury             │    │
│  │      "0x0", "0x", salt                                     │    │
│  │    ],                                                       │    │
│  │  });                                                        │    │
│  │                                                             │    │
│  │  → User signs transaction in wallet                        │    │
│  │  → Transaction submitted to Base chain                     │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 7: Wait for confirmation & extract address                   │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  const receipt = await waitForTransactionReceipt({ hash });│    │
│  │                                                             │    │
│  │  for (const log of receipt.logs) {                         │    │
│  │    const decoded = decodeEventLog({                        │    │
│  │      abi: zoraFactoryAbi,                                  │    │
│  │      data: log.data,                                       │    │
│  │      topics: log.topics,                                   │    │
│  │    });                                                      │    │
│  │                                                             │    │
│  │    if (decoded.eventName === "CoinCreatedV4") {            │    │
│  │      coinAddress = decoded.args.coin;                      │    │
│  │      // ✓ Success! Coin deployed                           │    │
│  │    }                                                        │    │
│  │  }                                                          │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SUCCESS SCREEN                                 │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  ✓ Coin Created Successfully!                              │    │
│  │                                                             │    │
│  │  [Preview of image/video]                                  │    │
│  │                                                             │    │
│  │  Name: My Awesome Coin                                     │    │
│  │  Symbol: $AWESOME                                          │    │
│  │  Description: ...                                          │    │
│  │                                                             │    │
│  │  Coin Address: 0x...                                       │    │
│  │  Transaction: 0x...                                        │    │
│  │  Backing: Gnars Creator Coin                               │    │
│  │  Network: Base (8453)                                      │    │
│  │                                                             │    │
│  │  [Create Another] [Go to Dashboard]                        │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## File Responsibilities

```
┌──────────────────────────────────────────────────────────────┐
│  /src/app/create-coin/page.tsx                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  • Form UI                                                   │
│  • File upload widget                                        │
│  • Validation                                                │
│  • Success screen                                            │
└──────────────────────────────┬───────────────────────────────┘
                               │ calls
                               ▼
┌──────────────────────────────────────────────────────────────┐
│  /src/hooks/useCreateCoin.ts                                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  • Metadata creation                                         │
│  • IPFS upload                                               │
│  • Pool config encoding                                      │
│  • Transaction execution                                     │
│  • Event parsing                                             │
└──────────────────────────────┬───────────────────────────────┘
                               │ uses
                               ▼
       ┌────────────────────────────────────────────┐
       │  /src/lib/zora/factoryAbi.ts              │
       │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
       │  • Contract ABI                            │
       │  • deploy() function                       │
       │  • coinAddress() view                      │
       │  • CoinCreatedV4 event                     │
       └────────────────────────────────────────────┘
       │
       │  /src/lib/zora/poolConfig.ts              │
       │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
       │  • Pool config encoding                    │
       │  • Version constants                       │
       │  • Tick/curve parameters                   │
       └────────────────────────────────────────────┘
       │
       │  /src/lib/config.ts                       │
       │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
       │  • ZORA_FACTORY_ADDRESS                    │
       │  • GNARS_CREATOR_COIN                      │
       │  • PLATFORM_REFERRER                       │
       └────────────────────────────────────────────┘
```

---

## Data Flow (Image vs Video)

```
USER SELECTS FILE
       │
       ├─────────────┬─────────────┐
       ▼             ▼             ▼
    IMAGE         VIDEO        INVALID
  (image/*)    (video/*)      (reject)
       │             │
       │             │
       ▼             ▼
┌──────────────────────────────────────┐
│  builder.withImage(file)             │
│                                       │
│  ⚠️  SAME METHOD FOR BOTH!           │
│                                       │
│  SDK auto-detects file type:         │
│  • image/* → image field             │
│  • video/* → image + animation_url   │
└──────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Upload to IPFS                      │
│  ↓                                   │
│  ipfs://bafybeig.../metadata.json   │
└──────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Metadata JSON on IPFS:              │
│  {                                   │
│    "name": "...",                    │
│    "symbol": "...",                  │
│    "image": "ipfs://.../<file>",    │
│    "animation_url": "ipfs://...",   │ ← Only for videos
│    "description": "..."              │
│  }                                   │
└──────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Deploy to Base                      │
│  ↓                                   │
│  Coin Address: 0x...                 │
└──────────────────────────────────────┘
```

---

## Contract Addresses Flow

```
┌────────────────────────────────────────────────────────────┐
│                    BASE MAINNET (8453)                     │
└────────────────────────────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌───────────────┐  ┌─────────────────┐  ┌──────────────────┐
│ Zora Factory  │  │ Gnars Creator   │  │ Gnars DAO        │
│               │  │ Coin            │  │ Treasury         │
│ 0x777777751.. │  │ 0x0cf0c3b75...  │  │ 0x72ad986eb...   │
│               │  │                 │  │                  │
│ • deploy()    │  │ • backing       │  │ • referrals      │
│ • coinAddress │  │   currency      │  │ • payouts        │
└───────────────┘  └─────────────────┘  └──────────────────┘
        │                    │                    │
        └────────────────────┴────────────────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │  New Coin Contract  │
                  │  0x... (created)    │
                  │                     │
                  │  • name             │
                  │  • symbol           │
                  │  • metadata URI     │
                  │  • pool config      │
                  └─────────────────────┘
```

---

## Key Insight: Same Code Path

```
┌─────────────────────────────────────────────────────────┐
│  THE BEAUTY OF THIS IMPLEMENTATION:                     │
│                                                          │
│  ┌────────────────────┐       ┌────────────────────┐  │
│  │   Image Upload     │       │   Video Upload     │  │
│  └────────────────────┘       └────────────────────┘  │
│            │                            │              │
│            └────────────┬───────────────┘              │
│                         ▼                              │
│            ┌──────────────────────────┐                │
│            │  SAME CODE PATH!         │                │
│            │                          │                │
│            │  builder.withImage(file) │                │
│            └──────────────────────────┘                │
│                         │                              │
│                         ▼                              │
│            ┌──────────────────────────┐                │
│            │  Zora SDK handles both   │                │
│            └──────────────────────────┘                │
│                         │                              │
│                         ▼                              │
│            ┌──────────────────────────┐                │
│            │  IPFS Upload             │                │
│            └──────────────────────────┘                │
│                         │                              │
│                         ▼                              │
│            ┌──────────────────────────┐                │
│            │  Deploy Contract         │                │
│            └──────────────────────────┘                │
│                                                          │
│  NO SEPARATE VIDEO LOGIC NEEDED!                        │
└─────────────────────────────────────────────────────────┘
```

---

**Visual summary of the video/image upload and coin creation flow.**
