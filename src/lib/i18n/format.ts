import { enUS, ptBR, type Locale } from "date-fns/locale";

export type AppLocale = "en" | "pt-br";

/** Map next-intl locale → date-fns Locale object for formatDistance/format/etc. */
export function getDateFnsLocale(locale: string): Locale {
  return locale === "pt-br" ? ptBR : enUS;
}

/** Map next-intl locale → BCP-47 tag for Intl.NumberFormat / Intl.DateTimeFormat. */
export function toIntlLocale(locale: string): string {
  return locale === "pt-br" ? "pt-BR" : "en-US";
}
