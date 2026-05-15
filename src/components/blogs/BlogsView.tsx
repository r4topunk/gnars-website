"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { BlogsGrid } from "@/components/blogs/BlogsGrid";
import { Input } from "@/components/ui/input";
import { useBlogSearch } from "@/hooks/use-blog-search";
import type { BlogSummary } from "@/lib/schemas/blogs";

interface BlogsViewProps {
  blogs: BlogSummary[];
}

export function BlogsView({ blogs: allBlogs }: BlogsViewProps) {
  const t = useTranslations("blogs");
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const {
    init: initSearchWorker,
    ids: searchFilteredIds,
    search: searchBlogs,
  } = useBlogSearch(allBlogs);

  useEffect(() => {
    searchBlogs(deferredSearchQuery);
  }, [deferredSearchQuery, searchBlogs]);

  const filteredBlogs = useMemo(() => {
    let blogsToFilter = allBlogs;

    if (searchFilteredIds) {
      const idSet = new Set(searchFilteredIds);
      blogsToFilter = allBlogs.filter((b) => idSet.has(b.id));
    }

    return blogsToFilter;
  }, [allBlogs, searchFilteredIds]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight mb-2">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={initSearchWorker}
            className="w-full sm:max-w-xs"
          />
        </div>
      </div>
      <BlogsGrid blogs={filteredBlogs} />
    </div>
  );
}
