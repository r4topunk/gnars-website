import type { MetadataRoute } from "next";
import { fetchAllDroposals } from "@/services/droposals";
import { getAllBlogs } from "@/services/blogs";
import { fetchAllMembers } from "@/services/members";
import { listDaoPropdates } from "@/services/propdates";
import { listProposals } from "@/services/proposals";
import { fetchGnarsPairedCoins } from "@/lib/zora-coins-subgraph";

export const revalidate = 3600;
export const dynamic = "force-dynamic";

type SitemapEntry = MetadataRoute.Sitemap[number];
type ProposalList = Awaited<ReturnType<typeof listProposals>>;
type DroposalList = Awaited<ReturnType<typeof fetchAllDroposals>>;
type BlogList = Awaited<ReturnType<typeof getAllBlogs>>;
type MemberList = Awaited<ReturnType<typeof fetchAllMembers>>;
type PropdateList = Awaited<ReturnType<typeof listDaoPropdates>>;
type CoinList = Awaited<ReturnType<typeof fetchGnarsPairedCoins>>;

const MAX_PROPOSAL_PAGES = 100;
const PROPOSAL_PAGE_SIZE = 200;
const MAX_COIN_PAGES = 50;
const COIN_PAGE_SIZE = 200;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://gnars.com");

const toUrl = (path: string) => new URL(path, `${SITE_URL.replace(/\/+$/, "")}/`).toString();

const safe = async <T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    console.warn(`[sitemap] ${label} failed`, error);
    return fallback;
  }
};

const toDate = (value: string | number | Date | undefined | null): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const maxDate = (dates: Array<Date | null>, fallback: Date): Date => {
  const valid = dates.filter((d): d is Date => Boolean(d));
  if (valid.length === 0) return fallback;
  return new Date(Math.max(...valid.map((d) => d.getTime())));
};

async function fetchAllProposals(): Promise<ProposalList> {
  const all: ProposalList = [];
  for (let page = 0; page < MAX_PROPOSAL_PAGES; page += 1) {
    const batch = await listProposals(PROPOSAL_PAGE_SIZE, page);
    if (batch.length === 0) break;
    all.push(...batch);
    if (batch.length < PROPOSAL_PAGE_SIZE) break;
  }
  return all;
}

async function fetchAllGnarsPairedCoins(): Promise<CoinList> {
  const all: CoinList = [];
  for (let page = 0; page < MAX_COIN_PAGES; page += 1) {
    const batch = await fetchGnarsPairedCoins({
      first: COIN_PAGE_SIZE,
      skip: page * COIN_PAGE_SIZE,
      orderBy: "blockTimestamp",
      orderDirection: "desc",
    });
    if (batch.length === 0) break;
    all.push(...batch);
    if (batch.length < COIN_PAGE_SIZE) break;
  }
  return all;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const [proposals, droposals, blogs, members, propdates, coins] = await Promise.all([
    safe("proposals", fetchAllProposals, [] as ProposalList),
    safe("droposals", fetchAllDroposals, [] as DroposalList),
    safe("blogs", getAllBlogs, [] as BlogList),
    safe("members", fetchAllMembers, [] as MemberList),
    safe("propdates", listDaoPropdates, [] as PropdateList),
    safe("tv coins", fetchAllGnarsPairedCoins, [] as CoinList),
  ]);

  const proposalLastMod = maxDate(
    proposals.map((proposal) => {
      return (
        toDate(proposal.executedAt) ||
        toDate(proposal.queuedAt) ||
        toDate(proposal.expiresAt) ||
        toDate(proposal.voteEnd) ||
        toDate(proposal.voteStart) ||
        toDate(proposal.createdAt)
      );
    }),
    now,
  );

  const droposalLastMod = maxDate(
    droposals.map((droposal) => toDate(droposal.executedAt ?? droposal.createdAt)),
    now,
  );

  const blogLastMod = maxDate(
    blogs.map((blog) => toDate(blog.updatedAt) || toDate(blog.publishedAt)),
    now,
  );

  const propdateLastMod = maxDate(
    propdates.map((propdate) =>
      propdate.timeCreated ? new Date(propdate.timeCreated * 1000) : null,
    ),
    now,
  );

  const tvLastMod = maxDate(
    coins.map((coin) => {
      const ts = Number(coin.blockTimestamp || 0);
      return ts ? new Date(ts * 1000) : null;
    }),
    now,
  );

  const staticEntries: SitemapEntry[] = [
    {
      url: toUrl("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: toUrl("/auctions"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: toUrl("/proposals"),
      lastModified: proposalLastMod,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: toUrl("/propose"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: toUrl("/treasury"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: toUrl("/members"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: toUrl("/droposals"),
      lastModified: droposalLastMod,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: toUrl("/propdates"),
      lastModified: propdateLastMod,
      changeFrequency: "daily",
      priority: 0.6,
    },
    {
      url: toUrl("/blogs"),
      lastModified: blogLastMod,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: toUrl("/feed"),
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.6,
    },
    {
      url: toUrl("/tv"),
      lastModified: tvLastMod,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: toUrl("/lootbox"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: toUrl("/map"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: toUrl("/mural"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: toUrl("/coin-proposal"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: toUrl("/create-coin"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  const proposalEntries: SitemapEntry[] = proposals.map((proposal) => ({
    url: toUrl(`/proposals/${proposal.proposalNumber}`),
    lastModified:
      toDate(proposal.executedAt) ||
      toDate(proposal.queuedAt) ||
      toDate(proposal.expiresAt) ||
      toDate(proposal.voteEnd) ||
      toDate(proposal.voteStart) ||
      new Date(proposal.createdAt),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const droposalEntries: SitemapEntry[] = droposals.map((droposal) => ({
    url: toUrl(`/droposals/${droposal.proposalNumber}`),
    lastModified: new Date(droposal.executedAt ?? droposal.createdAt),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const blogEntries: SitemapEntry[] = blogs.map((blog) => ({
    url: toUrl(`/blogs/${blog.slug}`),
    lastModified: toDate(blog.updatedAt) || toDate(blog.publishedAt) || now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const memberEntries: SitemapEntry[] = members.map((member) => ({
    url: toUrl(`/members/${member.owner}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  const propdateEntries: SitemapEntry[] = propdates.map((propdate) => ({
    url: toUrl(`/propdates/${propdate.txid}`),
    lastModified: propdate.timeCreated ? new Date(propdate.timeCreated * 1000) : now,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  const tvEntries: SitemapEntry[] = coins.map((coin) => {
    const ts = Number(coin.blockTimestamp || 0);
    return {
      url: toUrl(`/tv/${coin.coin}`),
      lastModified: ts ? new Date(ts * 1000) : now,
      changeFrequency: "weekly",
      priority: 0.5,
    };
  });

  return [
    ...staticEntries,
    ...proposalEntries,
    ...droposalEntries,
    ...blogEntries,
    ...memberEntries,
    ...propdateEntries,
    ...tvEntries,
  ];
}
