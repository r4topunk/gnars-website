import { unstable_cache } from "next/cache";
import type { Blog, Publication, Post, PostsResponse } from "@/lib/schemas/blogs";
import { blogSchema, publicationSchema, postsResponseSchema, postSchema } from "@/lib/schemas/blogs";
import { blogPosts } from "@/lib/blog-posts";

const PARAGRAPH_API_BASE = "https://public.api.paragraph.com/api/v1";
const GNARS_PUBLICATION_SLUG = "gnars";

// Utility function to make API calls
async function paragraphFetch<T = unknown>(endpoint: string): Promise<T> {
  const url = `${PARAGRAPH_API_BASE}${endpoint}`;

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "gnars-website/1.0",
        // Add any required headers here if needed
      },
    });

    if (!response.ok) {
      // Try to get error details from response
      let errorText;
      try {
        errorText = await response.text();
      } catch {
        errorText = "Unable to read error response";
      }
      throw new Error(`Paragraph API error: ${response.status} ${response.statusText}. Body: ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
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
  const endpoint = `/publications/slug/${encodeURIComponent(publicationSlug)}/posts/slug/${encodeURIComponent(postSlug)}?includeContent=true`;
  const data = await paragraphFetch<Record<string, unknown>>(endpoint);

  // Parse through schema which will handle the content -> markdown transformation
  const parsedPost = postSchema.parse(data);
  return parsedPost;
}

function mapPostToBlog(post: Post, publication: Publication): Blog {
  // Find the matching blog post from our hardcoded list to get the image URL
  const blogPost = blogPosts.find(bp => bp.slug === post.slug);

  const blog: Blog = {
    id: post.id,
    slug: post.slug,
    title: post.title,
    markdown: post.markdown || "",
    staticHtml: post.staticHtml,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    coinId: post.coinId,
    publication,
    // Add the image URL from our hardcoded list
    imageUrl: blogPost?.imageUrl,
  };

  return blogSchema.parse(blog);
}

// Cached function to get publication data
const getCachedPublication = unstable_cache(
  async () => {
    try {
      const publication = await getPublicationBySlug(GNARS_PUBLICATION_SLUG);
      return publication;
    } catch (error) {
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
  cursor?: string,
): Promise<{ blogs: Blog[]; hasMore: boolean; nextCursor?: string }> {
  try {
    const publication = await getCachedPublication();
    const postData = await getPosts(publication.id, cursor);

    const blogs = postData.items.map((post) => mapPostToBlog(post, publication));

    return {
      blogs,
      hasMore: postData.pagination.hasMore,
      nextCursor: postData.pagination.cursor,
    };
  } catch {
    return {
      blogs: [],
      hasMore: false,
    };
  }
}

export async function getBlogBySlug(slug: string): Promise<Blog | null> {
  try {
    const publication = await getCachedPublication();

    // Try to get the post directly using publication slug and post slug
    const post = await getPostBySlug(GNARS_PUBLICATION_SLUG, slug);

    if (!post) {
      return null;
    }

    return mapPostToBlog(post, publication);
  } catch {
    // If the direct method fails, fallback to searching through all posts
    try {
      const allBlogs = await getAllBlogs();
      const found = allBlogs.find((blog) => blog.slug === slug) || null;
      return found;
    } catch {
      return null;
    }
  }
}

export async function getAllBlogs(): Promise<Blog[]> {
  const allBlogs: Blog[] = [];
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const result = await listBlogs(cursor);
    allBlogs.push(...result.blogs);
    hasMore = result.hasMore;
    cursor = result.nextCursor;
  }

  return allBlogs;
}
