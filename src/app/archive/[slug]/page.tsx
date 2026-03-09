import fs from "fs";
import path from "path";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import Link from "next/link";

const ARCHIVE_POSTS_MAP: Record<
  string,
  { file: string; title: string; date: string; author: string }
> = {
  "sub-dao-culture": {
    file: "2022-04-08-sub-dao-culture.md",
    title: "Sub-DAO Culture - Breaking Down The DAO",
    date: "2022-04-08",
    author: "gami",
  },
  "best-cc0-nft-projects": {
    file: "2022-03-26-best-cc0-nft-projects.md",
    title: "Best CC0 NFT Projects To Look Out For",
    date: "2022-03-26",
    author: "gami",
  },
  "history-of-nfts": {
    file: "2021-06-30-history-of-nfts.md",
    title: "The Birth of a New Discipline - The History of NFT Art",
    date: "2021-06-30",
    author: "gami",
  },
  "on-chain-nfts-and-why-theyre-better": {
    file: "2022-01-11-on-chain-nfts-and-why-theyre-better.md",
    title: "On-chain NFTs and Why They're Better",
    date: "2022-01-11",
    author: "gami",
  },
  "nfts-music-industry-second-life": {
    file: "2021-08-18-nfts-music-industry-second-life.md",
    title: "How NFTs Could Give the Music Industry a Second Life",
    date: "2021-08-18",
    author: "gami",
  },
};

export async function generateStaticParams() {
  return Object.keys(ARCHIVE_POSTS_MAP).map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const postMeta = ARCHIVE_POSTS_MAP[slug];

  if (!postMeta) {
    return {
      title: "Post Not Found | Gnars Archive",
    };
  }

  return {
    title: `${postMeta.title} | Gnars Archive`,
    description: `Archive: ${postMeta.title} by ${postMeta.author}`,
    robots: {
      index: true,
      follow: false, // Don't follow links in archived content
    },
  };
}

function stripFrontMatter(content: string): string {
  const frontMatterRegex = /^---\s*\n[\s\S]*?\n---\s*\n/;
  return content.replace(frontMatterRegex, "");
}

export default async function ArchivePostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const postMeta = ARCHIVE_POSTS_MAP[slug];

  if (!postMeta) {
    notFound();
  }

  const filePath = path.join(process.cwd(), "src", "content", "archive", postMeta.file);

  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch (error) {
    console.error(`Failed to read archive post: ${filePath}`, error);
    notFound();
  }

  // Strip YAML front matter
  const markdownContent = stripFrontMatter(content);

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      {/* Archive Notice */}
      <div className="mb-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          <strong>📚 Archive:</strong> This is a historical post from the early days of Gnars. Some information
          may be outdated.{" "}
          <Link href="/blogs" className="underline hover:opacity-80">
            Visit the main blog for current content →
          </Link>
        </p>
      </div>

      {/* Post Header */}
      <header className="mb-8">
        <Link
          href="/archive"
          className="text-sm text-gray-600 dark:text-gray-400 hover:underline mb-4 inline-block"
        >
          ← Back to Archive
        </Link>
        <h1 className="text-4xl font-bold mb-4">{postMeta.title}</h1>
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <time>
            {new Date(postMeta.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
          <span>·</span>
          <span>by {postMeta.author}</span>
        </div>
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
          {markdownContent}
        </ReactMarkdown>
      </article>

      {/* Footer */}
      <footer className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
        <div className="flex justify-between items-center">
          <Link
            href="/archive"
            className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
          >
            ← Back to Archive
          </Link>
          <Link href="/blogs" className="text-sm text-gray-600 dark:text-gray-400 hover:underline">
            Visit Main Blog →
          </Link>
        </div>
      </footer>
    </div>
  );
}
