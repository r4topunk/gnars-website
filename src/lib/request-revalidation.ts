/**
 * Fire-and-forget client helper that asks the server to drop its
 * cache tags after a mutation confirms onchain (vote, propose, bid,
 * settle, ...). See docs/architecture/caching-standard.md (Rule 3).
 *
 * The `/api/revalidate` route handles the delayed second pass needed
 * for subgraph indexing lag internally — the client only calls it
 * once. `keepalive: true` lets the request survive a navigation that
 * happens right after the mutation (e.g. redirect to the new
 * proposal's page).
 *
 * Never throws — this is best-effort infrastructure and must not
 * block or degrade the UX of the mutation it follows.
 */
export function requestRevalidation(tags: string[]): void {
  if (tags.length === 0) return;

  fetch("/api/revalidate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tags }),
    keepalive: true,
  }).catch((error) => {
    console.warn("requestRevalidation failed", { tags, error });
  });
}
