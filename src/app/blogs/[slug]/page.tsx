import { Suspense } from "react";
import { redirect } from "next/navigation";
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

export default async function BlogPage({ params }: BlogPageProps) {
  const { slug } = await params;
  const normalizedSlug = normalizeRouteSlug(slug);

  if (slug !== normalizedSlug) {
    redirect(`/blogs/${normalizedSlug}`);
  }

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
