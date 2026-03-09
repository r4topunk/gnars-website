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
      // Archive SEO redirects (old blog posts)
      {
        source: "/sub-dao-culture",
        destination: "/archive/sub-dao-culture",
        permanent: true,
      },
      {
        source: "/sub-dao-culture/",
        destination: "/archive/sub-dao-culture",
        permanent: true,
      },
      {
        source: "/best-cc0-nft-projects",
        destination: "/archive/best-cc0-nft-projects",
        permanent: true,
      },
      {
        source: "/best-cc0-nft-projects/",
        destination: "/archive/best-cc0-nft-projects",
        permanent: true,
      },
      {
        source: "/history-of-nfts",
        destination: "/archive/history-of-nfts",
        permanent: true,
      },
      {
        source: "/history-of-nfts/",
        destination: "/archive/history-of-nfts",
        permanent: true,
      },
      {
        source: "/on-chain-nfts-and-why-theyre-better",
        destination: "/archive/on-chain-nfts-and-why-theyre-better",
        permanent: true,
      },
      {
        source: "/on-chain-nfts-and-why-theyre-better/",
        destination: "/archive/on-chain-nfts-and-why-theyre-better",
        permanent: true,
      },
      {
        source: "/nfts-music-industry-second-life",
        destination: "/archive/nfts-music-industry-second-life",
        permanent: true,
      },
      {
        source: "/nfts-music-industry-second-life/",
        destination: "/archive/nfts-music-industry-second-life",
        permanent: true,
      },
      // Tag page redirect (low priority, was just a filter page)
      {
        source: "/tags",
        destination: "/archive",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
