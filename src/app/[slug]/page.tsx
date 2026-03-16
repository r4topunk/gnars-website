import { Metadata } from "next";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { getPostMetadata, getPostBySlug } from "@/lib/posts";

export async function generateStaticParams() {
  const posts = getPostMetadata("blog");
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug("blog", slug);

  if (!post) {
    return {
      title: "Post Not Found | Gnars",
    };
  }

  return {
    title: `${post.metadata.title} | Gnars`,
    description: post.metadata.description,
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: `${post.metadata.title} | Gnars`,
      description: post.metadata.description,
      type: "article",
      images: [
        {
          url: "/logo-banner.jpg",
          width: 2880,
          height: 1880,
          alt: post.metadata.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.metadata.title} | Gnars`,
      description: post.metadata.description,
      images: ["/logo-banner.jpg"],
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug("blog", slug);

  if (!post) {
    notFound();
  }

  const { metadata, content } = post;

  // Determine if this is historical content (pre-2023)
  const postYear = new Date(metadata.date).getFullYear();
  const isHistorical = postYear < 2023;

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      {/* Historical Content Notice */}
      {isHistorical && (
        <div className="mb-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>📚 Historical Content:</strong> This article is from {postYear}. Some information may be
            outdated.
          </p>
        </div>
      )}

      {/* Post Header */}
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-4">{metadata.title}</h1>
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <time>
            {new Date(metadata.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
          <span>·</span>
          <span>by {metadata.author}</span>
        </div>
        {metadata.tags && metadata.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {metadata.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Markdown Content */}
      <article className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-img:rounded-lg">
        <ReactMarkdown
          components={{
            // Custom heading renderer to add IDs for anchor links
            h2: ({ children }) => {
              const id = String(children)
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-");
              return <h2 id={id}>{children}</h2>;
            },
            h3: ({ children }) => {
              const id = String(children)
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-");
              return <h3 id={id}>{children}</h3>;
            },
            // Open external links in new tab
            a: ({ href, children }) => {
              const isExternal = href?.startsWith("http");
              return (
                <a
                  href={href}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noopener noreferrer" : undefined}
                >
                  {children}
                </a>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </article>

      {/* Footer */}
      <footer className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-sm text-gray-600 dark:text-gray-400 hover:underline">
            ← Back to Home
          </Link>
        </div>
      </footer>
    </div>
  );
}
