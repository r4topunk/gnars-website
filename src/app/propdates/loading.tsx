import { PropdatesFeedSkeleton } from "@/components/propdates/PropdatesFeedSkeleton";

export default function LoadingPropdatesPage() {
  return (
    <div className="py-8">
      <h1 className="text-2xl font-bold mb-6">Propdates</h1>
      <PropdatesFeedSkeleton count={6} />
    </div>
  );
}
