import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gnars Auctions — Community Funded Skate Art",
  description:
    "Gnars auctions support skateboarding culture by funding community projects, artists, and skate media.",
  alternates: {
    canonical: "/auctions",
  },
};

export default function AuctionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
