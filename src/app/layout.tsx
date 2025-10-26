import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Geist, Geist_Mono } from "next/font/google";
import { DaoSidebar } from "@/components/layout/DaoSidebar";
// import { MuralBackground } from "@/components/layout/MuralBackground";
import Providers from "@/components/layout/Providers";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import SidebarFloatingTrigger from "@/components/layout/SidebarFloatingTrigger";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
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
  description:
    "Action sports accelerator and community owned brand. Headless so you can shred more…",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased max-w-screen-xl mx-auto`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            <TooltipProvider>
              <SidebarProvider>
                {/* <MuralBackground /> */}
                <ScrollToTop />
                <DaoSidebar />
                {children}
                <Toaster />
                <SidebarFloatingTrigger />
              </SidebarProvider>
            </TooltipProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
