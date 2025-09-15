"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Blog } from "@/lib/schemas/blogs";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { extractFirstUrl, normalizeImageUrl } from "@/components/proposals/utils";
import { formatSafeDistanceToNow } from "@/lib/utils/date";

export function BlogCard({ blog }: { blog: Blog }) {
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

  // Extract first 3 paragraphs for preview
  const getPreview = (markdown: string | undefined) => {
    if (!markdown) return '';

    // Find first 3 non-header paragraphs
    const paragraphs = markdown
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .slice(0, 3);

    if (paragraphs.length === 0) return '';

    // Join paragraphs with space
    let preview = paragraphs.join(' ');

    // Remove images: ![alt](url) or ![alt][ref]
    preview = preview.replace(/!\[.*?\]\(.*?\)/g, '');
    preview = preview.replace(/!\[.*?\]\[.*?\]/g, '');

    // Remove escaped bracket patterns: [\[...\]] or \[\[...\]\]
    preview = preview.replace(/\[?\\\[.*?\\\]\]?\(.*?\)/g, '');
    preview = preview.replace(/\\\[.*?\\\]/g, '');

    // Convert links to text only: [text](url) -> text
    preview = preview.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    preview = preview.replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1');

    // Remove bold formatting: **text** or __text__
    preview = preview.replace(/\*\*(.+?)\*\*/g, '$1');
    preview = preview.replace(/__(.+?)__/g, '$1');

    // Remove italic formatting: *text* or _text_
    preview = preview.replace(/\*([^*]+?)\*/g, '$1');
    preview = preview.replace(/_([^_]+?)_/g, '$1');
    preview = preview.replace("__ ", '');

    // Trim and return (no truncation since line-clamp will handle it)
    return preview.trim();
  };

  return (
    <Card className="overflow-hidden cursor-pointer transition-transform transition-shadow hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/blogs/${blog.slug}`} className="block">
        <div className="mx-4 border rounded-md overflow-hidden">
          <AspectRatio ratio={16 / 9}>
            {/* Image skeleton placeholder to avoid empty gap while loading */}
            {!isImageLoaded && <Skeleton className="absolute inset-0" />}
            <Image
              src={bannerSrc}
              alt={blog.title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className={`object-cover transition-opacity duration-300 ${isImageLoaded ? "opacity-100" : "opacity-0"}`}
              priority={false}
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
              <h3 className="font-semibold text-lg leading-tight line-clamp-2">
                {blog.title}
              </h3>

              <p className="text-sm text-muted-foreground line-clamp-2">
                {getPreview(blog.markdown)}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                by {blog.publication.name}
              </span>
              <span>
                {publishedDate}
              </span>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}