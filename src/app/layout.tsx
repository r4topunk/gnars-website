import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Geist, Geist_Mono } from "next/font/google";
import { DaoHeader } from "@/components/layout/DaoHeader";
// import { MuralBackground } from "@/components/layout/MuralBackground";
import Providers from "@/components/layout/Providers";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { MiniAppProvider } from "@/components/miniapp/MiniAppProvider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MINIAPP_EMBED_CONFIG, MINIAPP_CONFIG } from "@/lib/miniapp-config";
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
  title: "Gnars DAO",
  description: "Nounish Open Source Action Sports Brand experiment",
  // Open Graph metadata for social sharing
  openGraph: {
    title: "Gnars DAO",
    description: "Nounish Open Source Action Sports Brand experiment",
    images: [MINIAPP_CONFIG.miniapp.ogImageUrl],
    type: "website",
  },
  // Twitter card metadata
  twitter: {
    card: "summary_large_image",
    title: "Gnars DAO",
    description: "Nounish Open Source Action Sports Brand experiment",
    images: [MINIAPP_CONFIG.miniapp.ogImageUrl],
  },
  // Farcaster mini app embed metadata
  other: {
    "fc:miniapp": JSON.stringify(MINIAPP_EMBED_CONFIG),
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
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            <MiniAppProvider>
              <TooltipProvider>
                {/* <MuralBackground /> */}
                <ScrollToTop />
                <DaoHeader />
                <main className="max-w-6xl mx-auto px-4">{children}</main>
                <Toaster />
              </TooltipProvider>
            </MiniAppProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
