"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export function NogglesRailsManifesto() {
  const t = useTranslations("installations.nogglesrails");

  return (
    <section className="space-y-8 border-t py-12">
      <div className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-lg border bg-card p-6 text-card-foreground">
          <div className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {t("manifesto.originsLabel")}
          </div>
          <h2 className="mb-4 text-2xl font-bold tracking-tight">
            {t("manifesto.originsHeading")}
          </h2>
          <div className="space-y-4 text-sm leading-7 text-muted-foreground md:text-base">
            <p>{t("manifesto.originsP1")}</p>
            <p>{t("manifesto.originsP2")}</p>
            <p>
              <Link
                href="https://www.gnars.com/droposals/88"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
              >
                {t("manifesto.originsDocLink")}
              </Link>
            </p>
          </div>
        </article>

        <article className="rounded-lg border bg-card p-6 text-card-foreground">
          <div className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {t("manifesto.openSourceLabel")}
          </div>
          <h2 className="mb-4 text-2xl font-bold tracking-tight">
            {t("manifesto.openSourceHeading")}
          </h2>
          <div className="space-y-4 text-sm leading-7 text-muted-foreground md:text-base">
            <p>{t("manifesto.openSourceP1")}</p>
            <p>
              <Link
                href="https://drive.google.com/drive/folders/1MwAEBKHuFhgDB7HrI1PjMSNq5wkPDvLB"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
              >
                {t("manifesto.openSourceFilesLink")}
              </Link>
            </p>
          </div>
        </article>
      </div>

      <div className="border-t pt-8 text-center">
        <p className="mx-auto max-w-lg text-muted-foreground">{t("manifesto.ctaDescription")}</p>
        <Button asChild className="mt-4">
          <Link href="/propose">{t("actions.submitProposal")}</Link>
        </Button>
      </div>
    </section>
  );
}
