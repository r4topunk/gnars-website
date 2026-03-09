import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Archive | Gnars",
  description: "Historical blog posts and articles about NFTs, DAOs, and the Gnars ecosystem.",
  robots: {
    index: true,
    follow: true,
  },
};

const archivePosts = [
  {
    title: "Sub-DAO Culture - Breaking Down The DAO",
    slug: "sub-dao-culture",
    date: "2022-04-08",
    description:
      "Deep dive into DAO governance, sub-DAOs as L2s, and how Gnars navigates the Nouniverse.",
    tags: ["research", "dao", "governance"],
  },
  {
    title: "Best CC0 NFT Projects To Look Out For",
    slug: "best-cc0-nft-projects",
    date: "2022-03-26",
    description:
      "Comprehensive overview of Nouns, Mfers, CrypToadz, and other pioneering CC0 projects.",
    tags: ["opinion", "cc0", "nfts"],
  },
  {
    title: "The Birth of a New Discipline - The History of NFT Art",
    slug: "history-of-nfts",
    date: "2021-06-30",
    description: "Chronological outline of events that led to the creation of the NFT market as it exists today.",
    tags: ["research", "history"],
  },
  {
    title: "On-chain NFTs and Why They're Better",
    slug: "on-chain-nfts-and-why-theyre-better",
    date: "2022-01-11",
    description: "Technical deep-dive into on-chain vs off-chain NFT storage and why it matters.",
    tags: ["education", "technical"],
  },
  {
    title: "How NFTs Could Give the Music Industry a Second Life",
    slug: "nfts-music-industry-second-life",
    date: "2021-08-18",
    description: "Exploring NFT utility in music, pricing, scarcity, and the future of the industry.",
    tags: ["research", "music"],
  },
];

export default function ArchivePage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <header className="mb-12">
        <h1 className="text-4xl font-bold mb-4">Archive</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Historical articles about NFTs, DAOs, and the evolution of Gnars. These posts preserve important
          context about the ecosystem&apos;s foundation and early explorations.
        </p>
      </header>

      <div className="space-y-8">
        {archivePosts
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .map((post) => (
            <article key={post.slug} className="border-b border-gray-200 dark:border-gray-800 pb-8">
              <Link
                href={`/archive/${post.slug}`}
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
                  {post.tags.map((tag) => (
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
          Looking for recent content?{" "}
          <Link href="/blogs" className="underline hover:text-gray-700 dark:hover:text-gray-300">
            Visit the main blog →
          </Link>
        </p>
      </footer>
    </div>
  );
}
