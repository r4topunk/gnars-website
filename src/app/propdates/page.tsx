import { Suspense } from "react";
import { PropdatesFeed } from "@/components/propdates/PropdatesFeed";
import { SidebarInset } from "@/components/ui/sidebar";

export const dynamic = "force-dynamic";

export default function PropdatesPage() {
  return (
    <SidebarInset>
      <div className="container mx-auto py-8 px-4">
        <div className="space-y-2 mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Propdates</h1>
          <p className="text-muted-foreground">
            Updates and progress reports on Gnars DAO proposals
          </p>
        </div>
        <Suspense fallback={<div className="text-muted-foreground">Loading…</div>}>
          <PropdatesFeed />
        </Suspense>
      </div>
    </SidebarInset>
  );
}
