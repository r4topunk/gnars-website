import Link from "next/link";
import { Metadata } from "next";
import { getPostMetadata } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Posts | Gnars",
  description: "Gnars-specific content: athlete stories, DAO governance, CC0 culture, and extreme sports funding.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function PostsPage() {
  const posts = getPostMetadata("posts");

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <header className="mb-12">
        <h1 className="text-4xl font-bold mb-4">Gnars Posts</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Stories about Gnars DAO, extreme athletes, CC0 culture, and how we&apos;re building a new funding
          model for action sports.
        </p>
      </header>

      <div className="space-y-8">
        {posts.map((post) => (
          <article key={post.slug} className="border-b border-gray-200 dark:border-gray-800 pb-8">
            <Link
              href={`/posts/${post.slug}`}
              className="group block hover:opacity-80 transition-opacity"
            >
              <time className="text-sm text-gray-500 dark:text-gray-500">
                {new Date(post.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              <h2 className="text-2xl font-bold mt-2 mb-3 group-hover:underline">{post.title}</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-3">{post.description}</p>
              <div className="flex flex-wrap gap-2">
                {post.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          </article>
        ))}
      </div>

      <footer className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Looking for historical NFT/DAO content?{" "}
          <Link href="/archive" className="underline hover:text-gray-700 dark:hover:text-gray-300">
            Visit the archive →
          </Link>
        </p>
      </footer>
    </div>
  );
}
