import Image from "next/image";

type DebugOgPageProps = {
  searchParams?: Promise<{
    proposalId?: string;
    droposalId?: string;
    member?: string;
    eager?: string; // legacy toggle (eager=0 => lazy)
    lazy?: string;
  }>;
};

type DebugImageItem = {
  label: string;
  url: string;
  hint?: string;
};

const defaults = {
  proposalId: "1",
  droposalId: "1",
  member: "0x0000000000000000000000000000000000000000",
};

function DebugImageCard({
  item,
  sizeLabel,
  width,
  height,
  loading,
}: {
  item: DebugImageItem;
  sizeLabel: string;
  width: number;
  height: number;
  loading?: "lazy" | "eager";
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2 text-sm font-semibold">
        <span>{item.label}</span>
        <span className="rounded-full border bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          {sizeLabel}
        </span>
      </div>

      {item.hint ? <p className="mb-2 text-xs text-muted-foreground">{item.hint}</p> : null}

      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-3 block break-all text-xs text-blue-600 hover:underline dark:text-blue-400"
      >
        {item.url}
      </a>

      <div className="overflow-hidden rounded-lg border bg-muted/40">
        <Image
          src={item.url}
          alt={item.label}
          width={width}
          height={height}
          className="h-auto w-full"
          unoptimized
          loading={loading}
        />
      </div>
    </div>
  );
}

export default async function DebugOgPage({ searchParams }: DebugOgPageProps) {
  const params = (await searchParams) ?? {};
  const proposalId = params.proposalId || defaults.proposalId;
  const droposalId = params.droposalId || defaults.droposalId;
  const member = params.member || defaults.member;
  const lazy = params.lazy === "1" || params.eager === "0";
  const imageLoading = lazy ? "lazy" : "eager";

  const ogItems: DebugImageItem[] = [
    { label: "Home", url: "/opengraph-image" },
    { label: "Auctions", url: "/auctions/opengraph-image" },
    { label: "Treasury", url: "/treasury/opengraph-image" },
    { label: "TV", url: "/tv/opengraph-image" },
    { label: "Proposal", url: `/proposals/${proposalId}/opengraph-image` },
    { label: "Droposal", url: `/droposals/${droposalId}/opengraph-image` },
    { label: "Member", url: `/members/${member}/opengraph-image` },
    { label: "Map", url: "/map/opengraph-image" },
  ];

  const ogEdgeItems: DebugImageItem[] = [
    {
      label: "Proposal (Not Found)",
      url: "/proposals/999999/opengraph-image",
      hint: "Expected: fallback image",
    },
    {
      label: "Proposal (Hex ID)",
      url: "/proposals/0x0/opengraph-image",
      hint: "Covers proposalId lookup path",
    },
    {
      label: "Droposal (Not Found)",
      url: "/droposals/999999/opengraph-image",
      hint: "Expected: fallback image",
    },
    {
      label: "Droposal (Hex ID)",
      url: "/droposals/0x0/opengraph-image",
      hint: "Covers proposalId lookup path",
    },
    {
      label: "Member (Invalid Address)",
      url: "/members/not-an-address/opengraph-image",
      hint: "Expected: fallback data in member-og-data",
    },
  ];

  const miniappItems: DebugImageItem[] = [
    { label: "Home", url: "/miniapp-image" },
    { label: "Map", url: "/map/miniapp-image" },
    { label: "Proposal", url: `/proposals/${proposalId}/miniapp-image` },
    { label: "Droposal", url: `/droposals/${droposalId}/miniapp-image` },
    { label: "Member", url: `/members/${member}/miniapp-image` },
  ];

  const miniappEdgeItems: DebugImageItem[] = [
    {
      label: "Proposal (Not Found)",
      url: "/proposals/999999/miniapp-image",
      hint: "Expected: fallback image",
    },
    {
      label: "Proposal (Hex ID)",
      url: "/proposals/0x0/miniapp-image",
      hint: "Covers proposalId lookup path",
    },
    {
      label: "Droposal (Not Found)",
      url: "/droposals/999999/miniapp-image",
      hint: "Expected: fallback image",
    },
    {
      label: "Droposal (Hex ID)",
      url: "/droposals/0x0/miniapp-image",
      hint: "Covers proposalId lookup path",
    },
    {
      label: "Member (Invalid Address)",
      url: "/members/not-an-address/miniapp-image",
      hint: "Expected: fallback data in member-og-data",
    },
  ];

  const miniappNodeItems: DebugImageItem[] = [
    {
      label: "Proposal (Node)",
      url: `/api/og/proposals/${proposalId}/miniapp-image`,
      hint: "Underlying nodejs route used by the edge proxy",
    },
    {
      label: "Droposal (Node)",
      url: `/api/og/droposals/${droposalId}/miniapp-image`,
      hint: "Underlying nodejs route used by the edge proxy",
    },
    {
      label: "Proposal (Node, Not Found)",
      url: "/api/og/proposals/999999/miniapp-image",
      hint: "Expected: fallback image",
    },
    {
      label: "Droposal (Node, Not Found)",
      url: "/api/og/droposals/999999/miniapp-image",
      hint: "Expected: fallback image",
    },
  ];

  return (
    <div className="min-h-screen bg-background p-8 text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold">OG Debug</h1>
          <p className="mt-2 text-sm text-muted-foreground">Query params: proposalId, droposalId, member</p>
        </div>

        <form method="get" className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">proposalId</span>
              <input
                name="proposalId"
                defaultValue={proposalId}
                className="h-9 rounded-md border bg-background px-3 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">droposalId</span>
              <input
                name="droposalId"
                defaultValue={droposalId}
                className="h-9 rounded-md border bg-background px-3 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">member</span>
              <input
                name="member"
                defaultValue={member}
                className="h-9 rounded-md border bg-background px-3 text-sm"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Update
            </button>
            <a
              href="/debug/og"
              className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium"
            >
              Reset
            </a>
            <span className="text-xs text-muted-foreground">
              Tip: use a large number (e.g. 999999) to confirm fallback rendering.
            </span>
            <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                name="lazy"
                value="1"
                defaultChecked={lazy}
                className="h-4 w-4 rounded border bg-background"
              />
              Lazy-load images
            </label>
          </div>
        </form>

        <div>
          <h2 className="text-xl font-semibold">OG Images (1.91:1)</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {ogItems.map((item) => (
            <DebugImageCard
              key={item.label}
              item={item}
              sizeLabel="1200x630"
              width={1200}
              height={630}
              loading={imageLoading}
            />
          ))}
        </div>

        <div>
          <h2 className="text-xl font-semibold">OG Edge Cases (Fallbacks)</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {ogEdgeItems.map((item) => (
            <DebugImageCard
              key={item.label}
              item={item}
              sizeLabel="1200x630"
              width={1200}
              height={630}
              loading={imageLoading}
            />
          ))}
        </div>

        <section className="flex flex-col gap-3" data-testid="miniapp-images">
          <h2 className="text-xl font-semibold">Miniapp Images (3:2)</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {miniappItems.map((item) => (
              <DebugImageCard
                key={item.label}
                item={item}
                sizeLabel="1200x800"
                width={1200}
                height={800}
                loading={imageLoading}
              />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3" data-testid="miniapp-edge-cases">
          <h2 className="text-xl font-semibold">Miniapp Edge Cases (Fallbacks)</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {miniappEdgeItems.map((item) => (
              <DebugImageCard
                key={item.label}
                item={item}
                sizeLabel="1200x800"
                width={1200}
                height={800}
                loading={imageLoading}
              />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3" data-testid="miniapp-node-images">
          <div>
            <h2 className="text-xl font-semibold">Miniapp Images (Node Routes)</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              These are the underlying `nodejs` endpoints used by the edge proxy routes.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {miniappNodeItems.map((item) => (
              <DebugImageCard
                key={item.label}
                item={item}
                sizeLabel="1200x800"
                width={1200}
                height={800}
                loading={imageLoading}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
