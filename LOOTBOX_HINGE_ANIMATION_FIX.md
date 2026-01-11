# Lootbox Lid Hinge Animation Fix

## Problem
The lid was **sliding backward and upward** instead of rotating on hinges like a real box. This didn't match the reference images showing proper hinged box behavior.

## Reference Images Analysis
From the provided reference images:
1. **Yellow case**: Shows lid rotating backward ~90-100 degrees from hinges at the back
2. **Treasure chests**: Shows progressive rotation from closed → semi-open → fully open
3. **Key observation**: The lid **rotates around a fixed hinge point** at the back edge, not sliding

## Solution

### 1. Changed Animation Type
**File:** `src/components/lootbox/AnimatedChest3D.tsx:138-162`

**Before (Translation):**
```typescript
// WRONG: Lid was sliding
if (isPending) {
  targetZ = 0.15;  // Slide back
  targetY = 0.08;  // Slide up
} else if (isOpening) {
  targetZ = 0.6;   // Slide further back
  targetY = 0.4;   // Slide further up
}
lidRef.current.position.z = ...
lidRef.current.position.y = ...
```

**After (Rotation):**
```typescript
// CORRECT: Lid rotates on hinges
if (isPending) {
  targetRotation = -Math.PI / 4;     // -45 degrees (semi-open)
} else if (isOpening) {
  targetRotation = -Math.PI / 1.8;   // -100 degrees (fully open)
}
lidRef.current.rotation.x = ...
```

### 2. Set Pivot Point at Hinges
**File:** `src/components/lootbox/AnimatedChest3D.tsx:434-616`

**Before:**
```typescript
<group ref={lidRef} position={[0, 0.6, 0]}>
  {/* Lid content... */}
</group>
```
- Pivot point was at center of lid
- Rotation looked unnatural

**After:**
```typescript
<group ref={lidRef} position={[0, 0.6, -0.95]}>
  {/* Offset group to compensate for pivot change */}
  <group position={[0, 0, 0.95]}>
    {/* Lid content... */}
  </group>
</group>
```
- Pivot point moved to **back edge** where hinges are located (-0.95 in Z)
- Inner offset group (+0.95) keeps visual position correct
- Rotation now happens around the hinge line

## Technical Details

### Rotation Angles
- **Closed:** `0°` (rotation.x = 0)
- **Semi-open (pending):** `-45°` (rotation.x = -π/4)
- **Fully open:** `-100°` (rotation.x = -π/1.8)

### Coordinate System
- **X-axis rotation:** Tilts lid backward (negative = open)
- **Pivot point:** Back edge of lid at Z = -0.95 relative to crate
- **Hinge positions:** Three hinges at `z = -0.94` (matches reference)

### Animation Speed
- **Opening:** 0.02 rad/frame (slower, deliberate)
- **Fully opening:** 0.03 rad/frame (faster reveal)
- **Closing:** 0.03 rad/frame (snappy)

## Visual Comparison

### Before (Sliding)
```
Closed:  [====LID====]
         [   BODY    ]

Pending: [====LID====]     ← Slides back and up
         [   BODY    ]

Open:    [====LID====]          ← Way back and up
         [   BODY    ]
```
**Problem:** Looks like lid is floating/sliding, not hinged

### After (Rotating)
```
Closed:  [====LID====]
         [   BODY    ]

Pending: [==LID==]        ← Rotates 45° from back edge
         \ /
         [   BODY    ]

Open:    [LID]             ← Rotates 100° from back edge
         |  /
         [   BODY    ]
```
**Result:** Natural hinged box behavior matching reference images

## Animation Flow

1. **User clicks "OPEN"**
   - `isPending = true`
   - Lid rotates to **-45°** around back hinges
   - Wallet confirmation popup appears

2. **User confirms transaction**
   - `isOpening = true`
   - Lid rotates to **-100°** (almost vertical)
   - Reveals interior (can see inside box)

3. **After 4 seconds**
   - Both states clear
   - Lid smoothly rotates back to **0°** (closed)

## Why This Works

### Physics Accuracy
- Real boxes have hinges at back edge ✓
- Lid rotates around fixed pivot point ✓
- Opening angle matches real containers ✓

### Visual Clarity
- Clear "opening" motion is immediately recognizable
- Semi-open state shows anticipation (transaction pending)
- Fully open state shows completion

### Code Simplicity
- Single rotation value instead of X/Y/Z translation
- Easier to control and debug
- Matches how Three.js handles rotations

## Files Changed

1. **src/components/lootbox/AnimatedChest3D.tsx**
   - Lines 138-162: Animation logic (translation → rotation)
   - Line 434: Lid group pivot position moved to hinge line
   - Line 436: Added offset group to compensate for pivot change
   - Line 615: Closed offset group

## Verification

✅ **TypeScript:** Compiles without errors
✅ **Animation:** Smooth rotation around hinges
✅ **Physics:** Matches real-world hinged box behavior
✅ **Timing:** Semi-open on click, fully open on confirm
✅ **Reference Match:** Follows provided yellow case and treasure chest examples
