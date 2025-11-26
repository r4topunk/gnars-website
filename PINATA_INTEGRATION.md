# Pinata IPFS Upload Integration

This implementation allows users to upload banner images to IPFS via Pinata when creating proposals.

## Setup

1. **Get your Pinata API Key:**
   - Go to [Pinata Dashboard](https://app.pinata.cloud/developers/api-keys)
   - Create a new API key with the following permissions:
     - `pinFileToIPFS`
     - `pinJSONToIPFS`
   - Copy the JWT token

2. **Configure Environment Variable:**
   ```bash
   # Add to your .env.local file
   PINATA_JWT=your_jwt_token_here
   ```

3. **Gateway Configuration:**
   - Images are served via: `https://ipfs.skatehive.app/ipfs/{CID}`
   - IPFS URLs stored in format: `ipfs://{CID}`

## Implementation Details

### Files Created/Modified

1. **`/src/app/api/pinata/upload/route.ts`**
   - Server-side API endpoint that handles file uploads
   - Validates file type (images only) and size (max 10MB)
   - Uploads to Pinata's public IPFS network
   - Returns CID and gateway URL

2. **`/src/lib/pinata.ts`**
   - Utility functions for uploading and URL conversion
   - `uploadToPinata()`: Client-side upload handler
   - `ipfsToGatewayUrl()`: Converts IPFS URLs to gateway URLs

3. **`/src/components/proposals/ProposalDetailsForm.tsx`**
   - Integrated real IPFS upload functionality
   - Shows loading state during upload
   - Provides user feedback via toast notifications
   - Displays preview using gateway URL

4. **`/src/components/proposals/ProposalPreview.tsx`**
   - Updated to display IPFS images using gateway
   - Properly renders banner from IPFS CID

## Features

- ✅ Real IPFS upload via Pinata
- ✅ File validation (type and size)
- ✅ Loading states and user feedback
- ✅ Automatic preview using skatehive.app gateway
- ✅ Error handling with descriptive messages
- ✅ IPFS URL format stored in proposal metadata

## Usage Flow

1. User clicks upload area in proposal form
2. Selects an image file (PNG, JPG, max 10MB)
3. File is validated client-side
4. Loading toast appears: "Uploading to IPFS..."
5. File is sent to `/api/pinata/upload`
6. Server uploads to Pinata
7. IPFS CID is returned
8. Form stores `ipfs://{CID}`
9. Preview shows image via `https://ipfs.skatehive.app/ipfs/{CID}`
10. Success toast confirms upload

## Error Handling

- Invalid file types rejected with error message
- Files over 10MB rejected
- Upload failures show descriptive error
- Missing PINATA_JWT returns 500 error
- Failed Pinata uploads return proper error response

## Testing

1. Ensure `PINATA_JWT` is set in `.env.local`
2. Navigate to `/propose`
3. Go to "Details" step
4. Click upload area under "Banner Image"
5. Select an image file
6. Verify loading state appears
7. Verify success toast shows
8. Verify image preview displays
9. Go to "Preview" step
10. Verify banner image displays correctly

## Notes

- Images are uploaded to public IPFS (accessible to anyone)
- CIDs are content-addressed (same file = same CID)
- Gateway URL provides HTTP access to IPFS content
- Files persist on Pinata's infrastructure
- skatehive.app gateway used for fast, reliable access
