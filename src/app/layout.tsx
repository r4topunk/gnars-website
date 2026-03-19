import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Geist, Geist_Mono } from "next/font/google";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { DaoHeader } from "@/components/layout/DaoHeader";
// import { MuralBackground } from "@/components/layout/MuralBackground";
import Providers from "@/components/layout/Providers";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { MiniAppReady } from "@/components/miniapp/MiniAppReady";
import { NogglesCopyFooter } from "@/components/home/NogglesCopyFooter";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MiniTVVisibilityProvider } from "@/components/tv/MiniTVVisibilityContext";
import { MiniTV } from "@/components/tv/MiniTV";
import { MINIAPP_EMBED_CONFIG } from "@/lib/miniapp-config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.gnars.com"),
  title: "Gnars DAO",
  description: "Nounish Open Source Action Sports Brand experiment",
  verification: {
    google: "1CaAKNV0z6Oeq0cV7COlSbEk9ejpucay2WH_X2AtkLI",
  },
  // Open Graph metadata for social sharing
  openGraph: {
    title: "Gnars DAO",
    description: "Nounish Open Source Action Sports Brand experiment",
    type: "website",
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
    title: "Gnars DAO",
    description: "Nounish Open Source Action Sports Brand experiment",
    images: ["/logo-banner.jpg"],
  },
  // Farcaster mini app embed metadata
  other: {
    "fc:miniapp": JSON.stringify(MINIAPP_EMBED_CONFIG),
    "base:app_id": "6920c9d87fdd1c48120364b3",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
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
                <main className="max-w-6xl mx-auto px-4">{children}</main>
                <NogglesCopyFooter />
                <Toaster />
                <MiniTV />
              </MiniTVVisibilityProvider>
            </TooltipProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
