"use client";

import { Installation } from "@/types/installation";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, MapPin, Users, Calendar } from "lucide-react";

interface InstallationDetailProps {
  installation: Installation;
}

export function InstallationDetail({ installation }: InstallationDetailProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <MapPin className="w-4 h-4" />
          <span>
            {installation.location.city}, {installation.location.country}
          </span>
          {installation.year && (
            <>
              <span>•</span>
              <Calendar className="w-4 h-4" />
              <span>{installation.year}</span>
            </>
          )}
        </div>
        <h1 className="text-4xl font-bold mb-2">{installation.title}</h1>
        <p className="text-xl text-muted-foreground">{installation.obstacleDesign}</p>
      </div>

      {/* Cover Image */}
      {installation.coverImage && (
        <div className="relative w-full h-96 rounded-lg overflow-hidden mb-8">
          <Image
            src={installation.coverImage}
            alt={installation.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* Description */}
      {installation.description && (
        <div className="prose prose-lg max-w-none mb-8">
          <p>{installation.description}</p>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Collective */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Collective</h3>
          </div>
          <p className="text-sm text-muted-foreground">{installation.collective}</p>
        </div>

        {/* Activation */}
        {installation.activation && (
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Activation</h3>
            <p className="text-sm text-muted-foreground">{installation.activation}</p>
          </div>
        )}
      </div>

      {/* Proposal Link */}
      {installation.proposalUrl && (
        <div className="mb-8">
          <Link
            href={installation.proposalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            <span>View Proposal</span>
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Media Section */}
      {installation.media.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Media</h2>
          <div className="grid grid-cols-1 gap-4">
            {installation.media.map((media, index) => (
              <Link
                key={index}
                href={media.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-4 border rounded-lg hover:bg-accent transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>{media.label || `${media.type} link`}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Back to Map */}
      <div className="mt-12 pt-6 border-t">
        <Link href="/map" className="text-primary hover:underline">
          ← Back to Map
        </Link>
      </div>
    </div>
  );
}

export function InstallationDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
      <div className="h-6 w-48 bg-muted rounded mb-4" />
      <div className="h-10 w-3/4 bg-muted rounded mb-2" />
      <div className="h-6 w-1/2 bg-muted rounded mb-8" />
      <div className="h-96 w-full bg-muted rounded mb-8" />
      <div className="h-20 w-full bg-muted rounded" />
    </div>
  );
}
