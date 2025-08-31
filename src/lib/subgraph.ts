import { SUBGRAPH } from "@/lib/config";

type GraphQLRequestBody = {
  query: string;
  variables?: Record<string, unknown>;
};

export async function subgraphQuery<TData>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<TData> {
  const body: GraphQLRequestBody = { query, variables };

  const res = await fetch(SUBGRAPH.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    // no-cache to avoid stale data for auctions
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Subgraph error: ${res.status} ${res.statusText} ${text}`);
  }

  const json = (await res.json()) as { data?: TData; errors?: Array<{ message: string }> };
  if (json.errors && json.errors.length > 0) {
    throw new Error(`Subgraph query failed: ${json.errors.map((e) => e.message).join("; ")}`);
  }
  return json.data as TData;
}
