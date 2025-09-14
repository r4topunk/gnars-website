import { Suspense } from "react";
import { PropdatesFeed } from "@/components/propdates/PropdatesFeed";
import { SidebarInset } from "@/components/ui/sidebar";

export const dynamic = "force-dynamic";

export default function PropdatesPage() {
  return (
    <SidebarInset>
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">Propdates</h1>
        <Suspense fallback={<div className="text-muted-foreground">Loading…</div>}>
          <PropdatesFeed />
        </Suspense>
      </div>
    </SidebarInset>
  );
}
