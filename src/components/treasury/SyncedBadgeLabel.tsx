"use client";

import { useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

/**
 * Relative time must be computed against the viewer's clock — an ISR page's
 * server render can itself be minutes old, so the server HTML carries no time
 * and the label fills in on mount.
 */
export function SyncedBadgeLabel({ generatedAt }: { generatedAt: number }) {
  const t = useTranslations("treasury.page");
  const format = useFormatter();
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    setTime(format.relativeTime(generatedAt, Date.now()));
  }, [format, generatedAt]);
  if (time == null) return null;
  return <span>{t("synced", { time })}</span>;
}
