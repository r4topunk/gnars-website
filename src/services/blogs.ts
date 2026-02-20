import { unstable_cache } from "next/cache";
import { z } from "zod";
import type { Blog, BlogSummary, Post, PostsResponse, Publication } from "@/lib/schemas/blogs";
import {
  blogSchema,
  blogSummarySchema,
  postSchema,
  postsResponseSchema,
  publicationSchema,
} from "@/lib/schemas/blogs";

const PARAGRAPH_API_BASE = "https://public.api.paragraph.com/api/v1";
const GNARS_PUBLICATION_SLUG = "gnars";
const MAX_PREVIEW_LENGTH = 320;
const CROSS_CHAR_REGEX = /[×✕✖✗✘]/g;
const VARIATION_SELECTOR_REGEX = /[\uFE00-\uFE0F]/g;

function normalizeSlugInput(slug: string): string {
  return slug.normalize("NFKD").replace(VARIATION_SELECTOR_REGEX, "");
}

const postSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  subtitle: z.string().optional(),
  imageUrl: z.string().optional(),
  markdown: z.string().optional(),
  content: z.string().optional(),
  staticHtml: z.string().optional(),
  publishedAt: z.string(),
  updatedAt: z.string(),
  coinId: z.string().optional(),
});

const postsSummaryResponseSchema = z.object({
  items: z.array(postSummarySchema),
  pagination: z.object({
    cursor: z.string().optional(),
    hasMore: z.boolean(),
  }),
});

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
      throw new Error(
        `Paragraph API error: ${response.status} ${response.statusText}. Body: ${errorText}`,
      );
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
async function getPosts(
  publicationId: string,
  cursor?: string,
  options?: { includeContent?: boolean },
): Promise<PostsResponse> {
  const includeContent = options?.includeContent ?? true;
  const params = new URLSearchParams();
  if (cursor) {
    params.append("cursor", cursor);
  }

  params.append("includeContent", includeContent ? "true" : "false");

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
  const blog: Blog = {
    id: post.id,
    slug: post.slug,
    title: post.title,
    subtitle: post.subtitle,
    markdown: post.markdown || "",
    staticHtml: post.staticHtml,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    coinId: post.coinId,
    publication,
    imageUrl: post.imageUrl,
  };

  return blogSchema.parse(blog);
}

function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!?\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/[#>*_~\-]+/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toPreviewText(raw?: string): string {
  if (!raw) return "";
  const cleaned = stripMarkdown(raw);
  if (!cleaned) return "";
  if (cleaned.length <= MAX_PREVIEW_LENGTH) return cleaned;
  return `${cleaned.slice(0, MAX_PREVIEW_LENGTH).trim()}...`;
}

function canonicalizeSlug(slug: string): string {
  return normalizeSlugInput(slug)
    .replace(CROSS_CHAR_REGEX, "x")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getDirectSlugCandidates(slug: string): string[] {
  const normalized = normalizeSlugInput(slug);
  const candidates = [
    slug,
    normalized,
    normalized.replace(/[✕✖✗✘]/g, "×"),
    normalized.replace(CROSS_CHAR_REGEX, "x"),
  ];

  return [...new Set(candidates)];
}

function stripStandaloneX(slug: string): string {
  return canonicalizeSlug(slug)
    .split("-")
    .filter((segment) => segment && segment !== "x")
    .join("-");
}

function slugsEquivalent(a: string, b: string): boolean {
  const canonicalA = canonicalizeSlug(a);
  const canonicalB = canonicalizeSlug(b);
  if (canonicalA === canonicalB) {
    return true;
  }
  return stripStandaloneX(a) === stripStandaloneX(b);
}

function mapSummaryToBlogSummary(
  post: z.infer<typeof postSummarySchema>,
  publication: Publication,
): BlogSummary {
  const previewText = toPreviewText(post.subtitle || post.markdown || post.content || post.staticHtml);
  return blogSummarySchema.parse({
    id: post.id,
    slug: post.slug,
    title: post.title,
    subtitle: post.subtitle,
    previewText,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    coinId: post.coinId,
    publication,
    imageUrl: post.imageUrl,
  });
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

    // Try direct lookups with equivalent slug variants first.
    for (const candidateSlug of getDirectSlugCandidates(slug)) {
      try {
        const post = await getPostBySlug(GNARS_PUBLICATION_SLUG, candidateSlug);
        return mapPostToBlog(post, publication);
      } catch {
        // Try next candidate.
      }
    }
  } catch {
    // Fallback to full scan below.
  }

  // If direct lookup fails, fallback to searching through all posts.
  try {
    const allBlogs = await getAllBlogs();
    const found =
      allBlogs.find((blog) => blog.slug === slug) ||
      allBlogs.find((blog) => slugsEquivalent(blog.slug, slug)) ||
      null;
    return found;
  } catch {
    return null;
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

async function listBlogSummariesPage(
  cursor?: string,
): Promise<{ blogs: BlogSummary[]; hasMore: boolean; nextCursor?: string }> {
  try {
    const publication = await getCachedPublication();
    const params = new URLSearchParams();
    if (cursor) params.append("cursor", cursor);
    params.append("includeContent", "false");
    const endpoint = `/publications/${encodeURIComponent(publication.id)}/posts${params.toString() ? `?${params.toString()}` : ""}`;
    const data = await paragraphFetch(endpoint);
    const parsed = postsSummaryResponseSchema.parse(data);

    const blogs = parsed.items.map((post) => mapSummaryToBlogSummary(post, publication));

    return {
      blogs,
      hasMore: parsed.pagination.hasMore,
      nextCursor: parsed.pagination.cursor,
    };
  } catch {
    return {
      blogs: [],
      hasMore: false,
    };
  }
}

export async function getAllBlogSummaries(): Promise<BlogSummary[]> {
  const allBlogs: BlogSummary[] = [];
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const result = await listBlogSummariesPage(cursor);
    allBlogs.push(...result.blogs);
    hasMore = result.hasMore;
    cursor = result.nextCursor;
  }

  return allBlogs;
}
