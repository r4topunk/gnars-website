/**
 * Proposal funding POC
 *
 * Run with:
 *   npx tsx scripts/proposal-funding-poc.ts --mode=compare --limit=120 --sample=8
 */

import process from "node:process";
import { getProposalFundingTotals, getProposalRequestedUsdTotal } from "../src/lib/proposal-funding";
import { GNARS_ADDRESSES, SUBGRAPH } from "../src/lib/config";

type Mode = "current" | "historical" | "compare";

type Options = {
  mode: Mode;
  limit: number;
  sample: number;
};

type EthPricePoint = {
  usd: number;
  source: "current" | "historical";
  dateLabel?: string;
};

type SubgraphProposalRow = {
  proposalId?: string;
  proposalNumber?: string | number;
  title?: string;
  timeCreated?: string | number;
  targets?: unknown;
  values?: unknown;
  calldatas?: unknown;
};

type ProposalRow = {
  proposalId: string;
  proposalNumber: number;
  title: string;
  timeCreated: number;
  targets: string[];
  values: string[];
  calldatas: string[];
};

function parseArgs(argv: string[]): Options {
  const options: Options = {
    mode: "compare",
    limit: 120,
    sample: 8,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];
    if (!raw.startsWith("--")) continue;

    const [flag, inlineValue] = raw.split("=", 2);
    const next = inlineValue ?? argv[i + 1];
    const hasInline = inlineValue !== undefined;

    const readValue = (): string => {
      if (!next || next.startsWith("--")) {
        throw new Error(`Missing value for ${flag}`);
      }
      if (!hasInline) i += 1;
      return next;
    };

    switch (flag) {
      case "--mode": {
        const value = readValue().toLowerCase();
        if (value !== "current" && value !== "historical" && value !== "compare") {
          throw new Error(`Invalid --mode "${value}". Use current|historical|compare`);
        }
        options.mode = value;
        break;
      }
      case "--limit":
        options.limit = Math.max(1, Number.parseInt(readValue(), 10) || options.limit);
        break;
      case "--sample":
        options.sample = Math.max(1, Number.parseInt(readValue(), 10) || options.sample);
        break;
      default:
        break;
    }
  }

  return options;
}

function cgHeaders(): Record<string, string> {
  const apiKey = process.env.COINGECKO_API_KEY;
  if (!apiKey) return { "user-agent": "gnars-website/proposal-funding-poc" };
  return {
    "user-agent": "gnars-website/proposal-funding-poc",
    "x-cg-demo-api-key": apiKey,
  };
}

async function fetchCurrentEthUsd(): Promise<EthPricePoint> {
  const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd", {
    headers: cgHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed current ETH price: ${res.status}`);
  const data = (await res.json()) as { ethereum?: { usd?: number } };
  return { usd: Number(data?.ethereum?.usd ?? 0) || 0, source: "current" };
}

function toCoinGeckoDate(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

async function fetchHistoricalEthUsd(date: Date): Promise<EthPricePoint> {
  const dateLabel = toCoinGeckoDate(date);
  const url = `https://api.coingecko.com/api/v3/coins/ethereum/history?date=${dateLabel}&localization=false`;
  const res = await fetch(url, {
    headers: cgHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed historical ETH price (${dateLabel}): ${res.status}`);
  const data = (await res.json()) as { market_data?: { current_price?: { usd?: number } } };
  const usd = Number(data?.market_data?.current_price?.usd ?? 0) || 0;
  return { usd, source: "historical", dateLabel };
}

function fmtUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

function fmtAmount(value: number, maxFractionDigits = 4): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

function toStringArray(input: unknown): string[] {
  if (Array.isArray(input)) return input.map((v) => String(v));
  if (typeof input === "string") return input.split(":").filter(Boolean);
  return [];
}

async function fetchProposals(limit: number): Promise<ProposalRow[]> {
  const query = `
    query ProposalFundingPOC($dao: String!, $first: Int!) {
      proposals(
        where: { dao: $dao }
        first: $first
        orderBy: proposalNumber
        orderDirection: desc
      ) {
        proposalId
        proposalNumber
        title
        timeCreated
        targets
        values
        calldatas
      }
    }
  `;

  const res = await fetch(SUBGRAPH.url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables: {
        dao: GNARS_ADDRESSES.token.toLowerCase(),
        first: limit,
      },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Subgraph request failed: ${res.status}`);
  }

  const body = (await res.json()) as {
    data?: { proposals?: SubgraphProposalRow[] };
    errors?: Array<{ message?: string }>;
  };

  if (body.errors?.length) {
    throw new Error(`Subgraph GraphQL errors: ${body.errors.map((e) => e.message).join("; ")}`);
  }

  const rows = body.data?.proposals ?? [];
  return rows.map((p) => ({
    proposalId: String(p.proposalId ?? ""),
    proposalNumber: Number(p.proposalNumber ?? 0),
    title: String(p.title ?? ""),
    timeCreated: Number(p.timeCreated ?? 0),
    targets: toStringArray(p.targets),
    values: toStringArray(p.values),
    calldatas: toStringArray(p.calldatas),
  }));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  console.log("Proposal funding POC");
  console.log("=".repeat(72));
  console.log(`mode=${options.mode} limit=${options.limit} sample=${options.sample}`);

  const proposals = await fetchProposals(options.limit);
  const withFunding = proposals
    .map((proposal) => {
      const totals = getProposalFundingTotals({
        targets: proposal.targets,
        values: proposal.values,
        calldatas: proposal.calldatas,
      });
      return { proposal, totals };
    })
    .filter(({ totals }) => totals.totalEthWei > 0n || totals.totalUsdcRaw > 0n)
    .slice(0, options.sample);

  if (withFunding.length === 0) {
    console.log("No proposals with direct ETH/USDC transfers were found.");
    return;
  }

  const currentEthPrice = options.mode !== "historical" ? await fetchCurrentEthUsd() : null;
  const historicalCache = new Map<string, EthPricePoint>();

  console.log(`Loaded ${withFunding.length} proposal(s) with direct funding asks.\n`);

  let totalCurrentUsd = 0;
  let totalHistoricalUsd = 0;

  for (const { proposal, totals } of withFunding) {
    const proposalDate = new Date(proposal.timeCreated * 1000);
    const cacheKey = toCoinGeckoDate(proposalDate);

    let historicalPrice: EthPricePoint | null = null;
    if (options.mode !== "current") {
      if (!historicalCache.has(cacheKey)) {
        try {
          historicalCache.set(cacheKey, await fetchHistoricalEthUsd(proposalDate));
        } catch (error) {
          console.warn(`Historical ETH price unavailable for ${cacheKey}: ${String(error)}`);
          historicalCache.set(cacheKey, { usd: 0, source: "historical", dateLabel: cacheKey });
        }
      }
      historicalPrice = historicalCache.get(cacheKey)!;
    }

    const usdCurrent =
      currentEthPrice && currentEthPrice.usd > 0
        ? getProposalRequestedUsdTotal(totals, currentEthPrice.usd)
        : 0;
    const usdHistorical =
      historicalPrice && historicalPrice.usd > 0
        ? getProposalRequestedUsdTotal(totals, historicalPrice.usd)
        : 0;

    totalCurrentUsd += usdCurrent;
    totalHistoricalUsd += usdHistorical;

    console.log(`#${proposal.proposalNumber} ${proposal.title}`);
    console.log(
      `  ask: ${fmtAmount(totals.totalEth)} ETH + ${fmtAmount(totals.totalUsdc, 2)} USDC`,
    );

    if (options.mode !== "historical" && currentEthPrice) {
      console.log(`  option B (current ETH ${fmtUsd(currentEthPrice.usd)}): ${fmtUsd(usdCurrent)}`);
    }
    if (options.mode !== "current" && historicalPrice) {
      const priceLabel =
        historicalPrice.usd > 0
          ? `historical ETH on ${historicalPrice.dateLabel} (${fmtUsd(historicalPrice.usd)})`
          : `historical ETH on ${historicalPrice.dateLabel} (unavailable)`;
      console.log(`  option A (${priceLabel}): ${historicalPrice.usd > 0 ? fmtUsd(usdHistorical) : "—"}`);
    }

    if (options.mode === "compare" && currentEthPrice && historicalPrice && historicalPrice.usd > 0) {
      const diff = usdCurrent - usdHistorical;
      const pct = usdHistorical !== 0 ? (diff / usdHistorical) * 100 : 0;
      const sign = diff >= 0 ? "+" : "";
      console.log(`  delta (B - A): ${sign}${fmtUsd(diff)} (${sign}${pct.toFixed(2)}%)`);
    }

    console.log("");
  }

  console.log("-".repeat(72));
  if (options.mode !== "historical" && currentEthPrice) {
    console.log(`Aggregate option B (current ETH): ${fmtUsd(totalCurrentUsd)}`);
  }
  if (options.mode !== "current") {
    console.log(`Aggregate option A (historical ETH): ${fmtUsd(totalHistoricalUsd)}`);
  }
}

main().catch((error) => {
  console.error("proposal-funding-poc failed:", error);
  process.exit(1);
});
