import type { NextConfig } from "next";
import fs from "fs";
import path from "path";
import matter from "gray-matter";

// Generate redirects from markdown files
function generateBlogRedirects() {
  const redirects: Array<{
    source: string;
    destination: string;
    permanent: boolean;
  }> = [];

  const directories = [
    { dir: path.join(process.cwd(), "src/content/posts"), base: "/posts" },
    { dir: path.join(process.cwd(), "src/content/archive"), base: "/archive" },
  ];

  for (const { dir, base } of directories) {
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir);

    for (const filename of files) {
      if (!filename.endsWith(".md")) continue;

      const filePath = path.join(dir, filename);
      const fileContent = fs.readFileSync(filePath, "utf8");
      const { data } = matter(fileContent);

      if (!data.permalink) continue;

      const slug = data.permalink.replace(/^\//, "").replace(/\/$/, "");
      const target = `${base}/${slug}`;

      // With trailing slash → redirect
      if (data.permalink.endsWith("/")) {
        redirects.push({
          source: data.permalink,
          destination: target,
          permanent: true,
        });
      }

      // Without trailing slash → redirect
      const withoutTrailing = data.permalink.replace(/\/$/, "");
      redirects.push({
        source: withoutTrailing,
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
  // Increase body size limit for video thumbnail uploads (default is ~4-5MB)
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async redirects() {
    const blogRedirects = generateBlogRedirects();

    return [
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
      // Tag page redirect (low priority, was just a filter page)
      {
        source: "/tags",
        destination: "/archive",
        permanent: true,
      },
      // All blog post redirects (generated from markdown files)
      ...blogRedirects,
    ];
  },
};

export default nextConfig;
