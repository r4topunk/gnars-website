import type { MetadataRoute } from "next";

// Canonical host is www.gnars.com (matches metadataBase in [locale]/layout.tsx
// and BASE_URL in lib/config.ts). Keeping this in sync is what lets Google index
// the site — a non-www default here made every sitemap URL a redirect to www.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.gnars.com";

export default function robots(): MetadataRoute.Robots {
  const normalized = SITE_URL.replace(/\/+$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api", "/debug", "/demo", "/pt-br/api", "/pt-br/debug", "/pt-br/demo"],
      },
    ],
    sitemap: `${normalized}/sitemap.xml`,
  };
}
