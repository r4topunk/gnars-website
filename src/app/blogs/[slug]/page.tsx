import { Suspense } from "react";
import type { Metadata } from "next";
import { BlogDetail, BlogDetailSkeleton } from "@/components/blogs/detail/BlogDetail";
import { Blog } from "@/lib/schemas/blogs";
import { getBlogBySlug } from "@/services/blogs";

export const revalidate = 300;
const CROSS_CHAR_REGEX = /[×✕✖✗✘]/g;
const VARIATION_SELECTOR_REGEX = /[\uFE00-\uFE0F]/g;

function normalizeRouteSlug(slug: string): string {
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    decoded = slug;
  }

  return decoded
    .normalize("NFKD")
    .replace(VARIATION_SELECTOR_REGEX, "")
    .replace(CROSS_CHAR_REGEX, "x");
}

async function fetchBlogData(slug: string): Promise<Blog | null> {
  try {
    return await getBlogBySlug(slug);
  } catch (error) {
    console.error("Failed to fetch blog:", error);
    return null;
  }
}

interface BlogPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: BlogPageProps): Promise<Metadata> {
  const { slug } = await params;
  const normalizedSlug = normalizeRouteSlug(slug);
  const blog = await fetchBlogData(normalizedSlug);
  
  if (!blog) {
    return {
      title: "Blog Post Not Found | Gnars",
      description: "The blog post you're looking for doesn't exist or has been removed."
    };
  }

  const description = blog.subtitle || blog.markdown?.slice(0, 160) || "";
  const imageUrl = blog.imageUrl || "https://gnars.com/logo-banner.jpg";
  const canonicalUrl = `https://gnars.com/blogs/${normalizedSlug}`;

  return {
    title: `${blog.title} | Gnars Blog`,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: blog.title,
      description,
      images: [imageUrl],
      type: "article",
      publishedTime: blog.publishedAt,
      modifiedTime: blog.updatedAt,
      url: canonicalUrl,
      siteName: "Gnars",
    },
    twitter: {
      card: "summary_large_image",
      title: blog.title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function BlogPage({ params }: BlogPageProps) {
  const { slug } = await params;
  const normalizedSlug = normalizeRouteSlug(slug);

  const blog = await fetchBlogData(normalizedSlug);

  if (!blog) {
    return (
      <div className="py-8 text-center">
        <h2 className="text-2xl font-bold text-muted-foreground">Blog Post Not Found</h2>
        <p className="text-muted-foreground mt-2">
          The blog post you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
      </div>
    );
  }

  return (
    <div className="py-8">
      <Suspense fallback={<BlogDetailSkeleton />}>
        <BlogDetail blog={blog} />
      </Suspense>
    </div>
  );
}
