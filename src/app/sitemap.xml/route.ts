import { getPostMetadata } from "@/lib/posts";
import { fetchGnarsPairedCoins } from "@/lib/zora-coins-subgraph";
import { getAllBlogs } from "@/services/blogs";
import { fetchAllDroposals } from "@/services/droposals";
import { getAllInstallations } from "@/services/installations";
import { fetchAllMembers } from "@/services/members";
import { listDaoPropdates } from "@/services/propdates";
import { listProposals } from "@/services/proposals";

export const revalidate = 3600;
export const dynamic = "force-dynamic";

type SitemapEntry = {
  url: string;
  lastModified: Date;
  changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: number;
  /** Alternate locale URLs for hreflang tags */
  alternates?: { hreflang: string; href: string }[];
};

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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://gnars.com";
const BASE = SITE_URL.replace(/\/+$/, "");

const toUrl = (path: string) => new URL(path, `${BASE}/`).toString();

/** Build a SitemapEntry for a public route with hreflang alternates for EN and PT-BR. */
const toLocalizedEntry = (
  path: string,
  lastModified: Date,
  changeFrequency: SitemapEntry["changeFrequency"],
  priority: number,
): SitemapEntry[] => {
  const enUrl = toUrl(path);
  const ptUrl = toUrl(`/pt-br${path === "/" ? "" : path}`);
  const alternates = [
    { hreflang: "en", href: enUrl },
    { hreflang: "pt-br", href: ptUrl },
    { hreflang: "x-default", href: enUrl },
  ];
  return [
    { url: enUrl, lastModified, changeFrequency, priority, alternates },
    { url: ptUrl, lastModified, changeFrequency, priority: priority - 0.1, alternates },
  ];
};

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

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

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

function buildSitemap(entries: SitemapEntry[]): string {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  ];

  for (const entry of entries) {
    lines.push("  <url>");
    lines.push(`    <loc>${escapeXml(entry.url)}</loc>`);
    lines.push(`    <lastmod>${entry.lastModified.toISOString()}</lastmod>`);
    lines.push(`    <changefreq>${entry.changeFrequency}</changefreq>`);
    lines.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
    if (entry.alternates) {
      for (const alt of entry.alternates) {
        lines.push(
          `    <xhtml:link rel="alternate" hreflang="${escapeXml(alt.hreflang)}" href="${escapeXml(alt.href)}"/>`,
        );
      }
    }
    lines.push("  </url>");
  }

  lines.push("</urlset>");
  return lines.join("\n");
}

export async function GET(): Promise<Response> {
  const now = new Date();

  const [proposals, droposals, blogs, members, propdates, coins, installations] = await Promise.all(
    [
      safe("proposals", fetchAllProposals, [] as ProposalList),
      safe("droposals", fetchAllDroposals, [] as DroposalList),
      safe("blogs", getAllBlogs, [] as BlogList),
      safe("members", fetchAllMembers, [] as MemberList),
      safe("propdates", listDaoPropdates, [] as PropdateList),
      safe("tv coins", fetchAllGnarsPairedCoins, [] as CoinList),
      safe("installations", getAllInstallations, []),
    ],
  );

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
    ...toLocalizedEntry("/", now, "daily", 1),
    ...toLocalizedEntry("/about", now, "monthly", 0.7),
    ...toLocalizedEntry("/auctions", now, "daily", 0.9),
    ...toLocalizedEntry("/proposals", proposalLastMod, "daily", 0.9),
    ...toLocalizedEntry("/propose", now, "weekly", 0.6),
    ...toLocalizedEntry("/treasury", now, "daily", 0.8),
    ...toLocalizedEntry("/members", now, "weekly", 0.8),
    ...toLocalizedEntry("/droposals", droposalLastMod, "weekly", 0.7),
    ...toLocalizedEntry("/propdates", propdateLastMod, "daily", 0.6),
    ...toLocalizedEntry("/blogs", blogLastMod, "weekly", 0.7),
    ...toLocalizedEntry("/feed", now, "hourly", 0.6),
    ...toLocalizedEntry("/tv", tvLastMod, "daily", 0.7),
    ...toLocalizedEntry("/map", now, "monthly", 0.5),
    ...toLocalizedEntry("/installations", now, "monthly", 0.8),
    ...toLocalizedEntry("/mural", now, "monthly", 0.4),
    ...toLocalizedEntry("/coin-proposal", now, "monthly", 0.4),
    ...toLocalizedEntry("/create-coin", now, "monthly", 0.4),
    ...toLocalizedEntry("/nogglesrails", now, "monthly", 0.6),
    ...toLocalizedEntry("/community/bounties", now, "weekly", 0.6),
    ...toLocalizedEntry("/swap", now, "monthly", 0.5),
  ];

  // Dynamic markdown blog post entries (all posts in root)
  const blogMetadata = getPostMetadata("blog");
  const markdownPostEntries: SitemapEntry[] = blogMetadata.flatMap((post) => {
    const postYear = new Date(post.date).getFullYear();
    const isHistorical = postYear < 2023;
    const lastMod = toDate(post.date) || now;
    const freq: SitemapEntry["changeFrequency"] = isHistorical ? "yearly" : "weekly";
    const prio = isHistorical ? 0.6 : 0.8;
    return toLocalizedEntry(`/${post.slug}`, lastMod, freq, prio);
  });

  const proposalEntries: SitemapEntry[] = proposals.flatMap((proposal) =>
    toLocalizedEntry(
      `/proposals/base/${proposal.proposalNumber}`,
      toDate(proposal.executedAt) ||
        toDate(proposal.queuedAt) ||
        toDate(proposal.expiresAt) ||
        toDate(proposal.voteEnd) ||
        toDate(proposal.voteStart) ||
        new Date(proposal.createdAt),
      "weekly",
      0.7,
    ),
  );

  const droposalEntries: SitemapEntry[] = droposals.flatMap((droposal) =>
    toLocalizedEntry(
      `/droposals/${droposal.proposalNumber}`,
      new Date(droposal.executedAt ?? droposal.createdAt),
      "monthly",
      0.6,
    ),
  );

  const blogEntries: SitemapEntry[] = blogs.flatMap((blog) =>
    toLocalizedEntry(
      `/blogs/${blog.slug.replace(/[×✕✖✗✘]/g, "x")}`,
      toDate(blog.updatedAt) || toDate(blog.publishedAt) || now,
      "monthly",
      0.6,
    ),
  );

  const memberEntries: SitemapEntry[] = members.flatMap((member) =>
    toLocalizedEntry(`/members/${member.owner}`, now, "weekly", 0.5),
  );

  const propdateEntries: SitemapEntry[] = propdates.flatMap((propdate) =>
    toLocalizedEntry(
      `/propdates/${propdate.txid}`,
      propdate.timeCreated ? new Date(propdate.timeCreated * 1000) : now,
      "monthly",
      0.5,
    ),
  );

  const tvEntries: SitemapEntry[] = coins.flatMap((coin) => {
    const ts = Number(coin.blockTimestamp || 0);
    return toLocalizedEntry(`/tv/${coin.coin}`, ts ? new Date(ts * 1000) : now, "weekly", 0.5);
  });

  const installationEntries: SitemapEntry[] = installations.flatMap((installation) =>
    toLocalizedEntry(
      `/installations/${installation.slug}`,
      installation.year ? new Date(installation.year, 0, 1) : now,
      "monthly",
      0.7,
    ),
  );

  const xml = buildSitemap([
    ...staticEntries,
    ...markdownPostEntries,
    ...proposalEntries,
    ...droposalEntries,
    ...blogEntries,
    ...memberEntries,
    ...propdateEntries,
    ...tvEntries,
    ...installationEntries,
  ]);

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
