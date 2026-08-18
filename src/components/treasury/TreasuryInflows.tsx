import { getTranslations } from "next-intl/server";
import { ArrowDownLeft } from "lucide-react";
import { TreasuryInflowsList } from "@/components/treasury/TreasuryInflowsList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadTreasuryInflows } from "@/services/treasury-inflows";

/**
 * The treasury's most recent income, newest first.
 *
 * This component is now only the frame and the fetch — the rows moved to
 * `TreasuryInflowsList`, a client component, because "show more" needs state.
 *
 * The whole window is fetched here and paged in the browser rather than sliced
 * on the server, and the ordering is why: inflows are newest-first, and the
 * auction credits are older than the newest handful. Fetching eight rows meant
 * the Auction badge existed in code, fired correctly, and was never once on
 * screen. Paging client-side costs a slightly larger payload and shows the
 * history that makes the badges worth having.
 */
const WINDOW = 100;

export async function TreasuryInflows({ locale }: { locale: string }) {
  const t = await getTranslations("treasury.inflows");
  const inflows = await loadTreasuryInflows(WINDOW);
  // Rendered once per request on the server; the timestamp IS the snapshot, so
  // the relative ages cannot shift between server render and hydration.
  // eslint-disable-next-line react-hooks/purity -- server component, render-time clock read for relative ages
  const now = Date.now();

  return (
    <Card className="gap-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <ArrowDownLeft className="size-4 text-emerald-500" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {inflows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <TreasuryInflowsList inflows={inflows} locale={locale} now={now} />
        )}
      </CardContent>
    </Card>
  );
}
