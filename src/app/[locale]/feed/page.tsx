/**
 * Live Feed Page
 *
 * Displays real-time DAO activity feed with all governance, auction, and token events.
 * Uses Next.js 15 caching with automatic revalidation on Vercel.
 */

import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LiveFeedView } from "@/components/feed/LiveFeedView";
import { getAllFeedEvents } from "@/services/feed-events";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.feed" });
  const path = "/feed";
  const canonical = locale === "en" ? path : `/pt-br${path}`;
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical,
      languages: {
        en: path,
        "pt-br": `/pt-br${path}`,
        "x-default": path,
      },
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      locale: locale === "pt-br" ? "pt_BR" : "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
  };
}

// Revalidate every 60 seconds for fresh data
export const revalidate = 60;

/**
 * Fetch feed events from The Graph subgraph
 *
 * Uses unstable_cache for automatic revalidation
 */
async function getFeedEvents() {
  try {
    // Fetch last 30 days of events (Gnars doesn't have daily activity)
    const events = await getAllFeedEvents(24 * 30); // 30 days
    console.log("[feed page] Got events:", events.length);

    // Fallback to mock data for development if no real events
    if (events.length === 0) {
      console.log("[feed page] No events from subgraph, using mock data");
      const { generateMockFeedEvents } = await import("@/lib/mock-data/feed-events");
      return generateMockFeedEvents(24);
    }

    return events;
  } catch (error) {
    console.error("[feed page] Failed to fetch feed events:", error);
    // Fallback to mock data on error
    const { generateMockFeedEvents } = await import("@/lib/mock-data/feed-events");
    return generateMockFeedEvents(24);
  }
}

export default async function LiveFeedPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("feed");

  const events = await getFeedEvents();

  return (
    <div className="py-8 max-w-4xl mx-auto">
      {/* Page header */}
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">{t("description")}</p>
      </div>

      {/* Feed content */}
      <Suspense fallback={<LiveFeedView events={[]} isLoading />}>
        <LiveFeedView events={events} />
      </Suspense>

      {/* Info banner */}
      <div className="mt-8 p-4 rounded-lg border bg-muted/50">
        <p className="text-sm text-muted-foreground">{t("infoPanel")}</p>
      </div>
    </div>
  );
}
