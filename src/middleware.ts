import { NextRequest, NextResponse } from "next/server";

const MARKDOWN_PATHS = ["/", "/proposals"];
const MARKDOWN_DYNAMIC_PATTERNS = [/^\/proposals\/[^/]+$/];

function isMarkdownPath(pathname: string): boolean {
  if (MARKDOWN_PATHS.includes(pathname)) return true;
  return MARKDOWN_DYNAMIC_PATTERNS.some((pattern) => pattern.test(pathname));
}

export function middleware(request: NextRequest) {
  const accept = request.headers.get("accept") ?? "";
  if (!accept.includes("text/markdown")) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (!isMarkdownPath(pathname)) return NextResponse.next();

  const mdPath = pathname === "/" ? "/md" : `/md${pathname}`;
  return NextResponse.rewrite(new URL(mdPath, request.url));
}

export const config = {
  matcher: ["/", "/proposals", "/proposals/:id*"],
};
