import { PropdateDetailSkeleton } from "@/components/propdates/PropdateDetailSkeleton";

export default function LoadingPropdateDetail() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Propdate</h1>
      <PropdateDetailSkeleton />
    </div>
  );
}
