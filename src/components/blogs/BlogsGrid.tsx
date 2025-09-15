"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatedListItem } from "@/components/common/AnimatedListItem";
import { BlogCard } from "@/components/blogs/BlogCard";
import { Blog } from "@/lib/schemas/blogs";
import { LoadingGridSkeleton } from "@/components/skeletons/loading-grid-skeleton";

export function BlogsGridSkeleton() {
  return (
    <LoadingGridSkeleton
      items={6}
      withCard
      aspectClassName="aspect-video"
      containerClassName="grid gap-6 md:grid-cols-2"
    />
  );
}

export function BlogsGrid({ blogs }: { blogs: Blog[] }) {
  const PAGE_SIZE = 6;
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, blogs.length));
        }
      },
      { rootMargin: "200px" },
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [blogs.length]);

  // Reset/clamp visible count when data or filters change
  useEffect(() => {
    setVisibleCount((prev) => Math.min(Math.max(PAGE_SIZE, prev), blogs.length || PAGE_SIZE));
  }, [blogs.length]);

  if (blogs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No blog posts available
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        {blogs.slice(0, visibleCount).map((blog, i) => (
          <AnimatedListItem key={blog.id} delayMs={i * 100}>
            <BlogCard blog={blog} />
          </AnimatedListItem>
        ))}
      </div>
      {blogs.length > visibleCount && (
        <div className="mt-6">
          <LoadingGridSkeleton
            items={2}
            withCard
            aspectClassName="h-32"
            containerClassName="grid gap-6 md:grid-cols-2"
          />
        </div>
      )}
      <div ref={sentinelRef} className="h-10" />
    </>
  );
}