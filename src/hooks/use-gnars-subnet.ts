"use client";

// Read-only view of the Gnars Builder subnet on Base: the wallet's staked MOR +
// unlock time + spendable MOR balance, and the subnet's total staked. Nothing
// here moves money.

import { useEffect, useState } from "react";
import { createPublicClient, http, fallback, formatUnits, type Address } from "viem";
import { base } from "viem/chains";
import {
  BUILDERS, GNARS_SUBNET_ID, MOR_BASE, MOR_DECIMALS, SUBNET_WITHDRAW_LOCK_SECONDS,
  BASE_RPCS, buildersAbi, erc20AbiMin, type GnarsSubnetPosition,
} from "@/lib/morpheus-builder";

const client = createPublicClient({ chain: base, transport: fallback(BASE_RPCS.map((u) => http(u))) });

export type GnarsSubnetState = {
  position: GnarsSubnetPosition | null;
  /** Total MOR staked across all backers of the subnet. */
  totalStaked: number;
};

export function useGnarsSubnet(wallet?: string, nonce = 0): GnarsSubnetState {
  const [state, setState] = useState<GnarsSubnetState>({ position: null, totalStaked: 0 });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const subnetData = await client.readContract({
          address: BUILDERS, abi: buildersAbi, functionName: "subnetsData", args: [GNARS_SUBNET_ID],
        });
        const totalStaked = Number(formatUnits(subnetData[1], MOR_DECIMALS));
        if (!cancelled) setState((s) => ({ ...s, totalStaked }));

        if (!wallet) { if (!cancelled) setState((s) => ({ ...s, position: null })); return; }

        const [user, bal] = await Promise.all([
          client.readContract({ address: BUILDERS, abi: buildersAbi, functionName: "usersData", args: [wallet as Address, GNARS_SUBNET_ID] }),
          client.readContract({ address: MOR_BASE, abi: erc20AbiMin, functionName: "balanceOf", args: [wallet as Address] }),
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
        if (!cancelled) setState((s) => ({ ...s, position: null }));
      }
    })();

    return () => { cancelled = true; };
  }, [wallet, nonce]);

  return state;
}
