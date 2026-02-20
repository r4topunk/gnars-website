import { useCallback, useEffect, useRef, useState } from "react";
import type { BlogSummary } from "@/lib/schemas/blogs";

const MIN_QUERY_LENGTH = 2;

export function useBlogSearch(blogs: BlogSummary[]) {
  const [ready, setReady] = useState(false);
  const [ids, setIds] = useState<string[] | null | undefined>(undefined);
  const workerRef = useRef<Worker | null>(null);

  const init = useCallback(() => {
    if (workerRef.current) return;
    const w = new Worker(new URL("../workers/blogSearch.worker.ts", import.meta.url), {
      type: "module",
    });
    workerRef.current = w;
    w.onmessage = (e) => {
      if (e.data?.type === "ready") setReady(true);
      if (e.data?.type === "results") {
        const resultIds = e.data.ids as string[];
        setIds(resultIds.length > 0 ? resultIds : null);
      }
    };
    const docs = blogs.map((b) => ({
      id: b.id,
      title: b.title,
      text: `${b.subtitle ?? ""} ${b.previewText ?? ""}`.trim(),
    }));
    w.postMessage({ type: "init", docs });
  }, [blogs]);

  const search = useCallback(
    (q: string) => {
      const trimmedQuery = q.trim();
      if (trimmedQuery.length < MIN_QUERY_LENGTH) {
        setIds(blogs.map((b) => b.id));
        return;
      }

      if (!workerRef.current) {
        init();
        return;
      }

      const w = workerRef.current;
      if (!w || !ready) return;
      w.postMessage({ type: "search", query: trimmedQuery });
    },
    [blogs, init, ready],
  );

  useEffect(
    () => () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    },
    [],
  );

  return { init, ready, ids, search };
}
