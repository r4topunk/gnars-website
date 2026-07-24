"use client";

// Who is backing a rider.
//
// The vault's shares are an ERC-20, but Blockscout doesn't index holders for
// these vaults (they ship without name/symbol, and its holders endpoint returns
// empty even though total_supply is right). So the address list comes from the
// vault's own Deposit/Withdraw events, and every balance is then read from the
// contract — events only tell us *who* to ask about, never how much.
//
// The performance-fee recipient (the 0xSplits contract) also holds shares,
// because the fee is minted to it. That's not a supporter, so it's flagged
// rather than hidden — it's yield already earmarked for Gnars and the athlete.

import { useEffect, useState } from "react";
import { createPublicClient, http, fallback, formatUnits, getAddress, type Address } from "viem";
import { base } from "viem/chains";

const client = createPublicClient({
  chain: base,
  transport: fallback([
    http("https://mainnet.base.org"),
    http("https://base-rpc.publicnode.com"),
    http("https://base.drpc.org"),
  ]),
});

const abi = [
  { type: "function", name: "totalAssets", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "convertToAssets", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "uint256" }] },
] as const;

export type Supporter = {
  address: Address;
  /** Position in USDC. */
  assets: number;
  /** Fraction of the vault, 0–1. */
  share: number;
  /** True for the fee recipient (Gnars + athlete's accrued cut), not a depositor. */
  isFeeRecipient: boolean;
};

type DecodedParam = { name?: string; value?: unknown };
type LogItem = { decoded?: { method_call?: string; parameters?: DecodedParam[] } | null };

/** Share owners seen in the vault's Deposit/Withdraw events. */
async function ownersFromLogs(vault: Address): Promise<Address[]> {
  const res = await fetch(`https://base.blockscout.com/api/v2/addresses/${vault}/logs`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(9000),
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { items?: LogItem[] };
  const owners = new Set<string>();
  for (const log of json.items ?? []) {
    const call = log.decoded?.method_call ?? "";
    if (!call.startsWith("Deposit(") && !call.startsWith("Withdraw(")) continue;
    // ERC-4626 names the share owner `owner` in both events.
    const owner = log.decoded?.parameters?.find((p) => p.name === "owner")?.value;
    if (typeof owner === "string" && /^0x[a-fA-F0-9]{40}$/.test(owner)) {
      owners.add(getAddress(owner));
    }
  }
  return [...owners] as Address[];
}

export function useVaultSupporters(vault?: Address, feeRecipient?: Address): Supporter[] | null {
  const [supporters, setSupporters] = useState<Supporter[] | null>(null);

  useEffect(() => {
    if (!vault) {
      setSupporters(null);
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const [owners, totalAssetsRaw] = await Promise.all([
          ownersFromLogs(vault),
          client.readContract({ address: vault, abi, functionName: "totalAssets" }),
        ]);
        if (cancelled) return;

        // The fee recipient never appears in Deposit events — it's minted to.
        const candidates = new Set<Address>(owners);
        if (feeRecipient) candidates.add(getAddress(feeRecipient));

        const totalAssets = Number(formatUnits(totalAssetsRaw, 6));
        const rows = (
          await Promise.all(
            [...candidates].map(async (address) => {
              // Balances come from the contract — the events only told us who to ask.
              const shares = await client.readContract({
                address: vault, abi, functionName: "balanceOf", args: [address],
              });
              if (shares <= BigInt(0)) return null;
              const assets = Number(
                formatUnits(
                  await client.readContract({
                    address: vault, abi, functionName: "convertToAssets", args: [shares],
                  }),
                  6,
                ),
              );
              return {
                address,
                assets,
                share: totalAssets > 0 ? assets / totalAssets : 0,
                isFeeRecipient: !!feeRecipient && address.toLowerCase() === feeRecipient.toLowerCase(),
              } satisfies Supporter;
            }),
          )
        )
          .filter((r): r is Supporter => r !== null)
          .sort((a, b) => b.assets - a.assets);

        if (!cancelled) setSupporters(rows);
      } catch {
        if (!cancelled) setSupporters(null);
      }
    })();

    return () => { cancelled = true; };
  }, [vault, feeRecipient]);

  return supporters;
}
