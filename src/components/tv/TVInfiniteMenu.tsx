"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { Earth, X, Play } from "lucide-react";
import ReactBitsInfiniteMenu, { type MenuItem } from "./ReactBitsInfiniteMenu";
import type { TVItem } from "./types";

interface TVInfiniteMenuProps {
  items: TVItem[];
  currentIndex: number;
  onItemClick: (index: number) => void;
}

/**
 * 3D interactive sphere menu using React Bits InfiniteMenu
 * Drag to rotate the sphere, click on any video to navigate
 */
export function TVInfiniteMenu({ items, currentIndex, onItemClick }: TVInfiniteMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState(currentIndex);
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted (client-side only for portal)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync activeItemIndex with currentIndex prop changes
  useEffect(() => {
    setActiveItemIndex(currentIndex);
  }, [currentIndex]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Convert TVItem[] to MenuItem[] for React Bits component
  const menuItems = useMemo<MenuItem[]>(
    () => {
      const mapped = items.map((item, index) => {
        let thumbnailUrl = item.imageUrl || `https://picsum.photos/seed/${item.id || index}/500/500`;
        
        // Handle choicecdn.com URLs - they're base64-encoded IPFS proxies that don't support CORS
        // Extract the IPFS hash and use direct IPFS gateway instead
        if (thumbnailUrl.includes('choicecdn.com') && thumbnailUrl.includes('/')) {
          try {
            // Extract the base64 part after the last /
            const parts = thumbnailUrl.split('/');
            const base64Part = parts[parts.length - 1];
            
            // Decode base64
            const decoded = atob(base64Part);
            
            // Extract IPFS hash (pattern: /ipfs/bafybei...)
            const ipfsMatch = decoded.match(/\/ipfs\/(bafybei[a-z0-9]+)/i);
            if (ipfsMatch && ipfsMatch[1]) {
              thumbnailUrl = `https://ipfs.io/ipfs/${ipfsMatch[1]}`;

            }
          } catch (e) {
            console.warn(`[TVInfiniteMenu] Item ${index} failed to decode:`, e);
          }
        }
        
        // Get avatar - also decode if from choicecdn.com
        let avatarUrl = item.creatorAvatar;
        if (avatarUrl && avatarUrl.includes('choicecdn.com') && avatarUrl.includes('/')) {
          try {
            const parts = avatarUrl.split('/');
            const base64Part = parts[parts.length - 1];
            const decoded = atob(base64Part);
            // Match any IPFS CID pattern (bafybei, bafkreid, Qm, etc)
            const ipfsMatch = decoded.match(/\/ipfs\/((?:bafy[a-z0-9]+|bafk[a-z0-9]+|Qm[a-zA-Z0-9]+))/i);
            if (ipfsMatch && ipfsMatch[1]) {
              avatarUrl = `https://ipfs.io/ipfs/${ipfsMatch[1]}`;
            }
          } catch (e) {
            console.warn(`[TVInfiniteMenu] Failed to decode avatar for item ${index}:`, e);
          }
        }
        
        const menuItem = {
          image: thumbnailUrl,
          link: `#video-${item.id}`,
          title: item.title,
          description: item.creatorName || item.creator,
          avatar: avatarUrl || undefined,
        };
        return menuItem;
      });
      return mapped;
    },
    [items]
  );

  const handleInternalItemChange = useCallback((index: number) => {
    setActiveItemIndex(index);
  }, []);


  const handleNavigate = useCallback(() => {
    handleClose();
    onItemClick(activeItemIndex);
  }, [activeItemIndex, onItemClick, handleClose]);

  // Listen for clicks on the React Bits action button
  // Note: The ReactBitsInfiniteMenu component already has an action button
  // We're modifying the onClick behavior through a wrapper

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      {/* Menu Button */}
      <button
        onClick={handleOpen}
        className="pointer-events-auto w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/60 hover:scale-105 active:scale-95 transition-all"
        aria-label="Open 3D menu"
      >
        <Earth className="w-4 h-4" />
      </button>

      {/* Full Screen 3D Menu Overlay - Rendered via Portal */}
      {isOpen && mounted && createPortal(
        <div 
          className="fixed inset-0 z-[100] bg-black" 
          onClick={(e) => {
            // Close on background click
            if (e.target === e.currentTarget) {
              handleClose();
            }
          }}
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-6 right-6 z-[60] w-12 h-12 rounded-full bg-[#FBBF23] hover:bg-[#F59E0B] flex items-center justify-center text-black font-bold transition-all shadow-lg"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Navigate Button - Overlays the React Bits action button */}
          <div 
            className="absolute left-1/2 bottom-20 md:bottom-[3.8em] -translate-x-1/2 z-[60] cursor-pointer"
            onClick={handleNavigate}
          >
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-[#FBBF23] hover:bg-[#F59E0B] border-4 border-black flex items-center justify-center shadow-xl transition-all hover:scale-110">
              <Play className="w-6 h-6 md:w-7 md:h-7 text-black fill-black ml-1" />
            </div>
          </div>

          {/* React Bits 3D Menu - Modified to use our callback */}
          <div className="w-full h-full" onClick={(e) => e.stopPropagation()}>
            <ReactBitsInfiniteMenu 
              items={menuItems}
              onActiveItemChange={handleInternalItemChange}
            />
          </div>

          {/* Instructions */}
          <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 text-center text-white/60 text-xs md:text-sm pointer-events-none z-10 px-4">
            <p className="font-medium">Drag to explore • Click play to watch video</p>
            <p className="text-[10px] md:text-xs mt-1 truncate max-w-[90vw]">{items[activeItemIndex]?.title || "Video"}</p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}