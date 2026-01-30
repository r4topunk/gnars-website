"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { isThemeValue } from "@/lib/theme";

export function UrlThemeSync() {
  const searchParams = useSearchParams();
  const { theme, setTheme } = useTheme();
  const themeParam = searchParams.get("theme");

  React.useEffect(() => {
    if (!isThemeValue(themeParam)) {
      return;
    }
    if (themeParam === theme) {
      return;
    }
    setTheme(themeParam);
  }, [setTheme, theme, themeParam]);

  return null;
}
