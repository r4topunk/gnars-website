# Mini TV Widget — Design Spec

## Goal

Add a miniature 3D TV to the bottom-left corner of every page. It shows color bars by default, loads video on hover, and expands to fullscreen on click. On the homepage, it only appears after the user scrolls past the hero TV section.

## Approach

Reuse the existing `Gnar3DTVScene` component in a fixed-position container with lower quality settings. Requires adding two new props to `Gnar3DTVScene` (`dpr`, `enableOrbitControls`). Lazy-load the video feed on user interaction.

## Components

### Modified: `Gnar3DTVScene` (`src/components/tv/Gnar3DTVScene.tsx`)

Add two optional props:

- `dpr?: number` (default: `0.6`) — device pixel ratio for the canvas
- `enableOrbitControls?: boolean` (default: `true`) — conditionally render `<OrbitControls>`

These are backwards-compatible; existing usages are unaffected.

### `MiniTV` (new — `src/components/tv/MiniTV.tsx`)

Client component. Fixed position `bottom-4 left-4`, ~120x120px.

**States:**

- **Idle**: `useTVFeed` hook is called on mount (hooks can't be conditional), but `videoUrl` is NOT passed to `Gnar3DTVScene` — TV shows color bars. Auto-rotate on.
- **Hover**: Sets `isHovered = true`, passes first video URL to `Gnar3DTVScene` — TV plays video. While feed is still loading, color bars continue (no spinner).
- **Error**: If feed fetch fails, TV stays on color bars permanently. No error UI.
- **Click**: Expands to fullscreen overlay with close button and ESC support.

**Mini mode canvas config:**

- `dpr={0.4}` (via new prop on `Gnar3DTVScene`)
- `enableOrbitControls={false}` (via new prop — auto-rotate only, no user drag)
- Same `frameloop="demand"`, `powerPreference: "low-power"`

**Fullscreen mode** reuses the same pattern as `Gnar3DTV`: fixed overlay, `z-[60]` (higher than hero TV's `z-50` to avoid stacking conflicts), blur backdrop, close via X button or ESC. In fullscreen:

- `dpr={0.6}` (normal quality)
- `enableOrbitControls={true}`

**Dynamic import:** `Gnar3DTVScene` is loaded via `next/dynamic` with `ssr: false`, same as `Gnar3DTVClient`. Zero JS cost until the component mounts.

### `MiniTVVisibilityContext` (new — `src/components/tv/MiniTVVisibilityContext.tsx`)

React context that controls whether the mini TV should be hidden.

**Interface:**

```ts
interface MiniTVVisibilityContextValue {
  // true = hero TV is in viewport, so mini TV should be hidden
  // false = hero TV is not visible (or not on homepage), so mini TV shows
  heroTVVisible: boolean;
  setHeroTVVisible: (visible: boolean) => void;
}
```

**Default:** `heroTVVisible = false` — mini TV visible by default. On non-homepage pages, `setHeroTVVisible` is never called, so mini TV is always visible. Only `page.tsx` (homepage) touches this state.

**Provider** lives in `layout.tsx`, wrapping all children.

### `HeroTVObserver` (new — thin client component in `src/app/page.tsx` or co-located)

Wraps the `<Gnar3DTVClient>` element on the homepage. Uses an `IntersectionObserver` with `threshold: 0.1` on its container div. Calls `setHeroTVVisible(true)` when the hero TV enters the viewport, `setHeroTVVisible(false)` when it leaves.

### Modified: `src/app/page.tsx`

Wrap the hero TV div with `HeroTVObserver`:

```tsx
<HeroTVObserver>
  <Gnar3DTVClient autoRotate={true} />
</HeroTVObserver>
```

### Modified: `src/app/layout.tsx`

Add `MiniTVVisibilityProvider` and `MiniTV` inside `<TooltipProvider>`, alongside `<ScrollToTop />` and `<Toaster />`:

```tsx
<TooltipProvider>
  <MiniTVVisibilityProvider>
    <MiniAppReady />
    <ScrollToTop />
    <DaoHeader />
    <main className="max-w-6xl mx-auto px-4">{children}</main>
    <NogglesCopyFooter />
    <Toaster />
    <MiniTV />
  </MiniTVVisibilityProvider>
</TooltipProvider>
```

## Visibility Rules

| Page                          | Mini TV visible? |
| ----------------------------- | ---------------- |
| Homepage, hero TV in viewport | Hidden           |
| Homepage, scrolled past hero  | Visible          |
| Any other page                | Always visible   |

## Performance Budget

- **Initial page load**: Zero cost. `MiniTV` is dynamically imported with `ssr: false`.
- **After mount**: One Three.js canvas at `dpr=0.4` (~120px), `frameloop="demand"`. Minimal GPU usage.
- **Video feed**: `useTVFeed` hook runs on mount but video URL is only passed on hover. The API call happens at mount, but no video texture is created until hover.
- **Render pausing**: `Gnar3DTVScene` has an internal `IntersectionObserver` that pauses GPU rendering when the canvas is off-screen. This is separate from the homepage scroll observer which controls mini TV visibility.
- **Homepage scroll observer**: A new `IntersectionObserver` in `HeroTVObserver` toggles mini TV visibility. This is a lightweight DOM API — no GPU cost.
- **Homepage dual canvas**: When scrolled past hero, two Three.js canvases exist (hero + mini). Both use on-demand frame loop, so only the visible one renders.

## Animation & UX

- Mini TV fades in with `opacity` + `scale` transition (same pattern as `Gnar3DTV`)
- On homepage: slide-in/fade-in when hero TV leaves viewport, slide-out when it re-enters
- Fullscreen expansion: `animate-in fade-in duration-300` (existing pattern)
- Cursor: `cursor-pointer` on mini TV, `cursor-grab` in fullscreen

## Files Changed

| File                                            | Change                                       |
| ----------------------------------------------- | -------------------------------------------- |
| `src/components/tv/Gnar3DTVScene.tsx`           | Add `dpr` and `enableOrbitControls` props    |
| `src/components/tv/MiniTV.tsx`                  | New — mini TV widget                         |
| `src/components/tv/MiniTVVisibilityContext.tsx` | New — context provider                       |
| `src/components/tv/HeroTVObserver.tsx`          | New — homepage hero TV visibility reporter   |
| `src/app/layout.tsx`                            | Add provider + MiniTV inside TooltipProvider |
| `src/app/page.tsx`                              | Wrap hero TV with HeroTVObserver             |
