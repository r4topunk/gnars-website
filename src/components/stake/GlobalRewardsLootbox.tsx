"use client";

import { MorLootbox } from "@/components/stake/MorLootbox";
import { usePathname } from "@/i18n/navigation";

/**
 * The rewards lootbox, site-wide.
 *
 * It used to be mounted only by /stake, so anyone with claimable MOR or vault
 * yield had to already be on that page to find out. Mounting it in the layout
 * puts the affordance on every route instead.
 *
 * /stake is the one exception: `StakePageContent` mounts its own controlled
 * instance there, because the rows in PositionsHub open the same modal and need
 * to own its open state. Rendering this one as well would put two floating
 * buttons in the same corner.
 */
export function GlobalRewardsLootbox() {
  const pathname = usePathname();
  if (pathname === "/stake" || pathname.startsWith("/stake/")) return null;
  return <MorLootbox showEnablePrompt />;
}
