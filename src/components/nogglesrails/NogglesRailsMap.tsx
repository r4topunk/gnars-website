"use client";

import { useState, useMemo, useCallback } from "react";
import type { LatLngExpression } from "leaflet";
import { Map, MapMarker, MapTileLayer } from "@/components/ui/map";
import { MapLocationDrawer, type LocationData } from "@/components/map-location-drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  NOGGLES_RAILS,
  getActiveContents,
  getActiveTypes,
  type Continent,
  type RailType,
  type NogglesRailLocation,
} from "@/content/nogglesrails";

export function toLocationData(rail: NogglesRailLocation): LocationData {
  return {
    position: rail.position,
    label: rail.label,
    images: rail.images,
    iconUrl: rail.iconUrl,
    iconSize: rail.iconSize,
    proposal: rail.proposal,
    description: rail.description,
    slug: rail.slug,
  };
}

const CONTINENTS = getActiveContents();
const TYPES = getActiveTypes();

export function NogglesRailsMap() {
  const [continent, setContinent] = useState<Continent | null>(null);
  const [type, setType] = useState<RailType | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<LocationData | null>(null);

  const filtered = useMemo(
    () =>
      NOGGLES_RAILS.filter(
        (r) =>
          (continent === null || r.continent === continent) &&
          (type === null || r.type === type),
      ),
    [continent, type],
  );

  const handleClick = useCallback((rail: NogglesRailLocation) => {
    setSelected(toLocationData(rail));
    setDrawerOpen(true);
  }, []);

  return (
    <section id="map" className="space-y-4">
      <div className="flex items-end justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Map</h2>
        <span className="text-sm text-muted-foreground">
          {filtered.length} of {NOGGLES_RAILS.length}
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterPill active={continent === null} onClick={() => setContinent(null)}>
          All
        </FilterPill>
        {CONTINENTS.map((c) => (
          <FilterPill
            key={c}
            active={continent === c}
            onClick={() => setContinent((prev) => (prev === c ? null : c))}
          >
            {c}
          </FilterPill>
        ))}

        <span className="mx-1 hidden h-4 w-px bg-border sm:block" />

        {TYPES.map((t) => (
          <FilterPill
            key={t}
            active={type === t}
            onClick={() => setType((prev) => (prev === t ? null : t))}
          >
            {t}
          </FilterPill>
        ))}
      </div>

      {/* Map */}
      <div className="h-[60vh] min-h-[350px] overflow-hidden rounded-lg border">
        <Map
          center={[10, 0] as LatLngExpression}
          zoom={2}
          minZoom={2}
          maxBounds={[[-85, -180], [85, 180]]}
          maxBoundsViscosity={1.0}
          className="h-full w-full"
        >
          <MapTileLayer noWrap />
          {filtered.map((rail) => (
            <MapMarker
              key={rail.slug}
              position={rail.position as LatLngExpression}
              iconAnchor={[rail.iconSize[0] / 2, rail.iconSize[1] / 2]}
              icon={
                <img
                  src={rail.iconUrl}
                  alt={rail.label}
                  width={rail.iconSize[0]}
                  height={rail.iconSize[1]}
                  style={{ width: rail.iconSize[0], height: rail.iconSize[1], cursor: "pointer" }}
                />
              }
              eventHandlers={{ click: () => handleClick(rail) }}
            />
          ))}
        </Map>
      </div>

      <MapLocationDrawer location={selected} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </section>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant={active ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      className={cn("h-7 rounded-full px-3 text-xs", active && "pointer-events-none")}
    >
      {children}
    </Button>
  );
}
