"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NogglesRailsGlobe } from "./NogglesRailsGlobe";
import { NogglesRailsMap } from "./NogglesRailsMap";

export function NogglesRailsMapTabs() {
  const t = useTranslations("installations.nogglesrails");

  return (
    <Tabs defaultValue="globe">
      <div className="flex items-end justify-between">
        <TabsList>
          <TabsTrigger value="map">{t("mapTabs.map")}</TabsTrigger>
          <TabsTrigger value="globe">{t("mapTabs.globe")}</TabsTrigger>
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
