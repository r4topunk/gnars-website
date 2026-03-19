import type { Metadata } from "next";
import NogglesRailsHero from "@/components/nogglesrails/NogglesRailsHero";
import { NogglesRailsMap } from "@/components/nogglesrails/NogglesRailsMap";
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
  },
};

export default function NogglesRailsPage() {
  return (
    <div className="flex flex-col gap-10 pb-8">
      <NogglesRailsHero />
      <NogglesRailsMap />
      <NogglesRailsGrid />
      <NogglesRailsManifesto />
    </div>
  );
}
