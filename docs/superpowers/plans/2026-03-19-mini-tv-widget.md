# Mini TV Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a miniature 3D TV widget fixed to bottom-left of every page, with lazy video loading on hover and fullscreen expansion on click.

**Architecture:** Reuse `Gnar3DTVScene` with new `dpr` and `enableOrbitControls` props. A React context (`MiniTVVisibilityContext`) coordinates homepage visibility — the mini TV hides when the hero TV is in viewport. The widget lives in `layout.tsx` so it appears site-wide.

**Tech Stack:** React 19, Next.js 15.5, Three.js (react-three/fiber), Tailwind CSS 4

**Spec:** `docs/superpowers/specs/2026-03-19-mini-tv-widget-design.md`

**Worktree:** `.worktrees/mini-tv` (branch: `feature/mini-tv`)

**Working directory:** All commands and git operations run from the worktree root: `.worktrees/mini-tv`

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/components/tv/Gnar3DTVScene.tsx` | Modify: add `dpr` and `enableOrbitControls` props |
| `src/components/tv/MiniTVVisibilityContext.tsx` | New: React context + provider for hero TV visibility |
| `src/components/tv/HeroTVObserver.tsx` | New: client wrapper that reports hero TV intersection |
| `src/components/tv/MiniTV.tsx` | New: the mini TV widget with hover/click/fullscreen |
| `src/app/layout.tsx` | Modify: add MiniTVVisibilityProvider + MiniTV |
| `src/app/page.tsx` | Modify: wrap hero TV with HeroTVObserver |

---

### Task 1: Add `dpr` and `enableOrbitControls` props to `Gnar3DTVScene`

**Files:**
- Modify: `src/components/tv/Gnar3DTVScene.tsx`

- [ ] **Step 1: Add props to interface and destructure**

In `src/components/tv/Gnar3DTVScene.tsx`, update the interface and function signature:

```tsx
interface Gnar3DTVSceneProps {
  videoUrl?: string;
  autoRotate?: boolean;
  onNextVideo?: () => void;
  creatorCoinImages?: CreatorCoinImage[];
  dpr?: number;
  enableOrbitControls?: boolean;
}

export function Gnar3DTVScene({
  videoUrl,
  autoRotate = true,
  onNextVideo,
  creatorCoinImages = [],
  dpr = 0.6,
  enableOrbitControls = true,
}: Gnar3DTVSceneProps) {
```

- [ ] **Step 2: Use `dpr` prop on Canvas**

Replace the hardcoded `dpr={0.6}` with `dpr={dpr}`:

```tsx
<Canvas
  camera={{ position: [0, 0.5, 4], fov: 60 }}
  frameloop="demand"
  gl={{ /* ...existing config... */ }}
  onCreated={handleCreated}
  style={{ background: "transparent" }}
  dpr={dpr}
>
```

- [ ] **Step 3: Conditionally render OrbitControls**

Replace the unconditional `<OrbitControls>` with:

```tsx
{enableOrbitControls && (
  <OrbitControls
    enableDamping={false}
    minDistance={2}
    maxDistance={8}
    enablePan={false}
    enableZoom={false}
  />
)}
```

- [ ] **Step 4: Verify existing homepage TV still works**

Run: `pnpm dev` and check homepage — TV should behave identically since defaults match existing values.

- [ ] **Step 5: Commit**

```bash
git add src/components/tv/Gnar3DTVScene.tsx
git commit -m "feat(tv): add dpr and enableOrbitControls props to Gnar3DTVScene"
```

---

### Task 2: Create `MiniTVVisibilityContext`

**Files:**
- Create: `src/components/tv/MiniTVVisibilityContext.tsx`

- [ ] **Step 1: Create the context file**

Create `src/components/tv/MiniTVVisibilityContext.tsx`:

```tsx
"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface MiniTVVisibilityContextValue {
  // true = hero TV is in viewport → mini TV should be hidden
  // false = hero TV not visible (or non-homepage) → mini TV shows
  heroTVVisible: boolean;
  setHeroTVVisible: (visible: boolean) => void;
}

const MiniTVVisibilityContext = createContext<MiniTVVisibilityContextValue>({
  heroTVVisible: false,
  setHeroTVVisible: () => {},
});

export function MiniTVVisibilityProvider({ children }: { children: ReactNode }) {
  const [heroTVVisible, setHeroTVVisible] = useState(false);

  return (
    <MiniTVVisibilityContext.Provider value={{ heroTVVisible, setHeroTVVisible }}>
      {children}
    </MiniTVVisibilityContext.Provider>
  );
}

export function useMiniTVVisibility() {
  return useContext(MiniTVVisibilityContext);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/tv/MiniTVVisibilityContext.tsx
git commit -m "feat(tv): add MiniTVVisibilityContext for homepage scroll awareness"
```

---

### Task 3: Create `HeroTVObserver`

**Files:**
- Create: `src/components/tv/HeroTVObserver.tsx`

- [ ] **Step 1: Create the observer component**

Create `src/components/tv/HeroTVObserver.tsx`:

```tsx
"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useMiniTVVisibility } from "./MiniTVVisibilityContext";

export function HeroTVObserver({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { setHeroTVVisible } = useMiniTVVisibility();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setHeroTVVisible(entries[0]?.isIntersecting ?? false);
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      // Reset on unmount (navigating away from homepage)
      setHeroTVVisible(false);
    };
  }, [setHeroTVVisible]);

  return <div ref={ref}>{children}</div>;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/tv/HeroTVObserver.tsx
git commit -m "feat(tv): add HeroTVObserver for hero TV intersection tracking"
```

---

### Task 4: Create `MiniTV` widget

**Files:**
- Create: `src/components/tv/MiniTV.tsx`

- [ ] **Step 1: Create MiniTV component**

Create `src/components/tv/MiniTV.tsx`:

```tsx
"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { X } from "lucide-react";
import { useTVFeed } from "./useTVFeed";
import { useMiniTVVisibility } from "./MiniTVVisibilityContext";

const Gnar3DTVScene = dynamic(
  () => import("./Gnar3DTVScene").then((mod) => mod.Gnar3DTVScene),
  { ssr: false, loading: () => null }
);

export function MiniTV() {
  const [isHovered, setIsHovered] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { heroTVVisible } = useMiniTVVisibility();

  // Feed is fetched on mount, but videoUrl only passed on hover
  const { items, creatorCoinImages } = useTVFeed({});
  const videoItems = useMemo(() => items.filter((i) => i.videoUrl), [items]);
  const currentVideo = videoItems[currentIndex];

  // Fade-in after mount
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // ESC to close fullscreen
  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  const handleNextVideo = useCallback(() => {
    if (videoItems.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % videoItems.length);
  }, [videoItems.length]);

  const handleClick = useCallback(() => {
    setIsFullscreen(true);
  }, []);

  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFullscreen(false);
  }, []);

  // Determine video URL: only pass when hovered or fullscreen
  const videoUrl = isHovered || isFullscreen ? currentVideo?.videoUrl : undefined;

  // Fullscreen overlay
  if (isFullscreen) {
    return (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-background/95 backdrop-blur-sm animate-in fade-in duration-300 pt-16"
        onClick={handleClose}
      >
        <button
          onClick={handleClose}
          className="absolute right-4 top-20 z-[60] rounded-lg bg-black/60 p-2.5 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
          aria-label="Close fullscreen"
        >
          <X className="h-6 w-6" />
        </button>
        <div
          className="h-full w-full max-h-screen max-w-screen cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <Gnar3DTVScene
            videoUrl={videoUrl}
            autoRotate={true}
            onNextVideo={handleNextVideo}
            creatorCoinImages={creatorCoinImages}
            dpr={0.6}
            enableOrbitControls={true}
          />
        </div>
      </div>
    );
  }

  // Mini TV — hidden when hero TV is visible
  return (
    <div
      className={`fixed bottom-4 left-4 z-40 h-[120px] w-[120px] cursor-pointer transition-all duration-500 ease-out ${
        isLoaded && !heroTVVisible
          ? "opacity-100 scale-100 translate-y-0"
          : "opacity-0 scale-75 translate-y-4 pointer-events-none"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <div className="h-full w-full overflow-hidden rounded-lg shadow-lg ring-1 ring-white/10">
        <Gnar3DTVScene
          videoUrl={videoUrl}
          autoRotate={true}
          onNextVideo={handleNextVideo}
          creatorCoinImages={creatorCoinImages}
          dpr={0.4}
          enableOrbitControls={false}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify component renders in isolation**

Temporarily import `MiniTV` in any page and check it renders the 3D TV at small size with color bars.

- [ ] **Step 3: Commit**

```bash
git add src/components/tv/MiniTV.tsx
git commit -m "feat(tv): add MiniTV widget with hover video and fullscreen"
```

---

### Task 5: Wire into layout and homepage

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add MiniTVVisibilityProvider and MiniTV to layout**

In `src/app/layout.tsx`, add imports:

```tsx
import { MiniTVVisibilityProvider } from "@/components/tv/MiniTVVisibilityContext";
import { MiniTV } from "@/components/tv/MiniTV";
```

Wrap existing `<TooltipProvider>` children with the provider and add `<MiniTV />`:

```tsx
{/* ...existing ThemeProvider > Providers wrappers remain unchanged... */}
<TooltipProvider>
  <MiniTVVisibilityProvider>
    <MiniAppReady />
    {/* <MuralBackground /> */}
    <ScrollToTop />
    <DaoHeader />
    <main className="max-w-6xl mx-auto px-4">{children}</main>
    <NogglesCopyFooter />
    <Toaster />
    <MiniTV />
  </MiniTVVisibilityProvider>
</TooltipProvider>
```

Note: `MiniTVVisibilityProvider` is a client component. Since `layout.tsx` is a server component, this import works because `MiniTVVisibilityProvider` has `"use client"` directive and accepts `children` as a prop (server components can be passed as children to client components).

- [ ] **Step 2: Wrap hero TV with HeroTVObserver in homepage**

In `src/app/page.tsx`, add import:

```tsx
import { HeroTVObserver } from "@/components/tv/HeroTVObserver";
```

Wrap the hero TV div (line 59-61):

```tsx
{/* Right Column - 3D TV (Client Component) */}
<HeroTVObserver>
  <div className="flex items-center justify-center">
    <Gnar3DTVClient autoRotate={true} />
  </div>
</HeroTVObserver>
```

- [ ] **Step 3: Test the full flow**

Run `pnpm dev` and verify:
1. Homepage: mini TV is hidden while hero TV is visible in viewport
2. Homepage: scroll down past hero → mini TV appears bottom-left
3. Homepage: scroll back up → mini TV disappears
4. Other pages (e.g., `/proposals`): mini TV always visible
5. Hover mini TV: video starts playing
6. Click mini TV: fullscreen overlay opens
7. ESC or click X: fullscreen closes

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/page.tsx
git commit -m "feat(tv): wire MiniTV widget into layout and homepage observer"
```

---

### Task 6: Final verification

- [ ] **Step 1: Run lint**

```bash
pnpm lint
```

Fix any lint errors.

- [ ] **Step 2: Run build**

```bash
pnpm build
```

Fix any type or build errors.

- [ ] **Step 3: Commit fixes (if any)**

```bash
git add -A
git commit -m "fix(tv): lint and build fixes for mini TV widget"
```
