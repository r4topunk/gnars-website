"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NogglesRailsGlobe } from "./NogglesRailsGlobe";
import { NogglesRailsMap } from "./NogglesRailsMap";

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
}

export function NogglesRailsMapTabs() {
  const isDesktop = useIsDesktop();

  return (
    <Tabs defaultValue={isDesktop ? "globe" : "map"} key={isDesktop ? "desktop" : "mobile"}>
      <div className="flex items-end justify-between">
        <TabsList>
          <TabsTrigger value="map">Map</TabsTrigger>
          <TabsTrigger value="globe">Globe</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="map" className="mt-4">
        <NogglesRailsMap />
      </TabsContent>

      <TabsContent value="globe" className="mt-4">
        <NogglesRailsGlobe />
      </TabsContent>
    </Tabs>
  );
}
