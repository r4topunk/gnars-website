"use client";

// Demo mode for the auction card on /base. The live AuctionPanel can be an
// awkward salesman — a fresh auction reads "0.000 ETH" until the first bid.
// This panel REPLAYS real settled auctions instead: real Gnars, real final
// bids, real winners, cycling with a count-up and a crew quip. Everything
// on-screen happened; the only cosmetic layer is the commentary, and the DEMO
// chip says exactly what the card is. The footer states the real cumulative
// auction revenue (same figure the treasury page reports).
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { CHARACTERS } from "@/components/stake/CharacterSelector";
import { CountUp } from "@/components/ui/count-up";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { PastAuction } from "@/services/auctions";

const GOLD = "linear-gradient(135deg,#f7c948,#f5851f)";
const ROTATE_MS = 6000;
const QUIPS = ["q1", "q2", "q3", "q4", "q5"] as const;
// Quip narrators cycle through the same crew that fronts /morpheus.
const NARRATORS = ["vlad", "r4to", "yan", "pamtech"] as const;

export function AuctionDemoPanel({
  items,
  totalSalesEth,
}: {
  items: PastAuction[];
  totalSalesEth: number;
}) {
  const t = useTranslations("base.demo");
  const [index, setIndex] = useState(0);

  const usable = useMemo(() => items.filter((a) => a.imageUrl && Number(a.finalBid) > 0), [items]);

  useEffect(() => {
    if (usable.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % usable.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [usable.length]);

  if (usable.length === 0) return null;
  const a = usable[index % usable.length];
  const narrator = CHARACTERS.find((c) => c.id === NARRATORS[index % NARRATORS.length]);

  return (
    <div className="flex h-full flex-col gap-4 rounded-2xl border border-[#f7c948]/25 bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <span
          className="inline-flex items-center gap-[7px] rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em]"
          style={{ backgroundImage: GOLD, color: "#1a1205" }}
        >
          {t("chip")}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={a.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.35 }}
          className="flex flex-1 flex-col gap-4"
        >
          <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border/60">
            {a.imageUrl ? (
              // IPFS gateway art, unknown dimensions; plain img matches PastAuctions.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={a.imageUrl}
                alt={t("gnarNo", { id: a.tokenId })}
                className="h-full w-full object-cover"
              />
            ) : null}
            <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 font-mono text-xs font-bold text-white">
              {t("gnarNo", { id: a.tokenId })}
            </span>
            <span
              className="absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider"
              style={{ backgroundImage: GOLD, color: "#1a1205" }}
            >
              {t("sold")}
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-3">
            <span className="font-mono text-2xl font-black tabular-nums">
              <CountUp value={Number(a.finalBid)} decimals={3} durationMs={900} /> ETH
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {t("wonBy")}{" "}
              <Link
                href={`/members/${a.winner}`}
                className="font-mono font-semibold text-foreground hover:underline"
              >
                {a.winner.slice(0, 6)}…{a.winner.slice(-4)}
              </Link>
            </span>
          </div>

          {narrator ? (
            <div className="flex items-center gap-2.5">
              <div
                aria-hidden
                className="h-10 w-10 shrink-0"
                style={{
                  backgroundImage: `url("${narrator.image}")`,
                  backgroundSize: narrator.face.size,
                  backgroundPosition: narrator.face.pos,
                  backgroundRepeat: "no-repeat",
                  maskImage: "linear-gradient(to bottom, black 72%, transparent 98%)",
                  WebkitMaskImage: "linear-gradient(to bottom, black 72%, transparent 98%)",
                }}
              />
              <motion.p
                key={`${a.id}-quip`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="rounded-2xl border border-border/60 bg-background/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground"
              >
                {t(`quips.${QUIPS[index % QUIPS.length]}`)}
              </motion.p>
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>

      {/* Rotation dots — real state, one per replayed auction. */}
      <div className="flex items-center justify-center gap-1.5">
        {usable.map((x, i) => (
          <button
            key={x.id}
            type="button"
            aria-label={t("gnarNo", { id: x.tokenId })}
            onClick={() => setIndex(i)}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === index % usable.length ? "w-5 bg-foreground/80" : "w-1.5 bg-foreground/25",
            )}
          />
        ))}
      </div>

      <p className="border-t border-border/60 pt-3 text-center text-xs font-semibold">
        {t("totalRaised", { n: Math.round(totalSalesEth) })}
      </p>
    </div>
  );
}
