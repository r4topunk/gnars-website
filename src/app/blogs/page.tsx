import { Suspense } from "react";
import { BlogsPageSkeleton } from "@/components/blogs/BlogsPageSkeleton";
import { BlogsView } from "@/components/blogs/BlogsView";
import { SidebarInset } from "@/components/ui/sidebar";
import { listBlogs } from "@/services/blogs";

export const dynamic = "force-dynamic";

async function getBlogs() {
  try {
    const result = await listBlogs(50); // Get first 50 blogs
    return result.blogs;
  } catch (error) {
    console.error("Failed to fetch blogs:", error);
    return [];
  }
}

export default async function BlogsPage() {
  const blogs = await getBlogs();

  return (
    <SidebarInset>
      <div className="container mx-auto py-8 px-4">
        <Suspense fallback={<BlogsPageSkeleton />}>
          <BlogsView blogs={blogs} />
        </Suspense>
      </div>
    </SidebarInset>
  );
}