import type { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { middleware } from "./middleware";

vi.mock("next/server", async () => {
  class FakeResponse {
    constructor(
      public readonly kind: "next" | "rewrite",
      public readonly url?: URL,
    ) {}
  }

  const NextResponse = {
    next: () => new FakeResponse("next"),
    rewrite: (url: URL) => new FakeResponse("rewrite", url),
  };

  return { NextResponse };
});

function makeRequest(url: string, accept: string | null): NextRequest {
  const parsed = new URL(url);
  return {
    headers: {
      get(name: string) {
        return name.toLowerCase() === "accept" ? accept : null;
      },
    },
    nextUrl: parsed,
    url: parsed.toString(),
  } as unknown as NextRequest;
}

describe("middleware — markdown content negotiation", () => {
  it("does nothing when the Accept header does not request markdown", () => {
    const res = middleware(makeRequest("https://www.gnars.com/proposals", "text/html"));

    expect((res as unknown as { kind: string }).kind).toBe("next");
  });

  it("does nothing when the Accept header is missing", () => {
    const res = middleware(makeRequest("https://www.gnars.com/proposals", null));

    expect((res as unknown as { kind: string }).kind).toBe("next");
  });

  it("rewrites the root path to /md when markdown is requested", () => {
    const res = middleware(makeRequest("https://www.gnars.com/", "text/markdown")) as unknown as {
      kind: string;
      url: URL;
    };

    expect(res.kind).toBe("rewrite");
    expect(res.url.pathname).toBe("/md");
  });

  it("rewrites /proposals to /md/proposals when markdown is requested", () => {
    const res = middleware(
      makeRequest("https://www.gnars.com/proposals", "text/markdown"),
    ) as unknown as { kind: string; url: URL };

    expect(res.kind).toBe("rewrite");
    expect(res.url.pathname).toBe("/md/proposals");
  });

  it("rewrites a dynamic proposal detail path", () => {
    const res = middleware(
      makeRequest("https://www.gnars.com/proposals/42", "text/markdown"),
    ) as unknown as { kind: string; url: URL };

    expect(res.kind).toBe("rewrite");
    expect(res.url.pathname).toBe("/md/proposals/42");
  });

  it("does not rewrite nested proposal subpaths (e.g. /proposals/42/foo)", () => {
    // Matcher allows these through middleware, but isMarkdownPath filters them out.
    const res = middleware(
      makeRequest("https://www.gnars.com/proposals/42/comments", "text/markdown"),
    );

    expect((res as unknown as { kind: string }).kind).toBe("next");
  });

  it("honors Accept headers that list markdown among other types", () => {
    const res = middleware(
      makeRequest("https://www.gnars.com/proposals", "text/html,text/markdown;q=0.9"),
    ) as unknown as { kind: string; url: URL };

    expect(res.kind).toBe("rewrite");
    expect(res.url.pathname).toBe("/md/proposals");
  });

  it("ignores unrelated paths even with a markdown Accept header", () => {
    const res = middleware(makeRequest("https://www.gnars.com/auctions", "text/markdown"));

    expect((res as unknown as { kind: string }).kind).toBe("next");
  });
});
