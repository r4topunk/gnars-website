import { unstable_cache } from "next/cache";
import type { Blog, Publication, Post, PostsResponse } from "@/lib/schemas/blogs";
import { blogSchema, publicationSchema, postsResponseSchema } from "@/lib/schemas/blogs";

const PARAGRAPH_API_BASE = "https://public.api.paragraph.com/api/v1";
const GNARS_PUBLICATION_SLUG = "gnars";

// Utility function to make API calls
async function paragraphFetch(endpoint: string): Promise<any> {
  const url = `${PARAGRAPH_API_BASE}${endpoint}`;
  console.log("Fetching:", url);

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "gnars-website/1.0",
        // Add any required headers here if needed
      },
    });

    console.log("Response status:", response.status, response.statusText);
    console.log("Response headers:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      // Try to get error details from response
      let errorText;
      try {
        errorText = await response.text();
        console.log("Error response body:", errorText);
      } catch (e) {
        errorText = "Unable to read error response";
      }
      throw new Error(`Paragraph API error: ${response.status} ${response.statusText}. Body: ${errorText}`);
    }

    const data = await response.json();
    console.log("Response data:", data);
    return data;
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
}

// Get publication by slug
async function getPublicationBySlug(slug: string): Promise<Publication> {
  const data = await paragraphFetch(`/publications/slug/${encodeURIComponent(slug)}`);
  return publicationSchema.parse(data);
}

// Get posts for a publication
async function getPosts(publicationId: string, cursor?: string): Promise<PostsResponse> {
  const params = new URLSearchParams();
  if (cursor) {
    params.append("cursor", cursor);
  }

  params.append("includeContent", "true");

  const endpoint = `/publications/${encodeURIComponent(publicationId)}/posts${params.toString() ? `?${params.toString()}` : ""}`;
  const data = await paragraphFetch(endpoint);
  return postsResponseSchema.parse(data);
}

// Get a single post by publication slug and post slug
async function getPostBySlug(publicationSlug: string, postSlug: string): Promise<Post> {
  const endpoint = `/publications/slug/${encodeURIComponent(publicationSlug)}/posts/slug/${encodeURIComponent(postSlug)}`;
  const data = await paragraphFetch(endpoint);
  // Assuming the API returns the post directly, not wrapped in an object
  return data;
}

function mapPostToBlog(post: Post, publication: Publication): Blog {
  const blog: Blog = {
    id: post.id,
    slug: post.slug,
    title: post.title,
    markdown: post.markdown,
    staticHtml: post.staticHtml,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    coinId: post.coinId,
    publication,
  };

  return blogSchema.parse(blog);
}

// Cached function to get publication data
const getCachedPublication = unstable_cache(
  async () => {
    try {
      console.log("Fetching publication with slug:", GNARS_PUBLICATION_SLUG);
      const publication = await getPublicationBySlug(GNARS_PUBLICATION_SLUG);
      console.log("Fetched publication:", publication);
      return publication;
    } catch (error) {
      console.error("Failed to fetch publication:", error);
      throw error;
    }
  },
  ["gnars-publication"],
  {
    revalidate: 3600, // 1 hour
    tags: ["publication", "gnars"],
  },
);

export async function listBlogs(
  limit = 20,
  cursor?: string,
): Promise<{ blogs: Blog[]; hasMore: boolean; nextCursor?: string }> {
  try {
    console.log("listBlogs called with limit:", limit, "cursor:", cursor);

    const publication = await getCachedPublication();
    const postData = await getPosts(publication.id, cursor);
    console.log("Got posts data:", {
      itemCount: postData.items?.length,
      hasMore: postData.pagination?.hasMore,
    });

    const blogs = postData.items.map((post) => mapPostToBlog(post, publication));

    return {
      blogs,
      hasMore: postData.pagination.hasMore,
      nextCursor: postData.pagination.cursor,
    };
  } catch (error) {
    console.error("Failed to list blogs:", error);
    return {
      blogs: [],
      hasMore: false,
    };
  }
}

export async function getBlogBySlug(slug: string): Promise<Blog | null> {
  try {
    console.log("getBlogBySlug called with slug:", slug);

    const publication = await getCachedPublication();
    console.log("Got publication for getBlogBySlug:", publication);

    // Try to get the post directly using publication slug and post slug
    const post = await getPostBySlug(GNARS_PUBLICATION_SLUG, slug);
    console.log("Got post:", post);

    if (!post) {
      console.log("No post found for slug:", slug);
      return null;
    }

    return mapPostToBlog(post, publication);
  } catch (error) {
    console.error("Failed to fetch blog by slug:", error);

    // If the direct method fails, fallback to searching through all posts
    try {
      console.log("Falling back to getAllBlogs search");
      const allBlogs = await getAllBlogs();
      const found = allBlogs.find((blog) => blog.slug === slug) || null;
      console.log("Fallback search result:", found?.title || "Not found");
      return found;
    } catch (fallbackError) {
      console.error("Fallback also failed:", fallbackError);
      return null;
    }
  }
}

export async function getAllBlogs(): Promise<Blog[]> {
  const allBlogs: Blog[] = [];
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const result = await listBlogs(50, cursor);
    allBlogs.push(...result.blogs);
    hasMore = result.hasMore;
    cursor = result.nextCursor;
  }

  return allBlogs;
}
