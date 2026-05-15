# Snapshot IPFS Image Migration

## Overview

Snapshot proposals contain IPFS image references using `ipfs://CID` protocol. This script:

1. Tests CID accessibility on `ipfs.snapshot.box` gateway
2. Pins CIDs to SkateHive IPFS (via Pinata) for redundancy
3. Updates `snapshot-proposals.json` to use SkateHive gateway

## Why migrate?

- **Redundancy**: Don't rely on single gateway
- **Control**: SkateHive can manage pinning
- **Speed**: Multiple gateways improve availability

## Prerequisites

1. **Pinata API Key**
   - Sign up: https://app.pinata.cloud
   - Create API key: https://app.pinata.cloud/developers/api-keys
   - Permissions needed: `pinByHash`

2. **Set environment variable**
   ```bash
   export PINATA_JWT="your_jwt_token_here"
   ```

## Usage

### Dry-run (test without changes)

```bash
node scripts/migrate-snapshot-ipfs-images.mjs --dry-run
```

### Execute migration

```bash
node scripts/migrate-snapshot-ipfs-images.mjs
```

### Force re-pin (even if already pinned)

```bash
node scripts/migrate-snapshot-ipfs-images.mjs --force-pin
```

## What it does

1. **Extract CIDs** - Scans `snapshot-proposals.json` for `ipfs://` URLs
2. **Test accessibility** - Verifies each CID on Snapshot gateway
3. **Check SkateHive** - Tests if already available on SkateHive
4. **Pin to Pinata** - Pins missing CIDs using Pinata API
5. **Update file** - Replaces `ipfs://CID` with `https://ipfs.skatehive.app/ipfs/CID`
6. **Backup** - Creates `.backup.json` before writing

## Output

```
🚀 Snapshot IPFS Image Migration

📖 Reading snapshot proposals...
✅ Found 87 unique CIDs

🔍 Testing CID accessibility...

[1/87] bafybeigi2af... ✅ Already on SkateHive
[2/87] bafybeiezu3k... 📌 Pinning to SkateHive...
  ✅ Pinned successfully
[3/87] bafkreia2yil... ❌ Not accessible on Snapshot gateway

==================================================
📊 Migration Summary
==================================================
Total CIDs:           87
Accessible:           85 ✅
Inaccessible:         2 ❌
Pinned to SkateHive:  45 📌
Already on SkateHive: 40 ⏭️
Failed to pin:        0 ⚠️
==================================================
```

## Edge Cases

### Inaccessible CIDs

- CIDs not available on Snapshot gateway won't be migrated
- Original `ipfs://` URL preserved in proposals
- Logged in summary for manual review

### Failed pins

- Network errors, rate limits, invalid CIDs
- Script exits with error code 1
- Check logs and retry

## Rollback

If migration breaks images:

```bash
# Restore backup
cp public/data/snapshot-proposals.backup.json public/data/snapshot-proposals.json

# Or revert commit
git checkout HEAD~1 -- public/data/snapshot-proposals.json
```

## Cost

Pinata free tier: **1 GB storage + 100 GB bandwidth/month**

Average IPFS image: ~500 KB  
87 CIDs × 500 KB = **~43.5 MB** (well under limit)

## Next Steps After Migration

1. **Update code** (if needed)

   ```typescript
   // Change gateway in ProposalDescriptionCard.tsx
   const SKATEHIVE_GATEWAY = "https://ipfs.skatehive.app/ipfs/";
   ```

2. **Verify images**
   - Visit `/proposals/snapshot/93` and check images load
   - Test other proposals with images

3. **Monitor Pinata**
   - Check usage: https://app.pinata.cloud/pinmanager
   - Verify pins are healthy

## Troubleshooting

**Error: PINATA_JWT not set**

```bash
export PINATA_JWT="your_token"
```

**Error: Rate limited**

- Script has 100ms delay between requests
- If still failing, increase delay in code

**Error: Invalid CID**

- Some proposals may have malformed IPFS URLs
- Check proposal body manually
- Skip or fix in JSON file

## Related

- Pinata Docs: https://docs.pinata.cloud
- IPFS Gateway Checker: https://ipfs.github.io/public-gateway-checker/
- Snapshot IPFS: https://ipfs.snapshot.box
