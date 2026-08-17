"use client";

// Read-only view of the Gnars Builder subnet on Base: the wallet's staked MOR +
// unlock time + spendable MOR balance, and the subnet's total staked. Nothing
// here moves money.
import { useEffect, useState } from "react";
import { createPublicClient, fallback, formatUnits, http, type Address } from "viem";
import { base } from "viem/chains";
import {
  BASE_RPCS,
  BUILDERS,
  buildersAbi,
  erc20AbiMin,
  GNARS_SUBNET_ID,
  MOR_BASE,
  MOR_DECIMALS,
  SUBNET_WITHDRAW_LOCK_SECONDS,
  type GnarsSubnetPosition,
} from "@/lib/morpheus-builder";

const client = createPublicClient({
  chain: base,
  transport: fallback(BASE_RPCS.map((u) => http(u))),
});

/**
 * `loading` until the subnet read lands, then `ready`; `error` only if it never
 * landed at all. Callers need this because `totalStaked` starts at 0, and a UI
 * that renders that 0 as a real figure states "nobody has staked" while the RPC
 * is still in flight — a confident wrong number, which is worse than a spinner.
 *
 * Once `ready`, a later failed refetch keeps `ready` and the last good figure
 * rather than blanking a number the visitor already read.
 */
export type GnarsSubnetStatus = "loading" | "ready" | "error";

export type GnarsSubnetState = {
  position: GnarsSubnetPosition | null;
  /** Total MOR staked across all backers of the subnet. */
  totalStaked: number;
  status: GnarsSubnetStatus;
};

export function useGnarsSubnet(wallet?: string, nonce = 0): GnarsSubnetState {
  const [state, setState] = useState<GnarsSubnetState>({
    position: null,
    totalStaked: 0,
    status: "loading",
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const subnetData = await client.readContract({
          address: BUILDERS,
          abi: buildersAbi,
          functionName: "subnetsData",
          args: [GNARS_SUBNET_ID],
        });
        const totalStaked = Number(formatUnits(subnetData[1], MOR_DECIMALS));
        if (!cancelled) setState((s) => ({ ...s, totalStaked, status: "ready" }));

        if (!wallet) {
          if (!cancelled) setState((s) => ({ ...s, position: null }));
          return;
        }

        const [user, bal] = await Promise.all([
          client.readContract({
            address: BUILDERS,
            abi: buildersAbi,
            functionName: "usersData",
            args: [wallet as Address, GNARS_SUBNET_ID],
          }),
          client.readContract({
            address: MOR_BASE,
            abi: erc20AbiMin,
            functionName: "balanceOf",
            args: [wallet as Address],
          }),
        ]);
        const lastDeposit = Number(user[0]);
        const deposited = user[2];
        const position: GnarsSubnetPosition = {
          staked: Number(formatUnits(deposited, MOR_DECIMALS)),
          unlockAt: deposited > BigInt(0) ? lastDeposit + SUBNET_WITHDRAW_LOCK_SECONDS : 0,
          walletMor: Number(formatUnits(bal, MOR_DECIMALS)),
        };
        if (!cancelled) setState((s) => ({ ...s, position }));
      } catch {
        // Only downgrade to `error` if we never had a good read. A wallet-scoped
        // failure after the subnet total already landed must not blank it.
        if (!cancelled)
          setState((s) => ({
            ...s,
            position: null,
            status: s.status === "ready" ? "ready" : "error",
          }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [wallet, nonce]);

  return state;
}
