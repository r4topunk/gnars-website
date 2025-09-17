import { z } from "zod";

// Based on Paragraph API reference examples
export const publicationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});

export const postSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    slug: z.string(),
    markdown: z.string().optional().default(""),
    content: z.string().optional(), // Some API responses use 'content' instead of 'markdown'
    staticHtml: z.string().optional(),
    json: z.string().optional(),
    coinId: z.string().optional(),
    publishedAt: z.string(),
    updatedAt: z.string(),
  })
  .transform((data) => {
    // If markdown is empty but content exists, use content as markdown
    if (!data.markdown && data.content) {
      return { ...data, markdown: data.content };
    }
    return data;
  });

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  hasMore: z.boolean(),
  total: z.number().optional(),
});

export const postsResponseSchema = z.object({
  items: z.array(postSchema),
  pagination: paginationSchema,
});

export const blogSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  markdown: z.string().optional().default(""),
  staticHtml: z.string().optional(),
  publishedAt: z.string(),
  updatedAt: z.string(),
  coinId: z.string().optional(),
  publication: publicationSchema,
  imageUrl: z.string().optional(),
});

export type Publication = z.infer<typeof publicationSchema>;
export type Post = z.infer<typeof postSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
export type PostsResponse = z.infer<typeof postsResponseSchema>;
export type Blog = z.infer<typeof blogSchema>;
