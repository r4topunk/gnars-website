import type { NextConfig } from "next";

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
    return [
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
    ];
  },
};

export default nextConfig;
