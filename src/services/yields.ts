// Live staking/lending yields shown on the /stake page.
// - Lido: stETH staking APR (Ethereum L1)
// - Morpho: largest listed USDC vault net APY on Base

export interface StakeYield {
  /** Annual rate as a percentage, e.g. 4.35 */
  apy: number;
  /** Source protocol label */
  source: string;
  /** Optional detail (e.g. vault name) */
  detail?: string;
}

export interface StakeYields {
  eth: StakeYield | null;
  usdc: StakeYield | null;
  updatedAt: number;
}

const LIDO_APR_URL = "https://eth-api.lido.fi/v1/protocol/steth/apr/last";
const MORPHO_GRAPHQL_URL = "https://blue-api.morpho.org/graphql";
const BASE_CHAIN_ID = 8453;

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
  const [eth, usdc] = await Promise.all([getLidoEthApr(), getMorphoUsdcApy()]);
  return { eth, usdc, updatedAt: Date.now() };
}
