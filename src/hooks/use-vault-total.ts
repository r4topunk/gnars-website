"use client";

// Sponsorship vault reads (totals, per-account position, earned), straight from
// the contract via react-query. Every hook here returns null while loading, when
// the rider has no vault yet, or if the read fails — callers should show
// "no vault yet" rather than a fake $0.
import { useQuery } from "@tanstack/react-query";
import { createPublicClient, fallback, formatUnits, http, type Address } from "viem";
import { base } from "viem/chains";
import { RIDER_LIST } from "@/lib/gnars-vaults";
import { blockscoutGet } from "@/services/blockscout";

const client = createPublicClient({
  chain: base,
  // Datacenter IPs get rate-limited on a single endpoint; fall through instead.
  transport: fallback([
    http("https://mainnet.base.org"),
    http("https://base-rpc.publicnode.com"),
    http("https://base.drpc.org"),
  ]),
});

const abi = [
  {
    type: "function",
    name: "totalAssets",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "convertToAssets",
    stateMutability: "view",
    inputs: [{ type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

/**
 * What a given account currently has in a vault, in USDC. Read via
 * convertToAssets(balanceOf) — `maxWithdraw` reports 0 while the liquidity sits
 * in the adapter, so it can't be used here.
 *
 * `nonce` lets callers force a refetch after a deposit/withdraw lands.
 */
export function useVaultPosition(
  vault?: Address,
  account?: string,
  nonce = 0,
): { shares: bigint; assets: number } | null {
  const { data } = useQuery({
    // `nonce` in the key is what makes a post-transaction bump refetch.
    queryKey: ["vault-position", vault, account, nonce],
    enabled: !!vault && !!account,
    // The user's own money — kept fresher than the vault totals.
    staleTime: 30_000,
    queryFn: async (): Promise<{ shares: bigint; assets: number } | null> => {
      try {
        const shares = await client.readContract({
          address: vault!,
          abi,
          functionName: "balanceOf",
          args: [account as Address],
        });
        if (shares === BigInt(0)) return { shares: BigInt(0), assets: 0 };
        const assets = await client.readContract({
          address: vault!,
          abi,
          functionName: "convertToAssets",
          args: [shares],
        });
        return { shares, assets: Number(formatUnits(assets, 6)) };
      } catch {
        return null;
      }
    },
  });

  return data ?? null;
}

type DecodedParam = { name?: string; value?: unknown };
type LogItem = { decoded?: { method_call?: string; parameters?: DecodedParam[] } | null };

/** Net principal an account put in: sum of its Deposit assets minus Withdraw assets.
 *  Delegates the fetch to the crash-safe Blockscout helper — a 500 with a
 *  non-JSON body (the production "Internal server error") now degrades to 0
 *  instead of calling `.json()` on the text body. */
async function principalFromLogs(vault: Address, account: string): Promise<bigint> {
  const json = await blockscoutGet<{ items?: LogItem[] }>(`addresses/${vault}/logs`);
  if (!json) return BigInt(0);
  const me = account.toLowerCase();
  let principal = BigInt(0);
  for (const log of json.items ?? []) {
    const call = log.decoded?.method_call ?? "";
    const params = log.decoded?.parameters ?? [];
    const owner = params.find((p) => p.name === "owner")?.value;
    if (typeof owner !== "string" || owner.toLowerCase() !== me) continue;
    const assets = params.find((p) => p.name === "assets")?.value;
    if (typeof assets !== "string" && typeof assets !== "number") continue;
    const amt = BigInt(assets);
    if (call.startsWith("Deposit(")) principal += amt;
    else if (call.startsWith("Withdraw(")) principal -= amt;
  }
  return principal > BigInt(0) ? principal : BigInt(0);
}

export type VaultEarned = {
  /** Current position value, USDC. */
  current: number;
  /** Net deposited, USDC. */
  principal: number;
  /** current − principal, floored at 0, USDC. */
  earned: number;
  /** Raw earned in USDC micro-units, for the withdraw call. */
  earnedRaw: bigint;
  shares: bigint;
};

/**
 * Splits a position into principal vs earned. Principal isn't stored per-user
 * on-chain, so it's reconstructed from the account's Deposit/Withdraw events;
 * the current value is read from the contract. `nonce` forces a refetch.
 */
export function useVaultEarned(vault?: Address, account?: string, nonce = 0): VaultEarned | null {
  const { data } = useQuery({
    queryKey: ["vault-earned", vault, account, nonce],
    enabled: !!vault && !!account,
    staleTime: 30_000,
    queryFn: async (): Promise<VaultEarned | null> => {
      try {
        const shares = await client.readContract({
          address: vault!,
          abi,
          functionName: "balanceOf",
          args: [account as Address],
        });
        if (shares === BigInt(0)) {
          return { current: 0, principal: 0, earned: 0, earnedRaw: BigInt(0), shares: BigInt(0) };
        }
        const [currentRaw, principalRaw] = await Promise.all([
          client.readContract({
            address: vault!,
            abi,
            functionName: "convertToAssets",
            args: [shares],
          }),
          principalFromLogs(vault!, account!),
        ]);
        const earnedRaw = currentRaw > principalRaw ? currentRaw - principalRaw : BigInt(0);
        return {
          current: Number(formatUnits(currentRaw, 6)),
          principal: Number(formatUnits(principalRaw, 6)),
          earned: Number(formatUnits(earnedRaw, 6)),
          earnedRaw,
          shares,
        };
      } catch {
        return null;
      }
    },
  });

  return data ?? null;
}

/**
 * Totals for every rider vault in one query, keyed by lowercased vault address.
 *
 * Why one shared query instead of one read per rider: the /stake selector swaps
 * riders constantly, and a per-rider read meant a fresh eth_call on every swap —
 * on a public RPC that rate-limits datacenter IPs. Reading all vaults in a single
 * flight warms the whole roster, so switching riders never hits the network again
 * (and never flashes a loading state) inside the staleTime window.
 *
 * A vault whose read fails is simply omitted, so one bad address can't blank the
 * others — the caller sees null for it, same as "no vault yet".
 */
function useVaultTotals() {
  return useQuery({
    queryKey: ["vault-totals"],
    staleTime: 300_000,
    queryFn: async (): Promise<Record<string, number>> => {
      const vaults = RIDER_LIST.map((r) => r.vault).filter((v): v is Address => !!v);
      const results = await Promise.allSettled(
        vaults.map((address) => client.readContract({ address, abi, functionName: "totalAssets" })),
      );
      const totals: Record<string, number> = {};
      results.forEach((res, i) => {
        // USDC: 6 decimals.
        if (res.status === "fulfilled") {
          totals[vaults[i].toLowerCase()] = Number(formatUnits(res.value, 6));
        }
      });
      return totals;
    },
  });
}

export function useVaultTotal(vault?: Address): number | null {
  const { data } = useVaultTotals();
  if (!vault) return null;
  return data?.[vault.toLowerCase()] ?? null;
}
