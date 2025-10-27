import { Suspense } from "react";
import { BlogsPageSkeleton } from "@/components/blogs/BlogsPageSkeleton";
import { BlogsView } from "@/components/blogs/BlogsView";
import { getAllBlogs } from "@/services/blogs";

export const dynamic = "force-dynamic";

async function getBlogs() {
  try {
    const result = await getAllBlogs(); // Get first page of blogs
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
