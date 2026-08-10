import { getTranslations } from "next-intl/server";
import { CharacterSelector } from "@/components/stake/CharacterSelector";
import { REWARD_SPLIT } from "@/lib/gnars-vaults";
import { SectionHeading, SHELL, StatTile } from "./primitives";

/**
 * "Stake or Die" — the rider roster.
 *
 * The stage, stat sheet and roster tiles already exist as `CharacterSelector`
 * (the /stake page's centrepiece), so this section is only the heading, the
 * yield-split tiles and the wiring. Forking it would give the homepage a second
 * roster to keep in sync with the vaults.
 */
export async function StakeSection() {
  const t = await getTranslations("newhome.stake");

  return (
    <section id="stake" className="px-6 pb-18 pt-22">
      <div className={`${SHELL} flex flex-col gap-7 px-0`}>
        <SectionHeading
          eyebrow={t("eyebrow")}
          eyebrowClassName="text-[#f7c948]"
          title={t("title")}
          body={t("body")}
          aside={
            <>
              <StatTile value={`${REWARD_SPLIT.you}%`} label={t("split.you")} />
              <StatTile
                value={`${REWARD_SPLIT.skater}%`}
                label={t("split.rider")}
                valueClassName="text-[#f7c948]"
              />
              <StatTile
                value={`${REWARD_SPLIT.treasury}%`}
                label={t("split.treasury")}
                valueClassName="text-[#FF2D2D]"
              />
            </>
          }
        />

        <CharacterSelector preview={{ showRates: false }} />
      </div>
    </section>
  );
}
