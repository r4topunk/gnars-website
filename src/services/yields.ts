// Live staking/lending yields shown on the /stake page.
// - Lido: stETH staking APR (Ethereum L1)
// - Morpho: largest listed USDC vault net APY on Base
// - Morpheus: blended MOR-reward APR on the shared Capital pool (Ethereum L1)

import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { MORPHEUS_POOLS, MORPHEUS_DISTRIBUTOR, MOR_TOKEN } from "@/lib/morpheus";

export interface StakeYield {
  /** Annual rate as a percentage, e.g. 4.35 */
  apy: number;
  /** Source protocol label */
  source: string;
  /** Optional detail (e.g. vault name) */
  detail?: string;
  /** True when the rate is a live estimate that can swing (e.g. MOR emissions). */
  estimate?: boolean;
}

export interface StakeYields {
  eth: StakeYield | null;
  usdc: StakeYield | null;
  /** Blended Morpheus (MOR) reward APR — same rate for the stETH and USDC pools. */
  mor: StakeYield | null;
  updatedAt: number;
}

const LIDO_APR_URL = "https://eth-api.lido.fi/v1/protocol/steth/apr/last";
const MORPHO_GRAPHQL_URL = "https://blue-api.morpho.org/graphql";
const BASE_CHAIN_ID = 8453;

// ---- Morpheus (MOR) capital-pool APR ----------------------------------------
// Emission for the shared reward pool (index 0) is minted MOR/day; it's split
// across the stETH + USDC deposit pools by their oracle-valued deposits, so the
// blended APR is: dailyMor * morUsd * 365 / totalTvlUsd. Verified live on-chain
// (getPeriodRewards / totalDepositedInPublicPools) before wiring.
const MOR_REWARD_POOL_INDEX = BigInt(0);
const morMainnet = createPublicClient({
  chain: mainnet,
  transport: http(process.env.ETH_RPC_URL || "https://ethereum.publicnode.com"),
});
const distributorAbi = [
  { type: "function", name: "rewardPool", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
] as const;
const rewardPoolAbi = [
  { type: "function", name: "getPeriodRewards", stateMutability: "view",
    inputs: [{ type: "uint256" }, { type: "uint128" }, { type: "uint128" }], outputs: [{ type: "uint256" }] },
] as const;
const depositPoolAbi = [
  { type: "function", name: "totalDepositedInPublicPools", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

async function coingeckoUsd(url: string, pick: (j: unknown) => number | undefined): Promise<number | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const v = pick(await res.json());
    return typeof v === "number" && v > 0 ? v : null;
  } catch {
    return null;
  }
}

async function getMorpheusMorApr(): Promise<StakeYield | null> {
  try {
    const rewardPool = await morMainnet.readContract({
      address: MORPHEUS_DISTRIBUTOR, abi: distributorAbi, functionName: "rewardPool",
    });
    const now = Math.floor(Date.now() / 1000);
    const [daily, stDep, usdcDep, morUsd, ethUsd] = await Promise.all([
      morMainnet.readContract({
        address: rewardPool, abi: rewardPoolAbi, functionName: "getPeriodRewards",
        args: [MOR_REWARD_POOL_INDEX, BigInt(now), BigInt(now + 86400)],
      }),
      morMainnet.readContract({ address: MORPHEUS_POOLS.stEth.pool, abi: depositPoolAbi, functionName: "totalDepositedInPublicPools" }),
      morMainnet.readContract({ address: MORPHEUS_POOLS.usdc.pool, abi: depositPoolAbi, functionName: "totalDepositedInPublicPools" }),
      coingeckoUsd(
        `https://api.coingecko.com/api/v3/simple/token_price/arbitrum-one?contract_addresses=${MOR_TOKEN}&vs_currencies=usd`,
        (j) => (j as Record<string, { usd?: number }>)?.[MOR_TOKEN.toLowerCase()]?.usd,
      ),
      coingeckoUsd(
        "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
        (j) => (j as { ethereum?: { usd?: number } })?.ethereum?.usd,
      ),
    ]);
    if (!morUsd || !ethUsd) return null;

    const dailyMor = Number(daily) / 1e18;
    const tvlUsd = (Number(stDep) / 1e18) * ethUsd + Number(usdcDep) / 1e6; // stETH ≈ ETH, USDC = $1
    if (tvlUsd <= 0) return null;

    const apr = (dailyMor * morUsd * 365) / tvlUsd * 100;
    if (!isFinite(apr) || apr <= 0) return null;
    return { apy: apr, source: "Morpheus", detail: "MOR", estimate: true };
  } catch (error) {
    console.error("[yields] Morpheus fetch failed:", error);
    return null;
  }
}

async function getLidoEthApr(): Promise<StakeYield | null> {
  try {
    const res = await fetch(LIDO_APR_URL, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`lido ${res.status}`);
    const json = (await res.json()) as { data?: { apr?: number } };
    const apr = json?.data?.apr;
    if (typeof apr !== "number") return null;
    return { apy: apr, source: "Lido", detail: "stETH" };
  } catch (error) {
    console.error("[yields] Lido fetch failed:", error);
    return null;
  }
}

async function getMorphoUsdcApy(): Promise<StakeYield | null> {
  const query = `{
    vaults(first: 1, where: { chainId_in: [${BASE_CHAIN_ID}], assetSymbol_in: ["USDC"], listed: true }, orderBy: TotalAssetsUsd, orderDirection: Desc) {
      items { name state { netApy } }
    }
  }`;
  try {
    const res = await fetch(MORPHO_GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`morpho ${res.status}`);
    const json = (await res.json()) as {
      data?: { vaults?: { items?: Array<{ name: string; state?: { netApy?: number } }> } };
    };
    const vault = json?.data?.vaults?.items?.[0];
    const netApy = vault?.state?.netApy;
    if (typeof netApy !== "number") return null;
    return { apy: netApy * 100, source: "Morpho", detail: vault?.name };
  } catch (error) {
    console.error("[yields] Morpho fetch failed:", error);
    return null;
  }
}

export async function getStakeYields(): Promise<StakeYields> {
  const [eth, usdc, mor] = await Promise.all([getLidoEthApr(), getMorphoUsdcApy(), getMorpheusMorApr()]);
  return { eth, usdc, mor, updatedAt: Date.now() };
}
