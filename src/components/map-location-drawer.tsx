"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ExternalLinkIcon, MapPinIcon } from "lucide-react";

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
}

interface MapLocationDrawerProps {
  location: LocationData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MapLocationDrawer({ location, open, onOpenChange }: MapLocationDrawerProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (!location) return null;

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
          {/* Images Gallery */}
          {location.images.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Photos</h3>
              <div className="grid grid-cols-1 gap-3">
                {location.images.map((image, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-video w-full overflow-hidden rounded-lg border"
                  >
                    <Image
                      src={image}
                      alt={`${location.label} - Photo ${idx + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 500px"
                    />
                  </div>
                ))}
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
