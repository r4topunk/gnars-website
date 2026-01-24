import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Gnars — Community-Owned Skateboarding Collective",
  description:
    "Gnars is a community-owned skateboarding collective and DAO that funds skate culture, skaters, and independent projects worldwide.",
  alternates: {
    canonical: "/about",
  },
};

export default function AboutPage() {
  return (
    <div className="py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">About Gnars</h1>

        <p className="text-muted-foreground">
          Gnars is a skateboarding collective and community owned skate brand. We&apos;re built by
          skaters, artists, and builders who want to fund skate culture without corporate gatekeeping.
          The DAO is just the tool we use to make the decisions together.
        </p>

        <h2 className="text-2xl font-semibold">Community ownership in practice</h2>
        <p className="text-muted-foreground">
          Members propose ideas, vote, and fund projects that push skateboarding forward—video
          parts, events, public installations, and the people making them happen. It&apos;s a
          community owned skate brand that stays accountable to the culture.
        </p>

        <h2 className="text-2xl font-semibold">How it works</h2>
        <p className="text-muted-foreground">
          Proposals are the way we decide what to support. Auctions help fund the treasury, and
          the community directs those resources to skateboarding grants and creative projects.
        </p>

        <div className="flex flex-wrap gap-4">
          <Link href="/" className="text-foreground underline underline-offset-4">
            Home
          </Link>
          <Link href="/proposals" className="text-foreground underline underline-offset-4">
            Proposals & grants
          </Link>
          <Link href="/auctions" className="text-foreground underline underline-offset-4">
            Auctions supporting skate culture
          </Link>
        </div>
      </div>
    </div>
  );
}
