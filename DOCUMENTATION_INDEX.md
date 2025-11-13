# 📹 Video Upload & Coin Creation - Documentation Index

> Complete documentation package for implementing Zora Content Coin creation with image and video upload support, based on PR #1.

---

## 🎯 Quick Start

**Want to implement this feature?** Start here:

1. **For Local Agents:** Read `LOCAL_AGENT_INSTRUCTIONS.md`
2. **For Developers:** Read `VIDEO_COIN_CREATION_SUMMARY.md`
3. **For Quick Lookups:** Use `QUICK_REFERENCE.md`
4. **For Visual Understanding:** See `FLOW_DIAGRAM.md`

---

## 📚 Documentation Files

### 🔍 [VIDEO_COIN_CREATION_SUMMARY.md](./VIDEO_COIN_CREATION_SUMMARY.md)
**Size:** 775 lines (23KB) | **Type:** Complete Guide

**Contains:**
- ✅ Feature overview and capabilities
- ✅ All 7 new files with detailed explanations
- ✅ ABI definition and contract details
- ✅ Metadata preparation process
- ✅ Pool configuration encoding
- ✅ Key addresses on Base chain
- ✅ Referenced documentation
- ✅ How videos work (same as images!)
- ✅ Environment variables
- ✅ Testing & validation
- ✅ Common issues & solutions
- ✅ Instructions for local agents
- ✅ Production deployment checklist

**Best for:** Understanding the complete implementation, debugging, extending features

---

### ⚡ [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
**Size:** 215 lines (6.6KB) | **Type:** Cheat Sheet

**Contains:**
- 🔑 TL;DR - The key insight
- 📋 Essential files map
- 🏠 Key addresses (Base chain)
- 📁 Supported file types
- 🔄 5-step creation flow
- 💻 Core code snippets
- ✅ File validation pattern
- 🎨 UI preview pattern
- ⚙️ Pool config structure
- 🧭 Navigation addition
- ✔️ Testing checklist
- 🐛 Common issues table
- 🖥️ CLI deployment guide

**Best for:** Quick lookups, copying code snippets, reference while coding

---

### 📊 [FLOW_DIAGRAM.md](./FLOW_DIAGRAM.md)
**Size:** 352 lines (16KB) | **Type:** Visual Guide

**Contains:**
- 🔄 User interaction flow (7 steps)
- 📂 File responsibilities map
- 🔀 Data flow (image vs video)
- 🏗️ Contract addresses flow
- 💡 Key insight visualization
- 📐 ASCII art diagrams

**Best for:** Visual learners, understanding architecture, presentations

---

### 🤖 [LOCAL_AGENT_INSTRUCTIONS.md](./LOCAL_AGENT_INSTRUCTIONS.md)
**Size:** 464 lines (16KB) | **Type:** Step-by-Step Guide

**Contains:**
- 🎯 Task overview
- 📋 Prerequisites checklist
- 📦 Dependency installation
- 🔧 Configuration setup
- 📄 File creation instructions
- 🪝 Hook implementation
- 🎨 UI page creation
- 🧭 Navigation setup
- 🔐 Environment variables
- 🧪 Testing checklist
- ✅ Success criteria
- 🐛 Debugging tips
- 📚 Learning resources

**Best for:** Copy-paste to local agents, step-by-step implementation, automation

---

## 🎓 What This Documentation Covers

### Feature Summary

Enables creation of **Zora Content Coins** on **Base chain** with:
- ✅ Image uploads (JPEG, PNG, GIF, WebP, SVG)
- ✅ Video uploads (MP4, WebM, MOV, M4V)
- ✅ IPFS metadata storage via Zora
- ✅ Backing by Gnars Creator Coin
- ✅ Referral rewards to Gnars DAO treasury
- ✅ Direct contract calls (no SDK abstraction)
- ✅ Production-ready implementation

### Implementation Details

**New Files (7):**
1. `src/app/create-coin/page.tsx` - UI form & success screen
2. `src/hooks/useCreateCoin.ts` - Core deployment logic
3. `src/lib/zora/factoryAbi.ts` - Contract ABI
4. `src/lib/zora/poolConfig.ts` - Pool config encoder
5. `src/app/api/coins/create/route.ts` - API endpoint
6. `scripts/deploy-gnars-content-coin.ts` - CLI deployment
7. `public/Zorb.png` - Branding asset

**Modified Files (3):**
1. `src/lib/config.ts` - Added Zora constants
2. `src/components/layout/DaoHeader.tsx` - Added navigation
3. `package.json` - Added `@zoralabs/coins-sdk`

**Total Changes:** ~1,267 lines added

---

## 💡 The Key Insight

**Videos work exactly like images!**

```typescript
// This SAME method works for both:
builder.withImage(imageFile);  // ✅ Images
builder.withImage(videoFile);  // ✅ Videos too!
```

The Zora SDK automatically:
- Detects file type
- Uploads to IPFS
- Creates metadata
- Sets proper fields (image + animation_url for videos)

**No separate video handling needed!** This is the magic that makes this implementation so elegant.

---

## 🏗️ Architecture Overview

```
User Interface (Form)
    ↓
useCreateCoin Hook
    ↓
Metadata Builder (@zoralabs/coins-sdk)
    ↓
IPFS Upload (Zora uploader)
    ↓
Pool Config Encoder
    ↓
Contract Simulation
    ↓
Transaction Execution
    ↓
Event Parsing
    ↓
Success Screen
```

---

## 🔑 Key Addresses (Base Chain - 8453)

| Contract | Address | Purpose |
|----------|---------|---------|
| **Zora Factory** | `0x777777751622c0d3258f214F9DF38E35BF45baF3` | Deploy coins |
| **Gnars Creator Coin** | `0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b` | Backing currency |
| **Gnars DAO Treasury** | `0x72ad986ebac0246d2b3c565ab2a1ce3a14ce6f88` | Platform referrer |

---

## 🚀 Quick Implementation Guide

### For Your Local Agent

1. Copy `LOCAL_AGENT_INSTRUCTIONS.md`
2. Paste to your local agent
3. Agent will implement step-by-step

### For Manual Implementation

1. Read `VIDEO_COIN_CREATION_SUMMARY.md` 
2. Follow step-by-step instructions
3. Reference `QUICK_REFERENCE.md` for code snippets
4. Use `FLOW_DIAGRAM.md` to understand flow

---

## 🧪 Testing

**Checklist:**
- [ ] Upload JPEG, PNG, GIF, WebP, SVG images
- [ ] Upload MP4, WebM, MOV videos
- [ ] Validate file size (50MB limit)
- [ ] Validate file types
- [ ] IPFS upload succeeds
- [ ] Transaction simulation passes
- [ ] Deployment succeeds
- [ ] Address extracted from event
- [ ] Success screen displays

**See:** Full testing checklist in each documentation file

---

## 🔐 Required Environment Variables

```bash
# Required for IPFS uploads via Zora
NEXT_PUBLIC_ZORA_API_KEY="your-zora-api-key"

# Optional: Custom RPC
NEXT_PUBLIC_BASE_RPC_URL="https://mainnet.base.org"
```

---

## 📦 Dependencies

```json
{
  "@zoralabs/coins-sdk": "^0.3.3"
}
```

**Install:** `pnpm add @zoralabs/coins-sdk`

---

## 🔗 Reference Links

### Original Implementation
- **PR #1:** https://github.com/r4topunk/gnars-website/pull/1/files
- **Commit:** `a11acca` - "feat: add Zora coin creation with direct contract calls"
- **Author:** sktbrd
- **Date:** November 11, 2025

### External Documentation
- **Zora Coins:** https://docs.zora.co/coins
- **Factory Contract:** https://docs.zora.co/coins/contracts/factory
- **Viem Docs:** https://viem.sh
- **Wagmi Docs:** https://wagmi.sh
- **Base Network:** https://base.org

---

## 🎯 Use Cases

### 1. Implementing in Another Project
→ Use `LOCAL_AGENT_INSTRUCTIONS.md`

### 2. Understanding the Implementation
→ Read `VIDEO_COIN_CREATION_SUMMARY.md`

### 3. Quick Code Lookup
→ Check `QUICK_REFERENCE.md`

### 4. Visual Learning
→ See `FLOW_DIAGRAM.md`

### 5. Debugging Issues
→ Check "Common Issues" in summary doc

### 6. Production Deployment
→ Follow production checklist in summary doc

---

## 📊 Documentation Stats

| File | Lines | Size | Type |
|------|-------|------|------|
| VIDEO_COIN_CREATION_SUMMARY.md | 775 | 23KB | Complete Guide |
| QUICK_REFERENCE.md | 215 | 6.6KB | Cheat Sheet |
| FLOW_DIAGRAM.md | 352 | 16KB | Visual Guide |
| LOCAL_AGENT_INSTRUCTIONS.md | 464 | 16KB | Implementation |
| **Total** | **1,806** | **61KB** | **4 Files** |

---

## ✅ Documentation Coverage

- [x] Complete feature overview
- [x] All new files explained
- [x] ABI and contract details
- [x] Metadata upload process
- [x] Pool configuration
- [x] Step-by-step implementation
- [x] Code snippets
- [x] Visual diagrams
- [x] Testing procedures
- [x] Troubleshooting guide
- [x] Environment setup
- [x] Local agent instructions
- [x] Production deployment
- [x] Reference links

---

## 🎓 Learning Path

**Beginner:**
1. Start with `FLOW_DIAGRAM.md` to understand visually
2. Read `QUICK_REFERENCE.md` for overview
3. Follow `LOCAL_AGENT_INSTRUCTIONS.md` step-by-step

**Intermediate:**
1. Read `VIDEO_COIN_CREATION_SUMMARY.md` sections 1-7
2. Review code snippets in `QUICK_REFERENCE.md`
3. Implement using `LOCAL_AGENT_INSTRUCTIONS.md`

**Advanced:**
1. Read complete `VIDEO_COIN_CREATION_SUMMARY.md`
2. Customize implementation
3. Extend for production use cases

---

## 🤝 Contributing

Found an issue or want to improve docs?
- Open an issue in the repository
- Submit a PR with improvements
- Share your implementation experience

---

## 📝 License

This documentation is part of the Gnars DAO website project.

---

## 🎉 Summary

This documentation package provides everything needed to understand and implement video upload and coin creation functionality. The key innovation is that **videos work exactly like images** in the upload flow, making implementation straightforward and maintainable.

**For questions or support:**
- Check individual documentation files
- Review PR #1 discussion
- Consult Zora documentation

**Status:** ✅ Production Ready  
**Last Updated:** November 13, 2025  
**Reference:** PR #1 (commit `a11acca`)

---

**Ready to implement? Start with `LOCAL_AGENT_INSTRUCTIONS.md`!** 🚀
