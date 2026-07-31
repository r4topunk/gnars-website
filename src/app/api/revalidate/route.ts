import { revalidateTag } from "next/cache";
import { after, NextResponse } from "next/server";
import { z } from "zod";
import { isAllowedRevalidateTag } from "@/lib/cache-tags";

export const dynamic = "force-dynamic";

// Reject oversized bodies before we even attempt to parse them — this is a
// cheap, unauthenticated route (see rationale below), so a hard size cap is
// the only guardrail against abuse.
const MAX_BODY_BYTES = 1024;
const MAX_TAGS = 5;

const bodySchema = z.object({
  tags: z.array(z.string()).min(1).max(MAX_TAGS),
});

/**
 * Event-driven cache invalidation (docs/architecture/caching-standard.md
 * Rule 3 / P1). Mutation hooks (useCastVote, propose wizard, bid/settle,
 * propdate post, delegate, round vote/submit) call this after confirming a
 * receipt so OTHER users' server caches drop immediately instead of waiting
 * out the TTL.
 *
 * No auth: invalidation is idempotent and cheap — an on-demand
 * `revalidateTag` call that regenerates identical bytes bills 0 ISR write
 * units (see vercel-quota-strategy.md), so there's no meaningful abuse
 * surface beyond wasted compute, which the tag allowlist + size/count caps
 * bound.
 */
export async function POST(request: Request) {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request body too large" }, { status: 413 });
  }

  let rawBody: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Request body too large" }, { status: 413 });
    }
    rawBody = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const invalidTags = parsed.data.tags.filter((tag) => !isAllowedRevalidateTag(tag));
  if (invalidTags.length > 0) {
    return NextResponse.json(
      { error: "Tag not allowed", details: { invalidTags } },
      { status: 400 },
    );
  }

  // Next 16.2 requires a second "profile" arg on revalidateTag (the old
  // single-arg call is deprecated in favor of `updateTag`, which doesn't
  // apply here since we're outside a Server Action). "max" is the profile
  // Next's own deprecation warning recommends as the drop-in replacement
  // for the previous unconditional-invalidation behavior.
  const tags = parsed.data.tags;
  for (const tag of tags) {
    revalidateTag(tag, "max");
  }

  // Goldsky subgraph indexing lag (seconds–~1min, see
  // caching-standard.md) means the first revalidateTag pass above can
  // regenerate pages BEFORE the subgraph has indexed the mutation that
  // triggered this call — the regenerated page would cache the still-stale
  // read. Schedule a second pass ~45s later, after the response has been
  // sent, as a cheap fallback that doesn't block the caller.
  after(async () => {
    await new Promise((resolve) => setTimeout(resolve, 45_000));
    for (const tag of tags) {
      revalidateTag(tag, "max");
    }
  });

  return NextResponse.json({ revalidated: tags });
}
