import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    BASE_URL: "https://nouns.build",
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nouns.build',
      },
      {
        protocol: 'https',
        hostname: 'ipfs.io',
      },
      {
        protocol: 'https',
        hostname: 'goldsky.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.stamp.fyi',
      },
    ],
  },
};

export default nextConfig;
