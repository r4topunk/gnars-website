import createIntlMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";

const intlProxy = createIntlMiddleware(routing);

const MARKDOWN_PATHS = ["/", "/proposals"];
const MARKDOWN_DYNAMIC_PATTERNS = [/^\/proposals\/[^/]+$/];

export function stripLocale(pathname: string): string {
  for (const locale of routing.locales) {
    if (locale === routing.defaultLocale) continue;
    if (pathname === `/${locale}`) return "/";
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(`/${locale}`.length);
  }
  return pathname;
}

function isMarkdownPath(pathname: string): boolean {
  const stripped = stripLocale(pathname);
  if (MARKDOWN_PATHS.includes(stripped)) return true;
  return MARKDOWN_DYNAMIC_PATTERNS.some((p) => p.test(stripped));
}

export function proxy(request: NextRequest): NextResponse {
  const accept = request.headers.get("accept") ?? "";
  if (accept.includes("text/markdown") && isMarkdownPath(request.nextUrl.pathname)) {
    const stripped = stripLocale(request.nextUrl.pathname);
    const mdPath = stripped === "/" ? "/md" : `/md${stripped}`;
    return NextResponse.rewrite(new URL(mdPath, request.url));
  }
  return intlProxy(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|md|.*\\..*).*)"],
};
