import { Suspense } from "react";
import type { Metadata } from "next";
import {
  InstallationDetail,
  InstallationDetailSkeleton,
} from "@/components/installations/InstallationDetail";
import { getInstallationBySlug } from "@/services/installations";
import { Installation } from "@/types/installation";

export const revalidate = 300;

async function fetchInstallationData(slug: string): Promise<Installation | null> {
  try {
    return await getInstallationBySlug(slug);
  } catch (error) {
    console.error("Failed to fetch installation:", error);
    return null;
  }
}

interface InstallationPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: InstallationPageProps): Promise<Metadata> {
  const { slug } = await params;
  const installation = await fetchInstallationData(slug);

  if (!installation) {
    return {
      title: "Installation Not Found | Gnars",
      description: "The installation you're looking for doesn't exist.",
    };
  }

  const description =
    installation.description ||
    `${installation.obstacleDesign} in ${installation.location.city}, ${installation.location.country}`;
  const imageUrl = installation.coverImage || "https://gnars.com/logo-banner.jpg";
  const canonicalUrl = `https://gnars.com/installations/${slug}`;

  return {
    title: `${installation.title} - ${installation.location.city} | Gnars Installations`,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${installation.title} - ${installation.location.city}`,
      description,
      images: [imageUrl],
      type: "article",
      url: canonicalUrl,
      siteName: "Gnars",
    },
    twitter: {
      card: "summary_large_image",
      title: `${installation.title} - ${installation.location.city}`,
      description,
      images: [imageUrl],
    },
    keywords: [
      "gnars",
      "noggles",
      "skate",
      "installation",
      "art",
      "sculpture",
      installation.location.city,
      installation.location.country,
      "dao",
      "onchain",
    ],
  };
}

export default async function InstallationPage({ params }: InstallationPageProps) {
  const { slug } = await params;
  const installation = await fetchInstallationData(slug);

  if (!installation) {
    return (
      <div className="py-8 text-center">
        <h2 className="text-2xl font-bold text-muted-foreground">Installation Not Found</h2>
        <p className="text-muted-foreground mt-2">
          The installation you&apos;re looking for doesn&apos;t exist.
        </p>
      </div>
    );
  }

  return (
    <div className="py-8">
      <Suspense fallback={<InstallationDetailSkeleton />}>
        <InstallationDetail installation={installation} />
      </Suspense>
    </div>
  );
}
