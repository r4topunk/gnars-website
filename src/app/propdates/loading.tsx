import { PropdatesFeedSkeleton } from "@/components/propdates/PropdatesFeedSkeleton";
import { SidebarInset } from "@/components/ui/sidebar";

export default function LoadingPropdatesPage() {
  return (
    <SidebarInset>
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">Propdates</h1>
        <PropdatesFeedSkeleton count={6} />
      </div>
    </SidebarInset>
  );
}
