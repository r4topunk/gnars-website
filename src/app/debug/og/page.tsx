import Image from "next/image";

type DebugOgPageProps = {
  searchParams?: Promise<{
    proposalId?: string;
    droposalId?: string;
    member?: string;
  }>;
};

const defaults = {
  proposalId: "1",
  droposalId: "1",
  member: "0x0000000000000000000000000000000000000000",
};

export default async function DebugOgPage({ searchParams }: DebugOgPageProps) {
  const params = (await searchParams) ?? {};
  const proposalId = params.proposalId || defaults.proposalId;
  const droposalId = params.droposalId || defaults.droposalId;
  const member = params.member || defaults.member;

  const ogItems = [
    { label: "Home", url: "/opengraph-image" },
    { label: "Auctions", url: "/auctions/opengraph-image" },
    { label: "Treasury", url: "/treasury/opengraph-image" },
    { label: "Proposal", url: `/proposals/${proposalId}/opengraph-image` },
    { label: "Droposal", url: `/droposals/${droposalId}/opengraph-image` },
    { label: "Member", url: `/members/${member}/opengraph-image` },
    { label: "Map", url: "/map/opengraph-image" },
  ];

  const miniappItems = [
    { label: "Home", url: "/miniapp-image" },
    { label: "Map", url: "/map/miniapp-image" },
    { label: "Proposal", url: `/proposals/${proposalId}/miniapp-image` },
    { label: "Droposal", url: `/droposals/${droposalId}/miniapp-image` },
    { label: "Member", url: `/members/${member}/miniapp-image` },
  ];

  return (
    <div className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold">OG Debug</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Query params: proposalId, droposalId, member
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-neutral-100">OG Images (1.91:1)</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {ogItems.map((item) => (
            <div key={item.label} className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              <div className="mb-2 flex items-center justify-between gap-2 text-sm font-semibold text-neutral-200">
                <span>{item.label}</span>
                <span className="rounded-full border border-neutral-700 bg-neutral-900 px-2 py-0.5 text-[10px] uppercase tracking-wide text-neutral-400">
                  1200x630
                </span>
              </div>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-3 block break-all text-xs text-emerald-400"
              >
                {item.url}
              </a>
              <div className="overflow-hidden rounded-lg border border-neutral-800">
                <Image
                  src={item.url}
                  alt={`${item.label} OG`}
                  width={1200}
                  height={630}
                  className="h-auto w-full"
                  unoptimized
                />
              </div>
            </div>
          ))}
        </div>

        <div>
          <h2 className="text-xl font-semibold text-neutral-100">Miniapp Images (3:2)</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {miniappItems.map((item) => (
            <div key={item.label} className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              <div className="mb-2 flex items-center justify-between gap-2 text-sm font-semibold text-neutral-200">
                <span>{item.label}</span>
                <span className="rounded-full border border-neutral-700 bg-neutral-900 px-2 py-0.5 text-[10px] uppercase tracking-wide text-neutral-400">
                  1200x800
                </span>
              </div>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-3 block break-all text-xs text-emerald-400"
              >
                {item.url}
              </a>
              <div className="overflow-hidden rounded-lg border border-neutral-800">
                <Image
                  src={item.url}
                  alt={`${item.label} Miniapp`}
                  width={1200}
                  height={800}
                  className="h-auto w-full"
                  unoptimized
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
