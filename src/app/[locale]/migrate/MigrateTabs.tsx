"use client";

import { useTranslations } from "next-intl";
import { ArrowRightLeft, BookOpen, Coins } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GetGnarsWidget } from "./GetGnarsWidget";
import { MigrationWidget } from "./MigrationWidget";

export function MigrateTabs() {
  const t = useTranslations("migrate");

  return (
    <Tabs defaultValue="consolidate" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="consolidate" className="gap-1.5">
          <ArrowRightLeft className="size-4" />
          <span className="hidden sm:inline">{t("tabs.consolidate")}</span>
        </TabsTrigger>
        <TabsTrigger value="get" className="gap-1.5">
          <Coins className="size-4" />
          <span className="hidden sm:inline">{t("tabs.get")}</span>
        </TabsTrigger>
        <TabsTrigger value="guide" className="gap-1.5">
          <BookOpen className="size-4" />
          <span className="hidden sm:inline">{t("tabs.guide")}</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="consolidate" className="mt-6">
        <MigrationWidget />
      </TabsContent>
      <TabsContent value="get" className="mt-6">
        <GetGnarsWidget />
      </TabsContent>
      <TabsContent value="guide" className="mt-6">
        <MigrationGuide />
      </TabsContent>
    </Tabs>
  );
}

/** Step-by-step tutorial for what a holder does to migrate into $gnars. */
function MigrationGuide() {
  const t = useTranslations("migrate");
  const steps = t.raw("guide.steps") as { title: string; body: string }[];

  return (
    <Card className="space-y-6 p-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{t("guide.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("guide.intro")}</p>
      </div>
      <ol className="space-y-4">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
              {i + 1}
            </span>
            <div className="space-y-0.5">
              <div className="text-sm font-medium">{step.title}</div>
              <p className="text-sm text-muted-foreground">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="border-t pt-4 text-xs text-muted-foreground">{t("guide.footnote")}</p>
    </Card>
  );
}
