import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BlogDetail, BlogDetailSkeleton } from "@/components/blogs/detail/BlogDetail";
import { Blog } from "@/lib/schemas/blogs";
import { getBlogBySlug } from "@/services/blogs";

export const revalidate = 300;
const CROSS_CHAR_REGEX = /[×✕✖✗✘]/g;
const VARIATION_SELECTOR_REGEX = /[\uFE00-\uFE0F]/g;

function normalizeRouteSlug(slug: string): string {
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    decoded = slug;
  }

  return decoded
    .normalize("NFKD")
    .replace(VARIATION_SELECTOR_REGEX, "")
    .replace(CROSS_CHAR_REGEX, "x");
}

async function fetchBlogData(slug: string): Promise<Blog | null> {
  try {
    return await getBlogBySlug(slug);
  } catch (error) {
    console.error("Failed to fetch blog:", error);
    return null;
  }
}

interface BlogPageProps {
  params: Promise<{ slug: string; locale: string }>;
}

export async function generateMetadata({ params }: BlogPageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const normalizedSlug = normalizeRouteSlug(slug);
  const blog = await fetchBlogData(normalizedSlug);

  if (!blog) {
    return {
      title: "Blog Post Not Found | Gnars",
      description: "The blog post you're looking for doesn't exist or has been removed.",
    };
  }

  const description = blog.subtitle || blog.markdown?.slice(0, 160) || "";
  const imageUrl = blog.imageUrl || "https://gnars.com/logo-banner.jpg";
  const path = `/blogs/${normalizedSlug}`;
  const canonicalUrl = locale === "en" ? path : `/pt-br${path}`;

  return {
    title: `${blog.title} | Gnars Blog`,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: path,
        "pt-br": `/pt-br${path}`,
        "x-default": path,
      },
    },
    openGraph: {
      title: blog.title,
      description,
      images: [imageUrl],
      type: "article",
      publishedTime: blog.publishedAt,
      modifiedTime: blog.updatedAt,
      url: `https://gnars.com${canonicalUrl}`,
      siteName: "Gnars",
      locale: locale === "pt-br" ? "pt_BR" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: blog.title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function BlogPage({ params }: BlogPageProps) {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "blogs" });
  const normalizedSlug = normalizeRouteSlug(slug);

  const blog = await fetchBlogData(normalizedSlug);

  if (!blog) {
    return (
      <div className="py-8 text-center">
        <h2 className="text-2xl font-bold text-muted-foreground">{t("notFound.title")}</h2>
        <p className="text-muted-foreground mt-2">{t("notFound.description")}</p>
      </div>
    );
  }

  return (
    <div className="py-8">
      <Suspense fallback={<BlogDetailSkeleton />}>
        <BlogDetail blog={blog} />
      </Suspense>
    </div>
  );
}
