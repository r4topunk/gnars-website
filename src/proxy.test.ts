import type { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { proxy, stripLocale } from "./proxy";

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

vi.mock("next-intl/middleware", () => {
  // createIntlMiddleware(routing) returns a middleware handler.
  // Return a fake response object that matches the FakeResponse shape used in the next/server mock.
  const fakeNext = { kind: "next" as const };
  return {
    default: () => () => fakeNext,
  };
});

vi.mock("@/i18n/routing", () => ({
  routing: {
    locales: ["en", "pt-br"],
    defaultLocale: "en",
    localePrefix: "as-needed",
  },
}));

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

describe("proxy — markdown content negotiation", () => {
  it("does nothing when the Accept header does not request markdown", () => {
    const res = proxy(makeRequest("https://www.gnars.com/proposals", "text/html"));

    expect((res as unknown as { kind: string }).kind).toBe("next");
  });

  it("does nothing when the Accept header is missing", () => {
    const res = proxy(makeRequest("https://www.gnars.com/proposals", null));

    expect((res as unknown as { kind: string }).kind).toBe("next");
  });

  it("rewrites the root path to /md when markdown is requested", () => {
    const res = proxy(makeRequest("https://www.gnars.com/", "text/markdown")) as unknown as {
      kind: string;
      url: URL;
    };

    expect(res.kind).toBe("rewrite");
    expect(res.url.pathname).toBe("/md");
  });

  it("rewrites /proposals to /md/proposals when markdown is requested", () => {
    const res = proxy(
      makeRequest("https://www.gnars.com/proposals", "text/markdown"),
    ) as unknown as { kind: string; url: URL };

    expect(res.kind).toBe("rewrite");
    expect(res.url.pathname).toBe("/md/proposals");
  });

  it("rewrites a dynamic proposal detail path", () => {
    const res = proxy(
      makeRequest("https://www.gnars.com/proposals/42", "text/markdown"),
    ) as unknown as { kind: string; url: URL };

    expect(res.kind).toBe("rewrite");
    expect(res.url.pathname).toBe("/md/proposals/42");
  });

  it("does not rewrite nested proposal subpaths (e.g. /proposals/42/foo)", () => {
    // Matcher allows these through, but isMarkdownPath filters them out.
    const res = proxy(makeRequest("https://www.gnars.com/proposals/42/comments", "text/markdown"));

    expect((res as unknown as { kind: string }).kind).toBe("next");
  });

  it("honors Accept headers that list markdown among other types", () => {
    const res = proxy(
      makeRequest("https://www.gnars.com/proposals", "text/html,text/markdown;q=0.9"),
    ) as unknown as { kind: string; url: URL };

    expect(res.kind).toBe("rewrite");
    expect(res.url.pathname).toBe("/md/proposals");
  });

  it("ignores unrelated paths even with a markdown Accept header", () => {
    const res = proxy(makeRequest("https://www.gnars.com/auctions", "text/markdown"));

    expect((res as unknown as { kind: string }).kind).toBe("next");
  });
});

describe("proxy — locale-aware markdown rewriting", () => {
  it("rewrites /pt-br/proposals with markdown Accept to /md/proposals", () => {
    const res = proxy(
      makeRequest("https://www.gnars.com/pt-br/proposals", "text/markdown"),
    ) as unknown as { kind: string; url: URL };

    expect(res.kind).toBe("rewrite");
    expect(res.url.pathname).toBe("/md/proposals");
  });

  it("rewrites /pt-br/proposals/123 with markdown Accept to /md/proposals/123", () => {
    const res = proxy(
      makeRequest("https://www.gnars.com/pt-br/proposals/123", "text/markdown"),
    ) as unknown as { kind: string; url: URL };

    expect(res.kind).toBe("rewrite");
    expect(res.url.pathname).toBe("/md/proposals/123");
  });

  it("does NOT rewrite /pt-br/proposals without markdown Accept (returns from intl middleware)", () => {
    const res = proxy(makeRequest("https://www.gnars.com/pt-br/proposals", "text/html"));

    expect((res as unknown as { kind: string }).kind).toBe("next");
  });
});

describe("stripLocale", () => {
  it("strips /pt-br prefix from /pt-br/proposals", () => {
    expect(stripLocale("/pt-br/proposals")).toBe("/proposals");
  });

  it("strips /pt-br prefix and returns / for /pt-br", () => {
    expect(stripLocale("/pt-br")).toBe("/");
  });

  it("returns unchanged pathname for default locale /proposals", () => {
    expect(stripLocale("/proposals")).toBe("/proposals");
  });
});
