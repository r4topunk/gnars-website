import type { Metadata } from "next";
import NogglesRailsHero from "@/components/nogglesrails/NogglesRailsHero";
import { NogglesRailsMapTabs } from "@/components/nogglesrails/NogglesRailsMapTabs";
import { NogglesRailsGrid } from "@/components/nogglesrails/NogglesRailsGrid";
import { NogglesRailsManifesto } from "@/components/nogglesrails/NogglesRailsManifesto";

export const metadata: Metadata = {
  title: "NogglesRails — Community Skate Infrastructure Worldwide",
  description:
    "Community-funded skate rails installed in spots around the world. Open, CC0, owned by no one and everyone.",
  alternates: {
    canonical: "/nogglesrails",
  },
  openGraph: {
    title: "NogglesRails — Community Skate Infrastructure Worldwide",
    description:
      "Community-funded skate rails installed in spots around the world. Open, CC0, owned by no one and everyone.",
    images: [
      {
        url: "https://storage.googleapis.com/papyrus_images/b02b9fbd4c2d10074918450eb30464643516cfb55a5a51ed4dfa1e076749cc1c.gif",
        width: 1200,
        height: 630,
        alt: "NogglesRails — Community Skate Infrastructure",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NogglesRails — Community Skate Infrastructure Worldwide",
    description:
      "Community-funded skate rails installed in spots around the world. Open, CC0, owned by no one and everyone.",
    images: [
      "https://storage.googleapis.com/papyrus_images/b02b9fbd4c2d10074918450eb30464643516cfb55a5a51ed4dfa1e076749cc1c.gif",
    ],
  },
};

export default function NogglesRailsPage() {
  return (
    <div className="flex flex-col gap-10 pb-8">
      <NogglesRailsHero />
      <NogglesRailsMapTabs />
      <NogglesRailsManifesto />
      <NogglesRailsGrid />
    </div>
  );
}
