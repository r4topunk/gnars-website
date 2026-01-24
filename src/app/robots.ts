import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://gnars.com");

export default function robots(): MetadataRoute.Robots {
  const normalized = SITE_URL.replace(/\/+$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api", "/debug", "/demo"],
      },
    ],
    sitemap: `${normalized}/sitemap.xml`,
  };
}
