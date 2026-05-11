import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BlogsPageSkeleton } from "@/components/blogs/BlogsPageSkeleton";
import { BlogsView } from "@/components/blogs/BlogsView";
import { getAllBlogSummaries } from "@/services/blogs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "metadata.blogs" });
  const path = "/blogs";
  const canonical = locale === "en" ? path : `/pt-br${path}`;
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical,
      languages: {
        en: path,
        "pt-br": `/pt-br${path}`,
        "x-default": path,
      },
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      locale: locale === "pt-br" ? "pt_BR" : "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
  };
}

export const revalidate = 300;

async function getBlogs() {
  try {
    const result = await getAllBlogSummaries();
    return result;
  } catch (error) {
    console.error("Failed to fetch blogs:", error);
    return [];
  }
}

export default async function BlogsPage() {
  const blogs = await getBlogs();

  return (
    <div className="py-8">
      <Suspense fallback={<BlogsPageSkeleton />}>
        <BlogsView blogs={blogs} />
      </Suspense>
    </div>
  );
}
