import fs from "fs";
import path from "path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import matter from "gray-matter";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Generate redirects from markdown files (trailing slash cleanup only)
function generateBlogRedirects() {
  const redirects: Array<{
    source: string;
    destination: string;
    permanent: boolean;
  }> = [];

  const blogDir = path.join(process.cwd(), "src/content/blog");

  if (!fs.existsSync(blogDir)) {
    return redirects;
  }

  const files = fs.readdirSync(blogDir);

  for (const filename of files) {
    if (!filename.endsWith(".md")) continue;

    const filePath = path.join(blogDir, filename);
    const fileContent = fs.readFileSync(filePath, "utf8");
    const { data } = matter(fileContent);

    if (!data.permalink) continue;

    const slug = data.permalink.replace(/^\//, "").replace(/\/$/, "");
    const target = `/${slug}`;

    // Only redirect if original URL has trailing slash
    if (data.permalink.endsWith("/")) {
      redirects.push({
        source: data.permalink,
        destination: target,
        permanent: true,
      });
    }
  }

  return redirects;
}

const nextConfig: NextConfig = {
  env: {
    BASE_URL: "https://nouns.build",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  poweredByHeader: false,
  reactCompiler: true,
  experimental: {
    // Increase body size limit for video thumbnail uploads (default is ~4-5MB)
    serverActions: {
      bodySizeLimit: "10mb",
    },
    // Persist Turbopack compile artifacts across dev restarts (Next.js 16 beta).
    turbopackFileSystemCacheForDev: true,
  },
  async redirects() {
    const blogRedirects = generateBlogRedirects();

    return [
      // Legacy proposal routes (before multi-chain support)
      // Redirect /proposals/119 -> /proposals/base/119
      // Permanent (301) redirect for proper SEO handling
      {
        source: "/proposals/:id(\\d+)",
        destination: "/proposals/base/:id",
        permanent: true,
      },
      // DAO URL pattern changes
      {
        source: "/dao/proposal/:id",
        destination: "/proposals/:id",
        permanent: true,
      },
      {
        source: "/dao/proposals",
        destination: "/proposals",
        permanent: true,
      },
      {
        source: "/dao/auction/:id",
        destination: "/auctions",
        permanent: true,
      },
      // Blog post trailing slash cleanup (generated from markdown files)
      ...blogRedirects,
    ];
  },
};

export default withNextIntl(nextConfig);
