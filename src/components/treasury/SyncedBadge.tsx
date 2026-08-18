import { DAO_ADDRESSES } from "@/lib/config";
import { loadTreasurySnapshot } from "@/services/treasury";
import { SyncedBadgeLabel } from "./SyncedBadgeLabel";

/** "Synced Xm ago" pill — bound to when the ISR treasury snapshot was computed. */
export async function SyncedBadge() {
  let generatedAt: number;
  try {
    generatedAt = (await loadTreasurySnapshot(DAO_ADDRESSES.treasury)).generatedAt;
  } catch {
    return null;
  }
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
      <span aria-hidden className="size-1.5 rounded-full bg-[var(--chart-2)]" />
      <SyncedBadgeLabel generatedAt={generatedAt} />
    </div>
  );
}
