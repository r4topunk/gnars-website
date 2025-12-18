# React Bits Infinite Menu Integration

## Overview

Integrated the **React Bits Infinite Menu** - a 3D interactive WebGL sphere menu for browsing Gnars TV videos. Users can drag to rotate the sphere and click to navigate to any video in the feed.

## Implementation

### Files Created

1. **`src/components/tv/ReactBitsInfiniteMenu.tsx`** (1,130 lines)
   - Full WebGL2 implementation with gl-matrix for 3D math
   - Icosahedron geometry subdivided into sphere
   - Disc instances for each video thumbnail
   - Arcball controls for intuitive drag rotation
   - Canvas texture atlas for efficient image loading
   - Vertex + Fragment shaders for 3D rendering

2. **`src/components/tv/ReactBitsInfiniteMenu.css`**
   - Styles for canvas cursor states
   - Golden amber (#FBBF23) action button styling
   - Responsive layout for mobile screens

### Files Modified

1. **`src/components/tv/TVInfiniteMenu.tsx`**
   - Replaced simple grid menu with 3D sphere integration
   - Menu toggle button triggers full-screen overlay
   - Custom navigate button overlays React Bits action button
   - Tracks active item and calls parent onItemClick callback
   - Instructions overlay for user guidance

2. **`package.json`** (via pnpm)
   - Added `gl-matrix@3.4.4` dependency for matrix operations

## Features

### 3D Sphere Interaction
- **Drag to rotate**: Arcball controls for smooth sphere rotation
- **Snap to nearest**: Automatically snaps to closest video when released
- **Zoom on drag**: Camera zooms based on rotation velocity
- **Active tracking**: Highlights currently focused video

### Integration with TV Feed
- **Video thumbnails**: Uses poster images from TVItem[]
- **Title + Creator**: Displays video metadata on rotation
- **Navigation**: Click arrow button to jump to selected video
- **Close button**: Golden amber X button in top-right
- **Background close**: Click outside canvas to close menu

### Performance
- **Texture atlas**: Combines all images into single texture (512px cells)
- **Instanced rendering**: Efficient GPU rendering of multiple discs
- **RequestAnimationFrame loop**: Smooth 60fps animations
- **WebGL2 only**: Requires modern browser support

## Usage

```tsx
import { TVInfiniteMenu } from "@/components/tv";

<TVInfiniteMenu
  items={videoItems}           // TVItem[] from feed
  currentIndex={activeIndex}   // Currently playing video
  onItemClick={(index) => {    // Navigation callback
    setActiveIndex(index);
    scrollToVideo(index);
  }}
/>
```

## Technical Details

### WebGL Pipeline
1. **Geometry Creation**: IcosahedronGeometry → subdivide → spherize
2. **Instance Setup**: Create matrix buffer for each disc
3. **Texture Atlas**: Load all images into 2D canvas atlas
4. **Shader Compilation**: Vertex (transform) + Fragment (texturing)
5. **Animation Loop**: Update matrices, render to canvas

### Shader Features
- **Vertex Shader**: Applies rotation stretching based on velocity
- **Fragment Shader**: Texture atlas sampling with aspect fit
- **Alpha Blending**: Front discs more opaque than back
- **Depth Testing**: Proper occlusion of back faces

### Controls
- **Pointer Events**: Down, up, move, leave
- **Quaternion Math**: Smooth rotations via arcball algorithm
- **Snap Direction**: Lerps to nearest video position
- **Velocity Tracking**: For zoom and visual effects

## Color Scheme

All UI elements use golden amber (#FBBF23) to match Gnars branding:
- Close button background
- Navigate button background
- Instructions text (with opacity)

## Browser Support

Requires:
- WebGL 2.0 support
- ES6+ JavaScript
- Touch events (mobile)
- Pointer events (desktop)

Tested on:
- Chrome 90+
- Firefox 90+
- Safari 14+
- Edge 90+

## Known Limitations

1. **No fallback**: If WebGL2 unavailable, component won't render
2. **Image CORS**: All video thumbnails must support CORS
3. **Memory**: Large feeds (100+ videos) may impact performance
4. **Mobile**: Smaller screens hide title/description overlays

## Future Enhancements

- [ ] Add keyboard navigation (arrow keys)
- [ ] WebGL1 fallback for older browsers
- [ ] Virtual scrolling for large datasets
- [ ] Lazy load texture atlas tiles
- [ ] Add transition effects between videos
- [ ] Support custom shader effects

## Credits

Original component from [React Bits](https://reactbits.dev) by davidhdev.  
Adapted for Gnars TV with custom navigation and styling.
