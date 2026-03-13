import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Blog — Gnars DAO",
  description:
    "Read the latest stories, updates, and community posts from Gnars DAO. Skateboarding culture, DAO governance, and creative projects by the Gnars community.",
  alternates: {
    canonical: "/blogs",
  },
  openGraph: {
    title: "Blog — Gnars DAO",
    description: "Read the latest stories, updates, and community posts from Gnars DAO. Skateboarding culture, DAO governance, and creative projects by the Gnars community.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog — Gnars DAO",
    description: "Read the latest stories, updates, and community posts from Gnars DAO. Skateboarding culture, DAO governance, and creative projects by the Gnars community.",
  },
};
import { BlogsPageSkeleton } from "@/components/blogs/BlogsPageSkeleton";
import { BlogsView } from "@/components/blogs/BlogsView";
import { getAllBlogSummaries } from "@/services/blogs";

export const revalidate = 300;

async function getBlogs() {
  try {
    const result = await getAllBlogSummaries();
    return result;
  } catch (error) {
    console.error("Failed to fetch blogs:", error);
    return [];
  }
}

export default async function BlogsPage() {
  const blogs = await getBlogs();

  return (
    <div className="py-8">
      <Suspense fallback={<BlogsPageSkeleton />}>
        <BlogsView blogs={blogs} />
      </Suspense>
    </div>
  );
}
