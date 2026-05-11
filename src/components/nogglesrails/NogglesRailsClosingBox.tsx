"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";

export function NogglesRailsClosingBox() {
  const t = useTranslations("installations.nogglesrails");

  return (
    <section className="space-y-8 border-t py-12">
      <article className="rounded-lg border bg-card p-6 text-card-foreground">
        <div className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {t("closingBox.variationsLabel")}
        </div>
        <div className="mb-6 overflow-hidden rounded-lg border bg-black/20 p-2">
          <div className="relative aspect-[16/9] w-full">
            <Image
              src="https://img.paragraph.com/cdn-cgi/image/format=auto,width=1200,quality=85/https://storage.googleapis.com/papyrus_images/87e8297dbb18991c60288e0d89bd9222395c0c123b3ded7ecd0684f5b9f96df1.png"
              alt={t("closingBox.variationsAlt")}
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        </div>
        <h2 className="mb-4 text-2xl font-bold tracking-tight">
          {t("closingBox.variationsHeading")}
        </h2>
        <p className="text-sm leading-7 text-muted-foreground md:text-base">
          {t("closingBox.variationsP1")}
        </p>
        <p className="mt-4 text-sm leading-7 text-muted-foreground md:text-base">
          {t("closingBox.variationsP2")}
        </p>
      </article>

      <article className="rounded-lg border bg-card p-6 text-card-foreground">
        <div className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {t("closingBox.stillRollingLabel")}
        </div>
        <h2 className="mb-4 text-2xl font-bold tracking-tight">
          {t("closingBox.stillRollingHeading")}
        </h2>
        <p className="text-sm leading-7 text-muted-foreground md:text-base">
          {t("closingBox.stillRollingP")}
        </p>
      </article>
    </section>
  );
}
