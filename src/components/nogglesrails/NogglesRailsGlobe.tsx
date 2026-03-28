"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { MapLocationDrawer, type LocationData } from "@/components/map-location-drawer";
import { NOGGLES_RAILS, type NogglesRailLocation } from "@/content/nogglesrails";
import { toLocationData } from "./NogglesRailsMap";

const Globe = dynamic(() => import("react-globe.gl").then((m) => m.default), { ssr: false });

interface GlobePoint {
  lat: number;
  lng: number;
  label: string;
  type: string;
  iconUrl: string;
  iconSize: [number, number];
  rail: NogglesRailLocation;
}

export function NogglesRailsGlobe() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<LocationData | null>(null);

  const points: GlobePoint[] = useMemo(
    () =>
      NOGGLES_RAILS.map((r) => ({
        lat: r.position[0],
        lng: r.position[1],
        label: r.label,
        type: r.type,
        iconUrl: r.iconUrl,
        iconSize: r.iconSize,
        rail: r,
      })),
    [],
  );

  const markerHtmlElement = useCallback((point: object) => {
    const p = point as GlobePoint;
    const el = document.createElement("div");
    el.style.cursor = "pointer";
    el.style.pointerEvents = "auto";
    el.title = p.label;
    el.innerHTML = `<img src="${p.iconUrl}" width="${p.iconSize[0]}" height="${p.iconSize[1]}" style="filter: drop-shadow(0 0 3px rgba(0,0,0,0.6));" />`;
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      setSelected(toLocationData(p.rail));
      setDrawerOpen(true);
    });
    return el;
  }, []);

  // Measure container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setDimensions({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Auto-rotate once globe is ready
  useEffect(() => {
    if (!globeRef.current) return;
    globeRef.current.pointOfView({ altitude: 1.5 }, 0);
    const controls = globeRef.current.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.3;
    controls.minDistance = 200;
    controls.maxDistance = 350;
  }, [dimensions]);

  return (
    <>
      <div ref={containerRef} className="h-[60vh] min-h-[350px] overflow-hidden rounded-lg">
        {dimensions.width > 0 && (
          <Globe
            ref={globeRef}
            width={dimensions.width}
            height={dimensions.height}
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
            bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
            backgroundColor="rgba(0,0,0,0)"
            atmosphereColor="#6699cc"
            atmosphereAltitude={0.15}
            htmlElementsData={points}
            htmlLat="lat"
            htmlLng="lng"
            htmlAltitude={0.01}
            htmlElement={markerHtmlElement}
          />
        )}
      </div>
      <MapLocationDrawer location={selected} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
}
