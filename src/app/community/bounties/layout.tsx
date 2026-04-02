import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gnars Grants",
  description: "built by shredders, tested in the real world",
  openGraph: {
    title: "Challenges - Gnars",
    description: "Gnarly challenges from the action sports community",
    type: "website",
    url: "https://gnars.com/community/bounties",
  },
  twitter: {
    card: "summary_large_image",
    title: "Challenges - Gnars",
    description: "Gnarly challenges from the action sports community",
  },
  other: {
    "fc:frame": JSON.stringify({
      version: "next",
      imageUrl: "https://gnars.com/community/bounties/opengraph-image",
      button: {
        title: "View Challenges",
        action: {
          type: "launch_frame",
          name: "Gnars Challenges",
          url: "https://gnars.com/community/bounties",
          splashImageUrl: "https://gnars.com/community/bounties/opengraph-image",
        },
      },
    }),
  },
};

export default function BountiesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
