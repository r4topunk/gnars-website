"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NogglesRailsGlobe } from "./NogglesRailsGlobe";
import { NogglesRailsMap } from "./NogglesRailsMap";

export function NogglesRailsMapTabs() {
  return (
    <Tabs defaultValue="globe">
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
