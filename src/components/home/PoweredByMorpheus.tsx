import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getGnarsSubnetTotalStaked } from "@/lib/morpheus-builder";
import { SUBNET_GOAL_MOR } from "@/lib/stake-milestones";

// "Powered by Morpheus" homepage strip — signals the Gnars × Morpheus
// community-to-community partnership, with the colored Morpheus mark, and links
// to the subnet staking flow. Morpheus green (#2be58b / emerald) accents.
//
// Gated: only surfaces once the subnet actually clears its goal (SUBNET_GOAL_MOR).
// Before that it's a spoiler, so we render nothing. Fails closed — if the
// on-chain read errors we hide it rather than reveal it prematurely.
export async function PoweredByMorpheus() {
  let totalStaked = 0;
  try {
    totalStaked = await getGnarsSubnetTotalStaked();
  } catch {
    return null;
  }
  if (totalStaked < SUBNET_GOAL_MOR) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-4">
      <Link
        href="/stake"
        className="group flex flex-col items-center gap-4 rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.06] via-emerald-500/[0.02] to-transparent p-5 text-center transition-colors hover:border-emerald-500/45 sm:flex-row sm:justify-between sm:text-left"
      >
        <div className="flex items-center gap-3.5">
          <Image
            src="/logos/morpheus.webp"
            alt="Morpheus"
            width={48}
            height={48}
            className="shrink-0 rounded-xl"
          />
          <div>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className="text-sm font-black tracking-tight sm:text-base">Powered by Morpheus</span>
              <span className="rounded-full border border-emerald-500/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                community × community
              </span>
            </div>
            <p className="mt-1 max-w-xl text-xs text-muted-foreground sm:text-sm">
              Gnars is a Morpheus Builder — a community-to-community deal. Back the subnet with MOR and help
              carry decentralized AI into culture.
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-white transition-colors group-hover:bg-emerald-600">
          Back Gnars →
        </span>
      </Link>
    </section>
  );
}
