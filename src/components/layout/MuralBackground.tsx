"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { fetchAllAuctions, type PastAuction } from "@/services/auctions";

/**
 * MuralBackground
 * Interactive mural background displayed across all pages.
 * - Fixed positioning behind page content
 * - Drag to pan within a large finite grid (50x50 tiles at 96px each)
 * - Displays real NFT images from GNARS auctions
 * - Pointer events disabled except for drag surface
 */

// --- Helper: deterministic pseudo-random for background colors
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function MuralBackground() {
  // Fixed tile size - no resizing allowed
  const tileSize = 96;
  const gap = 8;

  // Fixed grid dimensions
  const gridCols = 50; // 50 columns
  const gridRows = 50; // 50 rows

  const containerRef = useRef<HTMLDivElement>(null);

  // NFT auctions data
  const [auctions, setAuctions] = useState<PastAuction[]>([]);
  const [isLoadingNFTs, setIsLoadingNFTs] = useState(true);

  // Fetch NFT auctions on mount
  useEffect(() => {
    let ignore = false;
    async function loadNFTs() {
      try {
        setIsLoadingNFTs(true);
        const auctionData = await fetchAllAuctions(1000);
        if (!ignore && auctionData.length > 0) {
          setAuctions(auctionData);
        }
      } catch (error) {
        console.error("Failed to fetch auctions:", error);
      } finally {
        if (!ignore) {
          setIsLoadingNFTs(false);
        }
      }
    }
    void loadNFTs();
    return () => {
      ignore = true;
    };
  }, []);

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

  // Calculate center position for initial scroll
  const centerX = -(totalWidth / 2 - vw / 2);
  const centerY = -(totalHeight / 2 - vh / 2);

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 z-0 overflow-hidden bg-neutral-100 pointer-events-none"
    >

      {/* Drag surface with constraints */}
      <motion.div
        className="cursor-grab active:cursor-grabbing pointer-events-auto"
        drag
        dragMomentum
        dragElastic={0.1}
        dragConstraints={{
          left: -maxX,
          right: 0,
          top: -maxY,
          bottom: 0,
        }}
        initial={{ x: centerX, y: centerY }}
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
            const rand = mulberry32((col * 73856093) ^ (row * 19349663))();
            const bg = `hsl(${Math.floor(rand * 360)} 60% 85%)`;
            
            // Use real NFT images if loaded, otherwise show loading state
            const auction = auctions.length > 0 ? auctions[idx % auctions.length] : null;
            const imageUrl = auction?.imageUrl;
            const tokenId = auction?.tokenId;
            
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
                {!isLoadingNFTs && imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt={`Gnar #${tokenId}`}
                    style={{ 
                      width: "100%", 
                      height: "100%", 
                      objectFit: "cover" 
                    }}
                    loading="lazy"
                    draggable={false}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {isLoadingNFTs ? (
                      <div className="text-xs text-muted-foreground opacity-50">...</div>
                    ) : (
                      <div className="text-xs text-muted-foreground opacity-30">#{tokenId || "?"}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Subtle overlay vignette for depth */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(transparent,rgba(0,0,0,0.06))]" />

      {/* Hints */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs text-white shadow">
        arraste para mover
      </div>
    </div>
  );
}

