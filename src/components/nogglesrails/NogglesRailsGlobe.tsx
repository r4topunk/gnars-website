"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { MapLocationDrawer, type LocationData } from "@/components/map-location-drawer";
import { WebGLGuard } from "@/components/webgl/WebGLGuard";
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
  selected: boolean;
  rail: NogglesRailLocation;
}

interface NogglesRailsGlobeProps {
  /**
   * Slug of the rail to keep the camera on. Passing it also stops the
   * auto-rotate: something else on the page now owns which rail is in focus.
   */
  focusSlug?: string;
  /**
   * Called when a marker is clicked. Providing it suppresses the built-in
   * detail drawer — the parent is expected to show the rail itself.
   */
  onSelectRail?: (rail: NogglesRailLocation) => void;
  /** Overrides the default `h-[60vh] min-h-[350px]` frame. */
  className?: string;
  /** Idle spin. Forced off while a rail is in focus, and under reduced motion. */
  autoRotate?: boolean;
  /** Multiplier on the idle spin rate. */
  spinSpeed?: number;
}

export function NogglesRailsGlobe({
  focusSlug,
  onSelectRail,
  className,
  autoRotate = true,
  spinSpeed = 1,
}: NogglesRailsGlobeProps = {}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [drawerOpen, setDrawerOpen] = useState(false);
  // three.js reports readiness separately from the container measuring: on a
  // cold load the ref can still be null when dimensions first arrive, and the
  // opening fly-to was silently skipped.
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<LocationData | null>(null);
  // The marker DOM is built once per mount, so its click handler reads the
  // latest callback through a ref instead of closing over the mount-time one.
  const onSelectRef = useRef(onSelectRail);
  useEffect(() => {
    onSelectRef.current = onSelectRail;
  }, [onSelectRail]);

  // Keyed on the focused slug: react-globe.gl only rebuilds marker elements when
  // the data array's identity changes, and the selected pin needs a different
  // element than the rest.
  const points: GlobePoint[] = useMemo(
    () =>
      NOGGLES_RAILS.map((r) => ({
        lat: r.position[0],
        lng: r.position[1],
        label: r.label,
        type: r.type,
        iconUrl: r.iconUrl,
        iconSize: r.iconSize,
        selected: r.slug === focusSlug,
        rail: r,
      })),
    [focusSlug],
  );

  const markerHtmlElement = useCallback((point: object) => {
    const p = point as GlobePoint;
    const el = document.createElement("div");
    el.style.cursor = "pointer";
    el.style.pointerEvents = "auto";
    el.title = p.label;
    // The pin stays the NogglesRail render rather than becoming a generic dot —
    // it is the brand mark, and at this size it still reads as a point. The
    // selected state is a pulsing green halo behind it, so "which one is open"
    // is legible without giving up the icon.
    el.innerHTML = `<span style="position:relative;display:block;width:${p.iconSize[0]}px;height:${p.iconSize[1]}px">${
      p.selected
        ? `<span aria-hidden style="position:absolute;left:50%;top:50%;width:${p.iconSize[0] + 16}px;height:${p.iconSize[1] + 16}px;transform:translate(-50%,-50%);border-radius:999px;border:2px solid #22c55e;background:radial-gradient(circle,rgba(34,197,94,.45),rgba(34,197,94,0) 70%);animation:rail-pin-pulse 1.8s ease-in-out infinite"></span>`
        : ""
    }<img src="${p.iconUrl}" width="${p.iconSize[0]}" height="${p.iconSize[1]}" style="position:relative;filter: drop-shadow(0 0 3px rgba(0,0,0,0.6));" /></span>`;
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      if (onSelectRef.current) {
        onSelectRef.current(p.rail);
        return;
      }
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
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    controls.autoRotate = autoRotate && !focusSlug && !reduced;
    controls.autoRotateSpeed = 0.3 * spinSpeed;
    controls.minDistance = 200;
    controls.maxDistance = 350;
  }, [dimensions, focusSlug, autoRotate, spinSpeed, ready]);

  // Fly to whichever rail the parent has in focus.
  useEffect(() => {
    if (!focusSlug || !ready || !globeRef.current || dimensions.width === 0) return;
    const rail = NOGGLES_RAILS.find((r) => r.slug === focusSlug);
    if (!rail) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    globeRef.current.pointOfView(
      { lat: rail.position[0], lng: rail.position[1], altitude: 1.5 },
      reduced ? 0 : 900,
    );
  }, [focusSlug, dimensions.width, ready]);

  return (
    <>
      <div
        ref={containerRef}
        className={className ?? "h-[60vh] min-h-[350px] overflow-hidden rounded-lg"}
      >
        {dimensions.width > 0 && (
          // three-globe builds a WebGLRenderer on mount; without a context that
          // throws through React and takes the whole page down with it.
          <WebGLGuard label="noggles-rails-globe">
            <Globe
              ref={globeRef}
              width={dimensions.width}
              height={dimensions.height}
              globeImageUrl="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
              bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
              onGlobeReady={() => setReady(true)}
              backgroundColor="rgba(0,0,0,0)"
              atmosphereColor="#6699cc"
              atmosphereAltitude={0.15}
              htmlElementsData={points}
              htmlLat="lat"
              htmlLng="lng"
              htmlAltitude={0.01}
              htmlElement={markerHtmlElement}
            />
          </WebGLGuard>
        )}
      </div>
      <MapLocationDrawer location={selected} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
}
