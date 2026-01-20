"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Markdown } from "@/components/common/Markdown";
import { extractFirstUrl, normalizeImageUrl } from "@/components/proposals/utils";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Blog } from "@/lib/schemas/blogs";
import { formatSafeDistanceToNow } from "@/lib/utils/date";

interface BlogDetailProps {
  blog: Blog;
}

export function BlogDetailSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
      </div>

      {/* Banner Image */}
      <div className="w-full rounded-lg overflow-hidden">
        <AspectRatio ratio={16 / 9}>
          <div className="h-full bg-muted animate-pulse" />
        </AspectRatio>
      </div>

      {/* Content */}
      <div className="space-y-4">
        <div className="h-4 bg-muted rounded animate-pulse" />
        <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
        <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
        <div className="h-4 bg-muted rounded animate-pulse w-4/5" />
      </div>
    </div>
  );
}

export function BlogDetail({ blog }: BlogDetailProps) {
  // Use imageUrl from blog object if available, otherwise fallback to extracting from markdown
  const bannerUrl = blog.imageUrl || normalizeImageUrl(extractFirstUrl(blog.markdown));
  const currentBannerSrc = bannerUrl ?? "/logo-banner.jpg";
  const [bannerSrc, setBannerSrc] = useState<string>(currentBannerSrc);
  const [isImageLoaded, setIsImageLoaded] = useState<boolean>(false);

  // Keep local banner src in sync when blog changes
  useEffect(() => {
    setBannerSrc(currentBannerSrc);
  }, [currentBannerSrc]);

  const publishedDate = formatSafeDistanceToNow(blog.publishedAt);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">{blog.title}</h1>
        {blog.subtitle && (
          <p className="text-xl text-muted-foreground">{blog.subtitle}</p>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>By {blog.publication.name}</span>
          <span>•</span>
          <span>Published {publishedDate}</span>
          {blog.coinId && (
            <>
              <span>•</span>
              <Badge variant="secondary">Coined</Badge>
            </>
          )}
        </div>
      </div>

      {/* Banner Image */}
      {bannerUrl && (
        <div className="w-full rounded-lg overflow-hidden border">
          <AspectRatio ratio={16 / 9}>
            {!isImageLoaded && <Skeleton className="absolute inset-0" />}
            <Image
              src={bannerSrc}
              alt={blog.title}
              fill
              sizes="(max-width: 768px) 100vw, 896px"
              className={`object-cover transition-opacity duration-300 ${isImageLoaded ? "opacity-100" : "opacity-0"}`}
              onLoadingComplete={() => setIsImageLoaded(true)}
              onError={() => {
                if (bannerSrc !== "/logo-banner.jpg") setBannerSrc("/logo-banner.jpg");
              }}
            />
          </AspectRatio>
        </div>
      )}

      {/* Content */}
      <Card>
        <CardHeader>
          <div className="text-sm text-muted-foreground">
            Last updated {formatSafeDistanceToNow(blog.updatedAt, "Unknown")}
          </div>
        </CardHeader>
        <CardContent>
          <Markdown className="prose-lg">{blog.markdown || ""}</Markdown>
        </CardContent>
      </Card>
    </div>
  );
}
