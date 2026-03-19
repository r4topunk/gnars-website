"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { type NogglesRailLocation } from "@/content/nogglesrails";

export function RailCard({ rail }: { rail: NogglesRailLocation }) {
  return (
    <Link href={`/nogglesrails/${rail.slug}`} className="group block">
      <div className="overflow-hidden rounded-lg border transition-colors hover:border-foreground/20">
        {/* Image */}
        <div className="relative aspect-[3/2] w-full overflow-hidden bg-muted">
          <Image
            src={rail.images[0]}
            alt={`${rail.label} — ${rail.city}, ${rail.country}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-3">
            <p className="text-sm font-semibold text-white">{rail.label}</p>
            <p className="text-xs text-white/70">
              {rail.city}, {rail.country}
            </p>
          </div>
        </div>
        {/* Footer */}
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs text-muted-foreground">{rail.continent}</span>
          <Badge variant="secondary" className="text-[10px]">
            {rail.type}
          </Badge>
        </div>
      </div>
    </Link>
  );
}
