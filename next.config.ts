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
    // Exclude mcp-subgraph from type checking during build
    ignoreBuildErrors: false,
  },
  webpack: (config, { isServer }) => {
    // Exclude mcp-subgraph from webpack bundling
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'mcp-subgraph': false,
      };
    }
    return config;
  },
};

export default nextConfig;
