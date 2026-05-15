import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { DroposalEmbed } from "@/components/nogglesrails/DroposalEmbed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getRailBySlug, NOGGLES_RAILS } from "@/content/nogglesrails";
import { Link } from "@/i18n/navigation";

interface PageProps {
  params: Promise<{ slug: string; locale: string }>;
}

export function generateStaticParams() {
  return NOGGLES_RAILS.map((rail) => ({ slug: rail.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, locale } = await params;

  const rail = getRailBySlug(slug);
  if (!rail) return { title: "Rail Not Found" };

  const path = `/nogglesrails/${slug}`;
  const canonical = locale === "en" ? path : `/pt-br${path}`;
  return {
    title: `${rail.label} — NogglesRails`,
    description: rail.description,
    alternates: {
      canonical,
      languages: {
        en: path,
        "pt-br": `/pt-br${path}`,
        "x-default": path,
      },
    },
    openGraph: {
      title: `${rail.label} — NogglesRails`,
      description: rail.description,
      locale: locale === "pt-br" ? "pt_BR" : "en_US",
      type: "website",
    },
  };
}

function resolveLink(link: string): string {
  if (!link) return "";
  return link.startsWith("http") ? link : `https://${link}`;
}

function isYouTubeUrl(url: string): boolean {
  return url.includes("youtube.com/watch") || url.includes("youtu.be/");
}

function getYouTubeEmbedUrl(url: string): string {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : url;
}

function isDroposalEmbed(url: string): boolean {
  return url.startsWith("droposal:");
}

function getDroposalId(url: string): string {
  return url.replace("droposal:", "");
}

function MediaItem({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  if (isDroposalEmbed(src)) {
    const droposalId = Number(getDroposalId(src));
    return <DroposalEmbed droposalId={droposalId} />;
  }
  if (isYouTubeUrl(src)) {
    return (
      <iframe
        src={getYouTubeEmbedUrl(src)}
        title={alt}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className={`h-full w-full ${className}`}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={`h-full w-full object-cover ${className}`} />
  );
}

export default async function NogglesRailDetailPage({ params }: PageProps) {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "installations" });
  const rail = getRailBySlug(slug);
  if (!rail) notFound();

  const proposalUrl = resolveLink(rail.proposal.link);

  // Build media list: droposal embeds first, then videos, then images
  const droposalUrls = (rail.droposals ?? []).map((id) => `droposal:${id}`);
  const videos = rail.images.filter((src) => isYouTubeUrl(src));
  const images = rail.images.filter((src) => !isYouTubeUrl(src));
  const allMedia = [...droposalUrls, ...videos, ...images];
  const [hero, ...gallery] = allMedia;

  return (
    <div className="py-6">
      {/* Back */}
      <Link
        href="/nogglesrails"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        {t("nogglesrails.detail.allRails")}
      </Link>

      {/* Header */}
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{rail.label}</h1>
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
          {/* Hero media (droposal embed, video or image) */}
          {hero &&
            (isDroposalEmbed(hero) ? (
              <MediaItem src={hero} alt={rail.label} />
            ) : (
              <div className="relative aspect-video overflow-hidden rounded-lg border bg-muted">
                <MediaItem src={hero} alt={rail.label} />
              </div>
            ))}

          {/* Description */}
          <div>
            <h2 className="mb-2 text-lg font-semibold">{t("nogglesrails.detail.about")}</h2>
            <p className="leading-relaxed text-muted-foreground">{rail.description}</p>
          </div>

          {/* Gallery */}
          {gallery.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold">{t("nogglesrails.detail.gallery")}</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {gallery.map((src, i) => (
                  <div
                    key={i}
                    className={`relative overflow-hidden rounded-lg border bg-muted ${isDroposalEmbed(src) ? "aspect-[3/4] sm:col-span-2" : isYouTubeUrl(src) ? "aspect-video" : "aspect-[4/3]"}`}
                  >
                    <MediaItem src={src} alt={`${rail.label} — media ${i + 2}`} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Video */}
          {rail.video && (
            <div>
              <h2 className="mb-3 text-lg font-semibold">{t("nogglesrails.detail.video")}</h2>
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
            <h3 className="mb-3 text-sm font-semibold">{t("nogglesrails.detail.location")}</h3>
            <dl className="space-y-2 text-sm">
              {[
                [t("nogglesrails.detail.city"), rail.city],
                [t("nogglesrails.detail.country"), rail.country],
                [t("nogglesrails.detail.continent"), rail.continent],
                [t("nogglesrails.detail.type"), rail.type],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
              <div className="border-t pt-2">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t("nogglesrails.detail.coordinates")}</dt>
                  <dd className="font-mono text-xs text-muted-foreground">
                    {rail.position[0].toFixed(4)}, {rail.position[1].toFixed(4)}
                  </dd>
                </div>
              </div>
            </dl>
          </div>

          {/* Proposal */}
          <div className="rounded-lg border p-4">
            <h3 className="mb-2 text-sm font-semibold">{t("nogglesrails.detail.funding")}</h3>
            <p className="text-sm text-muted-foreground">{rail.proposal.name}</p>
            {proposalUrl ? (
              <Button asChild size="sm" className="mt-3 w-full">
                <a href={proposalUrl} target="_blank" rel="noopener noreferrer">
                  {t("nogglesrails.detail.viewProposal")}
                  <ExternalLink className="ml-1.5 size-3.5" />
                </a>
              </Button>
            ) : (
              <p className="mt-2 text-xs italic text-muted-foreground">
                {t("nogglesrails.detail.organicProliferation")}
              </p>
            )}
          </div>

          {/* CTA */}
          <div className="rounded-lg border border-dashed p-4">
            <p className="text-sm text-muted-foreground">{t("nogglesrails.detail.wantRailCta")}</p>
            <Button asChild variant="outline" size="sm" className="mt-3 w-full">
              <Link href="/propose">{t("nogglesrails.detail.submitProposal")}</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
