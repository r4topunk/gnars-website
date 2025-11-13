# Files Already Created (From PR #1)

These files were created in the original PR #1 and already exist in your codebase:

## ✅ Files That Already Exist

### 1. Main UI Page
- **File:** `src/app/create-coin/page.tsx` 
- **Status:** ✅ Already created (18KB)
- **Contains:** Complete form UI, image/video upload, validation, preview, success screen

### 2. Core Hook
- **File:** `src/lib/zora/useCreateCoin.ts`
- **Status:** ✅ Already created (8.4KB)
- **Contains:** Metadata upload, IPFS handling, contract deployment logic

### 3. Contract ABI
- **File:** `src/lib/zora/factoryAbi.ts`
- **Status:** ✅ Already created (2.6KB)
- **Contains:** Zora Factory ABI, deploy function, CoinCreatedV4 event

### 4. Pool Configuration
- **File:** `src/lib/zora/poolConfig.ts`
- **Status:** ✅ Already created (5.2KB)
- **Contains:** Pool config encoder for Doppler Multi-Curve Uni V4

### 5. API Route
- **File:** `src/app/api/coins/create/route.ts`
- **Status:** ✅ Already exists
- **Contains:** Server-side coin creation endpoint (currently unused)

### 6. Deployment Script
- **File:** `scripts/deploy-gnars-content-coin.ts`
- **Status:** ✅ Already exists
- **Contains:** CLI deployment script for testing

### 7. Static Asset
- **File:** `public/Zorb.png`
- **Status:** ✅ Already exists (1.8MB)
- **Contains:** Zora branding image

---

# What Your Agent Needs to Change

## If Image Upload Already Works

Your agent only needs to make these **5 small changes** to enable video uploads:

### Change 1: Add Video MIME Types (Constants)

**File to modify:** `src/app/create-coin/page.tsx`

**Find this section (around line 19-26):**
```typescript
const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];
```

**Add below it:**
```typescript
const SUPPORTED_VIDEO_TYPES = [
  "video/mp4", 
  "video/webm", 
  "video/quicktime", 
  "video/x-m4v"
];
```

---

### Change 2: Update File Input Accept Attribute

**File to modify:** `src/app/create-coin/page.tsx`

**Find the file input element (around line 414-420):**
```tsx
<input
  ref={fileInputRef}
  type="file"
  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml"
  onChange={handleFileChange}
  className="hidden"
  required
/>
```

**Change the accept attribute to:**
```tsx
accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml,video/mp4,video/webm,video/quicktime,video/x-m4v"
```

---

### Change 3: Update File Validation Logic

**File to modify:** `src/app/create-coin/page.tsx`

**Find the `handleFileChange` function (around line 92-132):**

**Current code probably validates only images. Update it to:**
```typescript
const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // NEW: Check if image or video
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");

  if (!isImage && !isVideo) {
    setMediaError("Please upload an image or video file");
    toast.error("Please upload an image or video file");
    return;
  }

  // NEW: Check against Zora's supported mime types
  const isSupportedImage = SUPPORTED_IMAGE_TYPES.includes(file.type);
  const isSupportedVideo = SUPPORTED_VIDEO_TYPES.includes(file.type);

  if (isImage && !isSupportedImage) {
    setMediaError("Image type not supported. Please use: JPEG, PNG, GIF, WebP, or SVG");
    toast.error("Image type not supported. Please use: JPEG, PNG, GIF, WebP, or SVG");
    return;
  }

  // NEW: Video validation
  if (isVideo && !isSupportedVideo) {
    setMediaError("Video type not supported. Please use: MP4, WebM, or MOV");
    toast.error("Video type not supported. Please use: MP4, WebM, or MOV");
    return;
  }

  // Check file size (max 50MB for better upload performance)
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    setMediaError("File size must be less than 50MB");
    toast.error("File size must be less than 50MB");
    return;
  }

  setMediaError("");
  setMediaFile(file);
};
```

---

### Change 4: Add Video Preview Component

**File to modify:** `src/app/create-coin/page.tsx`

**Find the preview section (around line 424-430). It probably shows only images:**
```tsx
{mediaType === "image" && mediaUrl && (
  <Image src={mediaUrl} alt="Preview" className="w-full h-64 object-cover" />
)}
```

**Add video preview below it:**
```tsx
{mediaType === "image" && mediaUrl && (
  <Image src={mediaUrl} alt="Preview" className="w-full h-64 object-cover" />
)}

{/* NEW: Video preview */}
{mediaType === "video" && mediaUrl && (
  <video src={mediaUrl} controls className="w-full h-64 object-cover" />
)}
```

---

### Change 5: Update `mediaType` Derivation (if needed)

**File to modify:** `src/app/create-coin/page.tsx`

**Find where `mediaType` is defined (around line 64-69):**

**Make sure it detects both images and videos:**
```typescript
const mediaType = mediaFile?.type.startsWith("image/")
  ? "image"
  : mediaFile?.type.startsWith("video/")
    ? "video"
    : "none";
```

---

## What Does NOT Need to Change

✅ **Keep these files UNCHANGED:**
- `src/lib/zora/useCreateCoin.ts` - Already handles both images and videos!
- `src/lib/zora/factoryAbi.ts` - Already correct
- `src/lib/zora/poolConfig.ts` - Already correct
- `src/lib/config.ts` - Already has the right constants

The `.withImage()` method in the hook already works for videos! No changes needed there.

---

## Summary for Your Agent

Tell your agent:

> **Task:** Enable video uploads in the existing coin creation form
> 
> **Files already created (don't recreate):**
> - `src/app/create-coin/page.tsx` ✅
> - `src/lib/zora/useCreateCoin.ts` ✅
> - `src/lib/zora/factoryAbi.ts` ✅
> - `src/lib/zora/poolConfig.ts` ✅
> 
> **Files to modify:**
> - Only `src/app/create-coin/page.tsx` (5 small changes)
> 
> **Changes needed:**
> 1. Add `SUPPORTED_VIDEO_TYPES` constant
> 2. Update file input `accept` attribute to include video types
> 3. Update `handleFileChange` validation to check videos
> 4. Add `<video>` preview component 
> 5. Ensure `mediaType` detects video files
> 
> **Key insight:** The upload logic already works! The Zora SDK's `.withImage()` method in `useCreateCoin.ts` accepts both images and videos automatically. You only need UI changes to accept and preview videos.

---

## Testing After Changes

Test that:
- ✅ Can select MP4, WebM, MOV files
- ✅ Video shows in preview with controls
- ✅ Upload succeeds (same as images)
- ✅ Coin deploys successfully
- ✅ Images still work

Done! Video uploads enabled with 5 small changes to one file.
