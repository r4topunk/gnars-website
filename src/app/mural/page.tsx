 "use client";

import React, { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

// --- Helper: deterministic pseudo-random for background colors
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * FiniteMural
 * - Drag to pan within a large finite grid
 * - Mouse wheel changes tile size
 * - Images from Picsum with stable seeds
 */
export default function FiniteMural() {
  // Board size controls
  const [tileSize, setTileSize] = useState(140);
  const minSize = 64;
  const maxSize = 280;
  const gap = 8;

  // Fixed grid dimensions
  const gridCols = 50; // 50 columns
  const gridRows = 50; // 50 rows

  const containerRef = useRef<HTMLDivElement>(null);

  // Viewport size
  const [vw, setVw] = useState<number>(typeof window !== "undefined" ? window.innerWidth : 1280);
  const [vh, setVh] = useState<number>(typeof window !== "undefined" ? window.innerHeight : 720);
  useEffect(() => {
    const onResize = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Calculate grid dimensions
  const cell = tileSize + gap;
  const totalWidth = gridCols * cell - gap; // remove last gap
  const totalHeight = gridRows * cell - gap;

  // Drag constraints - allow panning but keep grid covering viewport
  const maxX = Math.max(0, totalWidth - vw);
  const maxY = Math.max(0, totalHeight - vh);

  // Wheel -> change tile size within bounds (prevent page scroll)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return; // allow pinch-zoom / system gestures
      e.preventDefault();
      const dir = Math.sign(e.deltaY);
      const next = Math.min(maxSize, Math.max(minSize, tileSize - dir * 8));
      setTileSize(next);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [tileSize, minSize, maxSize]);

  return (
    <div ref={containerRef} className="relative h-screen w-screen overflow-hidden bg-neutral-100">
      {/* Controls */}
      <div className="pointer-events-auto absolute left-4 top-4 z-20 flex items-center gap-3 rounded-2xl bg-white/80 p-3 shadow-lg backdrop-blur">
        <label className="text-sm font-medium">tamanho</label>
        <input
          type="range"
          min={minSize}
          max={maxSize}
          value={tileSize}
          onChange={(e) => setTileSize(parseInt(e.target.value))}
          className="h-1 w-48"
        />
        <span className="tabular-nums text-sm text-neutral-600">{tileSize}px</span>
        <span className="text-xs text-neutral-400">role a roda do mouse para ajustar</span>
      </div>

      {/* Drag surface with constraints */}
      <motion.div
        className="cursor-grab active:cursor-grabbing"
        drag
        dragMomentum
        dragElastic={0.1}
        dragConstraints={{
          left: -maxX,
          right: 0,
          top: -maxY,
          bottom: 0,
        }}
        style={{
          width: totalWidth,
          height: totalHeight,
          position: "absolute",
          left: 0,
          top: 0,
        }}
      >
        {/* Fixed grid of tiles */}
        <div className="grid" style={{ gridTemplateColumns: `repeat(${gridCols}, ${tileSize}px)`, gap: `${gap}px` }}>
          {Array.from({ length: gridRows * gridCols }).map((_, idx) => {
            const col = idx % gridCols;
            const row = Math.floor(idx / gridCols);
            const seed = `${col}_${row}`;
            const size = Math.max(64, tileSize * 2);
            const src = `https://picsum.photos/seed/${seed}/${size}`;
            const rand = mulberry32((col * 73856093) ^ (row * 19349663))();
            const bg = `hsl(${Math.floor(rand * 360)} 60% 85%)`;
            
            return (
              <div
                key={seed}
                style={{
                  position: "relative",
                  width: tileSize,
                  height: tileSize,
                  borderRadius: 12,
                  overflow: "hidden",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                  background: bg,
                }}
              >
                <Image
                  src={src}
                  alt={seed}
                  fill
                  sizes={`${tileSize}px`}
                  style={{ objectFit: "cover" }}
                  loading="lazy"
                  draggable={false}
                  unoptimized
                />
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Subtle overlay vignette for depth */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(transparent,rgba(0,0,0,0.06))]" />

      {/* Hints */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs text-white shadow">
        arraste para mover • role para mudar o tamanho
      </div>
    </div>
  );
}
