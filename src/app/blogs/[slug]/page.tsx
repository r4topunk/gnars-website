import { Suspense } from "react";
import { BlogDetail, BlogDetailSkeleton } from "@/components/blogs/detail/BlogDetail";
import { Blog } from "@/lib/schemas/blogs";
import { getBlogBySlug } from "@/services/blogs";

export const dynamic = "force-dynamic";

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
  const blog = await fetchBlogData(slug);

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
