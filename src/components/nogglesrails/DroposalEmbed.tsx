"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

interface DroposalData {
  id: number;
  title: string;
  mediaAnimation?: string;
  mediaImage?: string;
  priceEth: string;
  editionSize: string;
}

/**
 * Lightweight droposal embed for NogglesRails pages.
 * Shows video/image + mint button + link to full droposal page.
 */
export function DroposalEmbed({ droposalId }: { droposalId: number }) {
  const [data, setData] = useState<DroposalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/droposal-embed/${droposalId}`);
        if (res.ok) {
          setData(await res.json());
        }
      } catch (e) {
        console.error("Failed to fetch droposal:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [droposalId]);

  if (loading) {
    return (
      <div className="w-full aspect-video bg-muted rounded-xl animate-pulse flex items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading Droposal #{droposalId}...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full aspect-video bg-muted rounded-xl flex items-center justify-center">
        <Link
          href={`/droposals/${droposalId}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          View Droposal #{droposalId} →
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl overflow-hidden border bg-card">
      {/* Media */}
      <div className="relative aspect-video bg-muted">
        {data.mediaAnimation ? (
          <video
            src={data.mediaAnimation}
            poster={data.mediaImage}
            className="h-full w-full object-cover"
            controls
            preload="metadata"
            playsInline
            autoPlay
            muted
            loop
          />
        ) : data.mediaImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.mediaImage} alt={data.title} className="h-full w-full object-cover" />
        ) : null}
      </div>

      {/* Info + Actions */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-sm line-clamp-1">{data.title}</h3>
            <p className="text-xs text-muted-foreground">
              {Number(data.priceEth) === 0 ? "Free mint" : `${data.priceEth} ETH`}
              {data.editionSize !== "Open" ? ` · ${data.editionSize} editions` : " · Open edition"}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button asChild size="sm" className="flex-1 bg-primary hover:bg-primary/90">
            <Link href={`/droposals/${droposalId}`}>🎨 Collect / Mint</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link href={`/droposals/${droposalId}`} target="_blank">
              View Droposal <ExternalLink className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
