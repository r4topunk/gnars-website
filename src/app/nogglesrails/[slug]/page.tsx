import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { NOGGLES_RAILS, getRailBySlug } from "@/content/nogglesrails";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return NOGGLES_RAILS.map((rail) => ({ slug: rail.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const rail = getRailBySlug(slug);
  if (!rail) return { title: "Rail Not Found" };
  return {
    title: `${rail.label} — NogglesRails`,
    description: rail.description,
  };
}

function resolveLink(link: string): string {
  if (!link) return "";
  return link.startsWith("http") ? link : `https://${link}`;
}

export default async function NogglesRailDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const rail = getRailBySlug(slug);
  if (!rail) notFound();

  const proposalUrl = resolveLink(rail.proposal.link);
  const [hero, ...gallery] = rail.images;

  return (
    <div className="py-6">
      {/* Back */}
      <Link
        href="/nogglesrails"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        All Rails
      </Link>

      {/* Header */}
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            {rail.label}
          </h1>
          <Badge variant="secondary">{rail.type}</Badge>
        </div>
        <p className="text-muted-foreground">
          {rail.city}, {rail.country} &middot; {rail.continent}
        </p>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px]">
        {/* Main */}
        <div className="space-y-8">
          {/* Hero image */}
          {hero && (
            <div className="relative aspect-video overflow-hidden rounded-lg border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={hero}
                alt={rail.label}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <h2 className="mb-2 text-lg font-semibold">About</h2>
            <p className="leading-relaxed text-muted-foreground">{rail.description}</p>
          </div>

          {/* Gallery */}
          {gallery.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold">Gallery</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {gallery.map((src, i) => (
                  <div
                    key={i}
                    className="relative aspect-[4/3] overflow-hidden rounded-lg border bg-muted"
                  >
                    <Image
                      src={src}
                      alt={`${rail.label} — photo ${i + 2}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Video */}
          {rail.video && (
            <div>
              <h2 className="mb-3 text-lg font-semibold">Video</h2>
              <div className="relative aspect-video overflow-hidden rounded-lg border bg-muted">
                <iframe
                  src={rail.video}
                  title={`${rail.label} video`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                />
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Location */}
          <div className="rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-semibold">Location</h3>
            <dl className="space-y-2 text-sm">
              {[
                ["City", rail.city],
                ["Country", rail.country],
                ["Continent", rail.continent],
                ["Type", rail.type],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
              <div className="border-t pt-2">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Coordinates</dt>
                  <dd className="font-mono text-xs text-muted-foreground">
                    {rail.position[0].toFixed(4)}, {rail.position[1].toFixed(4)}
                  </dd>
                </div>
              </div>
            </dl>
          </div>

          {/* Proposal */}
          <div className="rounded-lg border p-4">
            <h3 className="mb-2 text-sm font-semibold">Funding</h3>
            <p className="text-sm text-muted-foreground">{rail.proposal.name}</p>
            {proposalUrl ? (
              <Button asChild size="sm" className="mt-3 w-full">
                <a href={proposalUrl} target="_blank" rel="noopener noreferrer">
                  View Proposal
                  <ExternalLink className="ml-1.5 size-3.5" />
                </a>
              </Button>
            ) : (
              <p className="mt-2 text-xs italic text-muted-foreground">
                Organic proliferation — no formal proposal.
              </p>
            )}
          </div>

          {/* CTA */}
          <div className="rounded-lg border border-dashed p-4">
            <p className="text-sm text-muted-foreground">
              Want a NogglesRail in your city?
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3 w-full">
              <Link href="/propose">Submit a Proposal</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
