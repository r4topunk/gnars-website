import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { getAllInstallations } from "@/services/installations";

export const metadata: Metadata = {
  title: "Installations | Gnars",
  description: "Explore Gnars DAO's global network of skateable art installations - from Rio to Rome, onchain DIY culture made physical.",
  alternates: {
    canonical: "https://gnars.com/installations",
  },
  openGraph: {
    title: "Gnars Installations",
    description: "Explore Gnars DAO's global network of skateable art installations",
    url: "https://gnars.com/installations",
    siteName: "Gnars",
    type: "website",
  },
};

export const revalidate = 3600;

export default async function InstallationsPage() {
  const installations = await getAllInstallations();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Gnars Installations</h1>
          <p className="text-xl text-muted-foreground max-w-3xl">
            A global network of skateable art installations built through onchain coordination.
            From DIY handrails to delta ramps, each installation reflects local culture while staying
            connected through shared Nounish aesthetics and Gnars values.
          </p>
        </div>

        {/* Installation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {installations.map((installation) => (
            <Link
              key={installation.id}
              href={`/installations/${installation.slug}`}
              className="group block border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Image */}
              {installation.coverImage && (
                <div className="relative w-full h-48 bg-muted">
                  <Image
                    src={installation.coverImage}
                    alt={installation.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
              )}

              {/* Content */}
              <div className="p-4">
                <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">
                  {installation.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {installation.obstacleDesign}
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {installation.location.city}, {installation.location.country}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-12 pt-8 border-t">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold">{installations.length}</div>
              <div className="text-sm text-muted-foreground">Installations</div>
            </div>
            <div>
              <div className="text-3xl font-bold">
                {new Set(installations.map((i) => i.location.country)).size}
              </div>
              <div className="text-sm text-muted-foreground">Countries</div>
            </div>
            <div>
              <div className="text-3xl font-bold">100%</div>
              <div className="text-sm text-muted-foreground">Onchain Coordinated</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
