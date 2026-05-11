"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeftIcon, ChevronRightIcon, ExternalLinkIcon, MapPinIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Link } from "@/i18n/navigation";

export interface LocationData {
  position: [number, number];
  label: string;
  images: string[];
  iconUrl: string;
  iconSize: [number, number];
  proposal: {
    name: string;
    link: string;
  };
  description?: string;
  slug?: string; // For linking to /installations/[slug]
}

interface MapLocationDrawerProps {
  location: LocationData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MapLocationDrawer({ location, open, onOpenChange }: MapLocationDrawerProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Reset image index when location changes
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [location]);

  if (!location) return null;

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % location.images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + location.images.length) % location.images.length);
  };

  // Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && location.images.length > 1) {
      nextImage();
    }
    if (isRightSwipe && location.images.length > 1) {
      prevImage();
    }

    setTouchStart(0);
    setTouchEnd(0);
  };

  const proposalUrl = location.proposal.link.startsWith("http")
    ? location.proposal.link
    : `https://${location.proposal.link}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={isMobile ? "h-[85vh] rounded-t-2xl" : "w-full sm:max-w-lg"}
      >
        <SheetHeader>
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-md">
              <MapPinIcon className="text-primary size-5" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-xl">{location.label}</SheetTitle>
              <SheetDescription className="mt-1">
                {location.position[0].toFixed(4)}, {location.position[1].toFixed(4)}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
          {/* Images Carousel */}
          {location.images.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Photos</h3>
                {location.images.length > 1 && (
                  <span className="text-muted-foreground text-xs">
                    {currentImageIndex + 1} / {location.images.length}
                  </span>
                )}
              </div>
              <div className="relative">
                <div
                  className="relative aspect-video w-full overflow-hidden rounded-lg border"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  <Image
                    src={location.images[currentImageIndex]}
                    alt={`${location.label} - Photo ${currentImageIndex + 1}`}
                    fill
                    className="object-cover transition-opacity duration-300"
                    sizes="(max-width: 768px) 100vw, 500px"
                    priority
                  />
                </div>

                {/* Navigation Arrows (only show if multiple images) */}
                {location.images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="bg-background/80 hover:bg-background absolute left-2 top-1/2 -translate-y-1/2 rounded-full p-2 backdrop-blur-sm transition-colors"
                      aria-label="Previous image"
                    >
                      <ChevronLeftIcon className="size-5" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="bg-background/80 hover:bg-background absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 backdrop-blur-sm transition-colors"
                      aria-label="Next image"
                    >
                      <ChevronRightIcon className="size-5" />
                    </button>
                  </>
                )}

                {/* Dot Indicators */}
                {location.images.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                    {location.images.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`size-2 rounded-full transition-all ${
                          idx === currentImageIndex
                            ? "bg-primary w-6"
                            : "bg-background/60 hover:bg-background/80"
                        }`}
                        aria-label={`Go to image ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description (if available) */}
          {location.description && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">About</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {location.description}
              </p>
            </div>
          )}

          {/* Installation Details Link */}
          {location.slug && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Installation Details</h3>
              <Button asChild variant="default" className="w-full">
                <Link href={`/installations/${location.slug}`}>
                  View Full Installation
                  <ExternalLinkIcon className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
          )}

          {/* Proposal Link */}
          {location.proposal.link && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Funding Proposal</h3>
              <div className="bg-muted/50 rounded-lg border p-4">
                <p className="text-muted-foreground mb-3 text-sm">{location.proposal.name}</p>
                <Button asChild variant="secondary" className="w-full">
                  <Link href={proposalUrl} target="_blank" rel="noopener noreferrer">
                    View Proposal
                    <ExternalLinkIcon className="ml-2 size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {/* Coordinates */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Coordinates</h3>
            <div className="bg-muted/50 font-mono rounded-lg border p-3 text-sm">
              <div className="text-muted-foreground flex justify-between">
                <span>Latitude:</span>
                <span className="text-foreground">{location.position[0].toFixed(6)}</span>
              </div>
              <div className="text-muted-foreground mt-1 flex justify-between">
                <span>Longitude:</span>
                <span className="text-foreground">{location.position[1].toFixed(6)}</span>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
