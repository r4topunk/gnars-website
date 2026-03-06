# Google Analytics 4 Setup

## Implementation

Google Analytics 4 (GA4) tracking has been added to the Gnars website.

### Files Added/Modified

1. **`src/components/analytics/GoogleAnalytics.tsx`** (NEW)
   - Client-side component that loads GA4 tracking scripts
   - Uses Next.js `Script` component with `afterInteractive` strategy
   - Reads GA ID from environment variable

2. **`src/app/layout.tsx`** (MODIFIED)
   - Added `<GoogleAnalytics />` component to root layout
   - Tracking active on all pages

3. **`.env.local`** (NEW - NOT COMMITTED)
   - Contains production GA4 ID: `G-S0RNBJDKL`
   - Ignored by git (already in .gitignore)

4. **`.env.example`** (NEW)
   - Template for environment variables
   - Committed to repo for documentation

## Configuration

The Google Analytics ID is stored in an environment variable:

```bash
NEXT_PUBLIC_GA_ID=G-S0RNBJDKL
```

### Local Development

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Update `NEXT_PUBLIC_GA_ID` with your GA4 measurement ID

### Production Deployment

Set the environment variable in your deployment platform:

**Vercel:**
```
Settings → Environment Variables → Add:
NEXT_PUBLIC_GA_ID = G-S0RNBJDKL
```

**Other platforms:**
Add `NEXT_PUBLIC_GA_ID` to your environment configuration.

## Verification

After deployment, verify GA4 is working:

1. **Google Analytics Dashboard:**
   - Go to: https://analytics.google.com
   - Select "Gnars" property
   - Check "Realtime" report for active users

2. **Browser DevTools:**
   ```javascript
   // Check if gtag is loaded
   window.gtag
   
   // Check dataLayer
   window.dataLayer
   ```

3. **Google Tag Assistant:**
   - Install Chrome extension
   - Visit gnars.com
   - Verify GA4 tag is firing

## Data Privacy

GA4 is configured with default settings. Consider adding:
- Cookie consent banner (GDPR/CCPA compliance)
- IP anonymization (already default in GA4)
- Data retention settings in GA4 admin

## Troubleshooting

**Tag not loading:**
- Check environment variable is set
- Verify deployment includes updated `layout.tsx`
- Check browser console for errors

**No data in GA4:**
- Wait 24-48 hours for initial data
- Check "Realtime" report for immediate verification
- Verify GA4 property is active

## Resources

- [Google Analytics 4 Docs](https://support.google.com/analytics/answer/10089681)
- [Next.js Script Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/scripts)
- [GA4 Setup Guide](https://support.google.com/analytics/answer/9304153)
