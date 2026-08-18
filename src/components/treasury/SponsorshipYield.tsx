"use client";

// The DAO's cut of the rider sponsorship vaults.
//
// The performance fee is minted as vault SHARES to each rider's 0xSplits
// contract, which splits them Gnars 50 / athlete 50 — verified on-chain against
// each split's stored `splitHash`, so the "you keep half, rider + treasury take
// the rest" claim has a source that is not a code comment.
//
// WHAT NEEDS GOVERNANCE AND WHAT DOES NOT. This card used to be a single
// "Start claim proposal" button, which told visitors the whole thing was gated
// behind a 4-day vote plus timelock. Two of the three remaining steps are not:
//   distribute() on the split          — permissionless (split `paused` = false)
//   SplitsWarehouse.withdraw(treasury) — permissionless (the treasury's
//                                        withdrawConfig is `paused` = false, so
//                                        a third party can push the balance to
//                                        the owner without being the owner)
//   VaultV2.redeem(shares → USDC)      — treasury only, because ERC-4626 requires
//                                        msg.sender to own or be approved for the
//                                        shares. The treasury is a timelock, so
//                                        this one really is a proposal.
// After the withdraw the treasury already OWNS the shares and they keep earning.
// The proposal is only needed to convert them to USDC — so the two halves are
// presented separately instead of one button implying friction that isn't there.
//
// TVL and accrued yield both come from the shared stake graph rather than
// bespoke RPC reads, so this card and /stake can never disagree about a rider's
// numbers.
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ExternalLink, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStakeGraphQuery } from "@/hooks/use-stake-graph";
import { RIDER_LIST, type RiderId } from "@/lib/gnars-vaults";

/**
 * Avatar crop per rider. Duplicated from StakeOrbit's `RIDER_VISUAL` on purpose,
 * same reasoning that file gives: importing it would drag the orbit's whole
 * module graph onto the treasury page for the sake of seven thumbnails. A rider
 * gaining a new cut-out needs it in both.
 */
export const AVATAR: Record<RiderId, { src: string; size: string; pos: string }> = {
  vlad: { src: "/stake/cutout/vlad.png", size: "420%", pos: "50% 6%" },
  yan: { src: "/stake/cutout/yan.png", size: "420%", pos: "50% 5%" },
  r4to: { src: "/stake/cutout/r4to.png", size: "420%", pos: "50% 5%" },
  pamtech: { src: "/stake/cutout/pamtech.png", size: "420%", pos: "50% 9%" },
  v2: { src: "/stake/cutout/v2.png", size: "420%", pos: "50% 8%" },
  zima: { src: "/stake/cutout/zima.png", size: "330%", pos: "50% 3%" },
  will: { src: "/stake/cutout/will.png", size: "400%", pos: "50% 8%" },
  ephraim: { src: "/stake/cutout/ephraim.png", size: "400%", pos: "50% 8%" },
};

// explorer.splits.org, NOT app.splits.org: the app answers "Account not found"
// for these SplitV2 contracts (verified in a browser on Vlad's split), while
// the explorer renders the contract, its recipients and the Distribute button.
const SPLITS_APP = (split: string) => `https://explorer.splits.org/accounts/${split}/?chainId=8453`;

export function SponsorshipYield() {
  const t = useTranslations("treasury.sponsorship");
  const tc = useTranslations("stake.characters");
  const locale = useLocale();
  const { data: graph } = useStakeGraphQuery();

  // Nothing deployed yet — don't show an empty widget on the treasury page.
  if (RIDER_LIST.every((r) => !r.vault)) return null;

  const usd = (n: number) =>
    `$${n.toLocaleString(locale, { maximumFractionDigits: n > 0 && n < 100 ? 4 : 2 })}`;

  const byId = new Map((graph?.athletes ?? []).map((a) => [a.id, a]));
  const rows = RIDER_LIST.map((r) => {
    const a = byId.get(r.id);
    return {
      id: r.id,
      split: r.split,
      // The split holds the whole fee; the treasury's half is what this card is about.
      yieldUsd: a ? a.feeAccrued / 2 : null,
      tvl: a ? a.total : null,
    };
  });

  const treasuryShare = rows.reduce((s, r) => s + (r.yieldUsd ?? 0), 0);
  // One source of truth: `total` is the vault's own `totalAssets()`, the same
  // read the stake orbit sums. No second TVL field to drift out of step.
  const totalTvl = rows.reduce((s, r) => s + (r.tvl ?? 0), 0);
  const claimable = rows.filter((r) => r.split && (r.yieldUsd ?? 0) > 0);

  return (
    <Card className="gap-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <PiggyBank className="size-4" /> {t("title")}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <p className="font-mono text-2xl font-bold tabular-nums">
            {graph ? usd(treasuryShare) : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("desc")}</p>
        </div>

        <div>
          <div className="grid grid-cols-[minmax(0,1fr)_72px_66px] gap-2.5 border-b border-border pb-2 text-[11px] font-medium text-muted-foreground">
            <span>{t("colRider")}</span>
            <span className="text-right">{t("colTvl")}</span>
            <span className="text-right">{t("colYield")}</span>
          </div>

          <ul className="mt-1">
            {rows.map((r) => (
              <li
                key={r.id}
                className="grid grid-cols-[minmax(0,1fr)_72px_66px] items-center gap-2.5 py-1.5"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {/* Cropped to the face the same way the orbit nodes are, so a
                      rider reads as the same character across the site. */}
                  <span className="relative size-6 shrink-0 overflow-hidden rounded-full bg-muted">
                    <Image
                      src={AVATAR[r.id].src}
                      alt=""
                      fill
                      sizes="24px"
                      className="object-cover"
                      style={{
                        objectPosition: AVATAR[r.id].pos,
                        scale: parseFloat(AVATAR[r.id].size) / 100,
                      }}
                    />
                  </span>
                  <span className="truncate text-[13px] font-medium">{tc(`${r.id}.name`)}</span>
                </span>

                {/* An em dash is not zero. No vault, or a vault nobody has
                    deposited into, is a different fact from "earned nothing" —
                    and the yield column right beside it says $0 for exactly
                    that case, so the two must not look alike. */}
                <span className="text-right font-mono text-xs tabular-nums text-muted-foreground">
                  {(r.tvl ?? 0) > 0 ? usd(r.tvl as number) : "–"}
                </span>
                <span
                  className={`text-right font-mono text-xs font-semibold tabular-nums ${
                    (r.yieldUsd ?? 0) > 0 ? "text-amber-500" : "text-muted-foreground"
                  }`}
                >
                  {usd(r.yieldUsd ?? 0)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* One source of truth: `total` is each vault's own `totalAssets()`, the
            same read the stake orbit sums — no second TVL field to drift. */}
        <div className="flex items-baseline justify-between gap-2.5 border-t border-border pt-3">
          <span className="text-xs text-muted-foreground">{t("totalTvl")}</span>
          <span className="font-mono text-sm font-semibold tabular-nums">
            {graph ? usd(totalTvl) : "—"}
          </span>
        </div>

        {claimable.length > 0 ? (
          <div className="space-y-3">
            {/* Permissionless first, deliberately: it is the step available RIGHT
                NOW, and burying it under the proposal button is what made the
                whole flow look gated. */}
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <p className="text-xs font-semibold">{t("openTitle")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("openDesc")}</p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {claimable.map((r) => (
                  <a
                    key={r.id}
                    href={SPLITS_APP(r.split as string)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium underline underline-offset-4 hover:text-foreground"
                  >
                    {tc(`${r.id}.name`)}
                    <ExternalLink className="size-3" />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">{t("govDesc")}</p>
              <Button asChild size="sm" variant="outline" className="mt-2 w-full cursor-pointer">
                <Link href="/propose?template=sponsorship-yield-claim">
                  {t("govCta")} <ArrowRight className="ml-1 size-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
