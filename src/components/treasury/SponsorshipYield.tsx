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
//
// The headline is the graph's `treasuryUsd` — the SAME field /stake prints as
// "earned for the treasury" — because these two pages answering "what did the
// riders earn the DAO" with different numbers is precisely the drift this card
// was supposed to have ruled out. What it earns splits two ways, so both are
// named under it: the Morpho vaults' performance fee, and MOR from the Morpheus
// stake. The per-rider table below stays vault-only, since the fee is the only
// part attributable per rider.
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ExternalLink, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStakeGraphQuery } from "@/hooks/use-stake-graph";
import { RIDER_LIST, type RiderId } from "@/lib/gnars-vaults";
import { localizeFiat } from "@/lib/i18n/fiat";
import { toIntlLocale } from "@/lib/i18n/format";
import { FiatFallbackNote } from "./FiatFallbackNote";

/**
 * Avatar crop per rider. Duplicated from StakeOrbit's `RIDER_VISUAL` on purpose,
 * same reasoning that file gives: importing it would drag the orbit's whole
 * module graph onto the treasury page for the sake of seven thumbnails. A rider
 * gaining a new cut-out needs it in both.
 */
export const AVATAR: Record<RiderId, { src: string; size: string; pos: string }> = {
  vlad: { src: "/stake/cutout/vlad.png", size: "480%", pos: "50% 5.5%" },
  yan: { src: "/stake/cutout/yan.png", size: "480%", pos: "50% 5.5%" },
  r4to: { src: "/stake/cutout/r4to.png", size: "480%", pos: "50% 5.5%" },
  pamtech: { src: "/stake/cutout/pamtech.png", size: "480%", pos: "50% 5.5%" },
  v2: { src: "/stake/cutout/v2.png", size: "480%", pos: "50% 5.5%" },
  zima: { src: "/stake/cutout/zima.png", size: "480%", pos: "50% 5.5%" },
  will: { src: "/stake/cutout/will.png", size: "480%", pos: "50% 5.5%" },
  ephraim: { src: "/stake/cutout/ephraim.png", size: "480%", pos: "50% 5.5%" },
};

// explorer.splits.org, NOT app.splits.org: the app answers "Account not found"
// for these SplitV2 contracts (verified in a browser on Vlad's split), while
// the explorer renders the contract, its recipients and the Distribute button.
const SPLITS_APP = (split: string) => `https://explorer.splits.org/accounts/${split}/?chainId=8453`;

export function SponsorshipYield({ brlRate = null }: { brlRate?: number | null }) {
  const t = useTranslations("treasury.sponsorship");
  const tc = useTranslations("stake.characters");
  const locale = useLocale();
  const { data: graph } = useStakeGraphQuery();

  // Nothing deployed yet — don't show an empty widget on the treasury page.
  if (RIDER_LIST.every((r) => !r.vault)) return null;

  const usd = (n: number) => {
    const { value, currency } = localizeFiat(n, locale, brlRate);
    // The 4-digit rule keys off the DISPLAYED magnitude: a sub-cent accrual
    // stays sub-cent after conversion and still needs the extra precision.
    return new Intl.NumberFormat(toIntlLocale(locale), {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: value > 0 && value < 100 ? 4 : 2,
    }).format(value);
  };

  const byId = new Map((graph?.athletes ?? []).map((a) => [a.id, a]));
  const rows = RIDER_LIST.map((r) => {
    const a = byId.get(r.id);
    return {
      id: r.id,
      split: r.split,
      // The split holds the whole fee; the treasury's half is what this column is about.
      yieldUsd: a ? a.feeAccrued / 2 : null,
      // `total` (vault + Morpheus stake) — the SAME figure the orbit node
      // prints, so a rider backed purely through Morpheus (Will's MOR stake)
      // no longer reads as having nothing behind him here while /stake lights
      // him up. The yield column stays vault-fee-only because that is the only
      // per-rider-attributable earning — the MOR half of the treasury's take
      // exists only as the graph-level aggregate in the headline above. The
      // header says "Staked", not "Vault TVL", for exactly this reason: these
      // two columns answer different questions and must not be read as a rate.
      tvl: a ? a.total : null,
    };
  });

  // The headline is the graph's own `treasuryUsd` — the identical field /stake
  // prints as "earned for the treasury". It used to be re-derived here as the
  // vault fee alone, so the same question got two different answers on two
  // pages ($0.0024 here against $0.0112 there) with nothing saying one was a
  // subset of the other. The components are named underneath it instead.
  const treasuryTotal = graph?.treasuryUsd ?? 0;
  const vaultShare = graph?.gnarsAccrued ?? 0;
  const morShare = graph?.gnarsMorUsd ?? 0;
  // One source of truth: the graph's own headline total (vault + Morpheus),
  // the identical number the orbit prints — never a second sum to drift.
  const totalTvl = graph?.total ?? 0;
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
            {graph ? usd(treasuryTotal) : "—"}
          </p>
          {/* Both halves, always — including a zero one. "Vault fee $0" is what
              tells a reader the headline is not the vault fee, which is the
              confusion this card started from. */}
          <dl className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
            <div className="flex items-baseline gap-1.5">
              <dt>{t("fromVaults")}</dt>
              <dd className="font-mono tabular-nums">{graph ? usd(vaultShare) : "—"}</dd>
            </div>
            <div className="flex items-baseline gap-1.5">
              <dt>{t("fromMor")}</dt>
              <dd className="font-mono tabular-nums">{graph ? usd(morShare) : "—"}</dd>
            </div>
          </dl>
          <p className="mt-1.5 text-xs text-muted-foreground">{t("desc")}</p>
          {/* The accrual mechanism, stated because the raw numbers look wrong
              without it: Morpho VaultV2 mints the fee on vault INTERACTIONS,
              not continuously. Yan's figure once jumped 66x in a day (a
              partial withdrawal realised ~a month of accrual at once), which
              reads as a bug unless the card says it is the mechanism. */}
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/70">
            {t("accrualNote")}
          </p>
          <FiatFallbackNote brlRate={brlRate} className="mt-2" />
        </div>

        <div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2.5 border-b border-border pb-2 text-[11px] font-medium text-muted-foreground">
            <span>{t("colRider")}</span>
            <span className="text-right">{t("colTvl")}</span>
            <span className="text-right">{t("colYield")}</span>
          </div>

          <ul className="mt-1">
            {rows.map((r) => (
              <li
                key={r.id}
                className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2.5 py-1.5"
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

        <div className="border-t border-border pt-3">
          <div className="flex items-baseline justify-between gap-2.5">
            <span className="text-xs text-muted-foreground">{t("totalTvl")}</span>
            <span className="font-mono text-sm font-semibold tabular-nums">
              {graph ? usd(totalTvl) : "—"}
            </span>
          </div>
          {/* Same word ("staked"), different subject: this figure is the
              SUPPORTERS' money behind the riders. The treasury's own position
              sits centimeters below in the In DeFi card — without this line,
              "$79k staked" next to "vault shares $0" reads as a contradiction. */}
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground/70">
            {t("stakedNote")}
          </p>
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
