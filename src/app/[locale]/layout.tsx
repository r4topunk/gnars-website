import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { ThemeProvider } from "next-themes";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { AAOnboarding } from "@/components/layout/AAOnboarding";
import { DaoHeader } from "@/components/layout/DaoHeader";
// import { MuralBackground } from "@/components/layout/MuralBackground";
import Providers from "@/components/layout/Providers";
import { FooterBar } from "@/components/layout/FooterBar";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { MiniAppReady } from "@/components/miniapp/MiniAppReady";
import { MiniTV } from "@/components/tv/MiniTV";
import { MiniTVVisibilityProvider } from "@/components/tv/MiniTVVisibilityContext";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { routing } from "@/i18n/routing";
import { MINIAPP_EMBED_CONFIG } from "@/lib/miniapp-config";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.home" });
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.gnars.com"),
    title: t("title"),
    description: t("description"),
    verification: {
      google: "1CaAKNV0z6Oeq0cV7COlSbEk9ejpucay2WH_X2AtkLI",
    },
    // Open Graph metadata for social sharing
    openGraph: {
      title: t("title"),
      description: t("description"),
      type: "website",
      locale: locale === "pt-br" ? "pt_BR" : "en_US",
      images: [
        {
          url: "/logo-banner.jpg",
          width: 2880,
          height: 1880,
          alt: "Gnars DAO",
        },
      ],
    },
    // Twitter card metadata
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: ["/logo-banner.jpg"],
    },
    // Farcaster mini app embed metadata
    other: {
      "fc:miniapp": JSON.stringify(MINIAPP_EMBED_CONFIG),
      "base:app_id": "6920c9d87fdd1c48120364b3",
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <GoogleAnalytics />
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Providers>
              <TooltipProvider>
                <MiniTVVisibilityProvider>
                  <MiniAppReady />
                  {/* <MuralBackground /> */}
                  <ScrollToTop />
                  <DaoHeader />
                  <AAOnboarding />
                  <main className="max-w-6xl mx-auto px-4">{children}</main>
                  <FooterBar />
                  <Toaster />
                  <MiniTV />
                </MiniTVVisibilityProvider>
              </TooltipProvider>
            </Providers>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
