"use client";

import { useTranslations } from "next-intl";

export function NounstacleDefinition() {
  const t = useTranslations("installations.nogglesrails");

  return (
    <section className="border-t py-12">
      <article className="rounded-lg border bg-card p-6 text-card-foreground">
        <div className="space-y-4 text-foreground">
          <div>
            <h3 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {t("definition.frameworkHeading")}
            </h3>
          </div>

          <div className="space-y-4 text-sm leading-7 text-muted-foreground md:text-base">
            <p>{t("definition.p1")}</p>

            <p>{t("definition.p2")}</p>

            <p>
              <span className="font-semibold text-foreground">
                {t("definition.nounstacleTerm")}
              </span>
              <br />
              <span className="italic">{t("definition.nounstaclePhonetic")}</span>
              <br />
              <span className="font-semibold text-foreground">
                {t("definition.nounstacleDefinitionLabel")}
              </span>{" "}
              {t("definition.nounstacleDefinition")}
            </p>
          </div>
        </div>
      </article>
    </section>
  );
}
