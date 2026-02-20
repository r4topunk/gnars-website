"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { BlogSummary } from "@/lib/schemas/blogs";
import { formatSafeDistanceToNow } from "@/lib/utils/date";

const CROSS_CHAR_REGEX = /[×✕✖✗✘]/g;

export function BlogCard({ blog }: { blog: BlogSummary }) {
  const currentBannerSrc = blog.imageUrl || "/logo-banner.jpg";
  const [bannerSrc, setBannerSrc] = useState<string>(currentBannerSrc);
  const [isImageLoaded, setIsImageLoaded] = useState<boolean>(false);

  useEffect(() => {
    setBannerSrc(currentBannerSrc);
  }, [currentBannerSrc]);

  const publishedDate = formatSafeDistanceToNow(blog.publishedAt);
  const routeSlug = blog.slug.replace(CROSS_CHAR_REGEX, "x");

  return (
    <Card className="overflow-hidden cursor-pointer transition-transform transition-shadow hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/blogs/${routeSlug}`} className="block">
        <div className="mx-4 border rounded-md overflow-hidden">
          <AspectRatio ratio={16 / 9}>
            {!isImageLoaded && <Skeleton className="absolute inset-0" />}
            <Image
              src={bannerSrc}
              alt={blog.title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className={`object-cover transition-opacity duration-300 ${isImageLoaded ? "opacity-100" : "opacity-0"}`}
              unoptimized
              onLoad={() => setIsImageLoaded(true)}
              onError={() => {
                if (bannerSrc !== "/logo-banner.jpg") setBannerSrc("/logo-banner.jpg");
              }}
            />
          </AspectRatio>
        </div>

        <CardContent className="px-4 py-4">
          <div className="space-y-3">
            <div className="space-y-2">
              <h3 className="font-semibold text-lg leading-tight line-clamp-2">{blog.title}</h3>

              <p className="text-sm text-muted-foreground line-clamp-2">
                {blog.subtitle || blog.previewText}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>by {blog.publication.name}</span>
              <span>{publishedDate}</span>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
