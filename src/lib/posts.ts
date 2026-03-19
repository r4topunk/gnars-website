import fs from "fs";
import path from "path";
import matter from "gray-matter";

export interface PostMetadata {
  slug: string;
  filename: string;
  title: string;
  description: string;
  date: string;
  author: string;
  image?: string;
  permalink?: string;
  tags?: string[];
}

function extractSlugFromPermalink(permalink: string): string {
  // "/sub-dao-culture/" → "sub-dao-culture"
  return permalink.replace(/^\//, "").replace(/\/$/, "");
}

function extractSlugFromFilename(filename: string): string {
  // "2022-04-08-sub-dao-culture.md" → "sub-dao-culture"
  return filename.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "");
}

export function getPostMetadata(directory: string): PostMetadata[] {
  const dirPath = path.join(process.cwd(), "src", "content", directory);
  
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const files = fs.readdirSync(dirPath);
  const posts: PostMetadata[] = [];

  for (const filename of files) {
    if (!filename.endsWith(".md")) continue;

    const filePath = path.join(dirPath, filename);
    const fileContent = fs.readFileSync(filePath, "utf8");
    const { data } = matter(fileContent);

    const slug = data.permalink
      ? extractSlugFromPermalink(data.permalink)
      : extractSlugFromFilename(filename);

    posts.push({
      slug,
      filename,
      title: data.title || "Untitled",
      description: data.description || "",
      date: data.date || "",
      author: data.author || "Unknown",
      image: data.image,
      permalink: data.permalink,
      tags: data.tags || [],
    });
  }

  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(directory: string, slug: string): {
  metadata: PostMetadata;
  content: string;
} | null {
  const posts = getPostMetadata(directory);
  const post = posts.find((p) => p.slug === slug);

  if (!post) return null;

  const filePath = path.join(process.cwd(), "src", "content", directory, post.filename);
  const fileContent = fs.readFileSync(filePath, "utf8");
  const { content } = matter(fileContent);

  return {
    metadata: post,
    content,
  };
}
