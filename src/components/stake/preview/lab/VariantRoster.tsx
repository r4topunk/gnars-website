"use client";

// Variant D: roster as hero.
//
// Inverts the prototype's hierarchy. The baseline presents one rider at a time on
// a tall 4:5 stage and hangs three lines of text next to it, which is where the
// dead air comes from. Here the lineup IS the element: all seven riders sit in one
// row, each with face art, name and its own live backing figure, so the comparison
// the page actually wants a visitor to make ("who needs backing?") happens without
// a single click. Selection only decides who the slim action bar below talks about.
//
// Data fan-out: `useVaultTotal` is one `totalAssets` eth_call per vault, fired once
// on mount, no polling, on a fallback transport. Seven of them is cheap enough to
// render every rider's number, so nothing is hidden behind selection. Each tile
// owns its own call and reports the result up, so the action bar reuses the
// selected tile's read instead of issuing an eighth.
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  GOLD,
  GOLD_CTA,
  GOLD_INK,
  GOLD_SOLID,
  MICRO,
  MUTED,
  PANEL,
} from "@/components/stake/preview/preview-config";
import { Button } from "@/components/ui/button";
import { useVaultTotal } from "@/hooks/use-vault-total";
import { getRider, type RiderId } from "@/lib/gnars-vaults";
import { cn } from "@/lib/utils";
import { CHARACTERS } from "../../CharacterSelector";

const usd = (n: number) =>
  `$${n.toLocaleString("en-US", { maximumFractionDigits: n < 100 ? 2 : 0 })}`;

/** What a tile knows about its vault: a number, `null` (no data), or nothing yet. */
type Total = number | null;

interface TileProps {
  id: RiderId;
  name: string;
  image: string;
  face: { size: string; pos: string };
  selected: boolean;
  onSelect: () => void;
  onTotal: (id: RiderId, total: Total) => void;
}

function RiderTile({ id, name, image, face, selected, onSelect, onTotal }: TileProps) {
  const hasVault = Boolean(getRider(id)?.vault);
  const total = useVaultTotal(getRider(id)?.vault);

  useEffect(() => {
    onTotal(id, total);
  }, [id, total, onTotal]);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "cursor-pointer text-left",
        // Only the selected tile lifts. Origin at the bottom so the growth reads
        // as the card stepping forward out of the line, not floating off it.
        "origin-bottom transition-[transform,opacity] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)]",
        selected ? "scale-[1.04]" : "opacity-60 hover:opacity-100",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "block aspect-[4/5] rounded-lg bg-white/[0.03]",
          selected && "ring-2 ring-[#f7c948]",
        )}
        style={{
          backgroundImage: `url("${image}")`,
          backgroundSize: face.size,
          backgroundPosition: face.pos,
          backgroundRepeat: "no-repeat",
        }}
      />
      <span
        className={cn(
          "mt-2 block truncate text-sm",
          selected ? "font-bold text-white" : "font-semibold text-white/70",
        )}
      >
        {name}
      </span>
      {/* The number every tile carries is the whole point of this variant: the
          lineup is comparable at a glance. Mono so the column of figures aligns. */}
      <span className="mt-0.5 block truncate font-mono text-xs">
        {!hasVault ? (
          <span className={MICRO}>no vault yet</span>
        ) : total === null ? (
          <span className={MICRO}>loading</span>
        ) : (
          <span className="font-bold" style={{ color: GOLD_SOLID }}>
            {usd(total)}
          </span>
        )}
      </span>
    </button>
  );
}

export default function VariantRoster() {
  const t = useTranslations("stake");
  const tr = useTranslations("stake.preview.rider");

  const [index, setIndex] = useState(0);
  const [totals, setTotals] = useState<Partial<Record<RiderId, Total>>>({});

  // Stable identity: the tiles depend on it inside an effect, so a new function
  // every render would re-report on every parent render.
  const handleTotal = useCallback((id: RiderId, total: Total) => {
    setTotals((prev) => (prev[id] === total && id in prev ? prev : { ...prev, [id]: total }));
  }, []);

  const active = CHARACTERS[index];
  const activeId = active.id as RiderId;
  const name = t(`characters.${active.id}.name`);
  const tagline = t(`characters.${active.id}.tagline`);
  const hasVault = Boolean(getRider(activeId)?.vault);
  const staked = totals[activeId];

  return (
    <div className="flex flex-col gap-4">
      {/* The lineup. Four across on a phone (two rows, one gap), all seven in a
          single row from lg up: the composition the variant is arguing for. */}
      <div
        role="group"
        aria-label={tr("rosterLabel")}
        className="grid grid-cols-4 gap-3 sm:gap-4 lg:grid-cols-7"
      >
        {CHARACTERS.map((c, i) => (
          <RiderTile
            key={c.id}
            id={c.id as RiderId}
            name={t(`characters.${c.id}.name`)}
            image={c.image}
            face={c.face}
            selected={i === index}
            onSelect={() => setIndex(i)}
            onTotal={handleTotal}
          />
        ))}
      </div>

      {/* Action bar. Everything the baseline's right column held, on one strip the
          width of the lineup, so there is no empty field left to fill. */}
      <div
        className={cn(
          PANEL,
          "flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6",
        )}
      >
        <div className="min-w-0 space-y-1">
          {/* Wraps on a phone (where the strip is two lines anyway) and clips on a
              desktop row, so the CTA never gets pushed off the right edge. */}
          <p className="text-sm text-white sm:truncate">
            <span className="font-bold">{name}</span>
            <span className={MUTED}> · {tagline}</span>
          </p>
          <p className={cn("font-mono text-xs", MUTED)}>
            {!hasVault
              ? t("vaultSoon")
              : staked === undefined || staked === null
                ? t("loadingSupport")
                : t.rich("backing", {
                    name,
                    amount: usd(staked),
                    b: (chunks) => (
                      <span className="font-bold" style={{ color: GOLD_SOLID }}>
                        {chunks}
                      </span>
                    ),
                  })}
          </p>
        </div>

        <Button
          onClick={() => {}}
          className={cn(GOLD_CTA, "w-full shrink-0 px-5 sm:w-auto")}
          style={{ backgroundImage: GOLD, color: GOLD_INK }}
        >
          {t("stakeCta", { name })}
        </Button>
      </div>
    </div>
  );
}
