"use client";

// The DAO's cut of the rider sponsorship vaults.
//
// The performance fee is minted as vault SHARES to each rider's 0xSplits
// contract (Gnars 50 / athlete 50). The athlete can withdraw theirs whenever;
// the treasury is a Nouns Builder timelock, so its half only moves through a
// governance proposal. This card surfaces what's sitting there and starts that
// proposal from the matching template.

import { useEffect, useState } from "react";
import Link from "next/link";
import { PiggyBank, ArrowRight } from "lucide-react";
import { createPublicClient, http, fallback, formatUnits, type Address } from "viem";
import { base } from "viem/chains";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RIDER_LIST } from "@/lib/gnars-vaults";

const client = createPublicClient({
  chain: base,
  transport: fallback([
    http("https://mainnet.base.org"),
    http("https://base-rpc.publicnode.com"),
    http("https://base.drpc.org"),
  ]),
});

const abi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "convertToAssets", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "uint256" }] },
] as const;

type Row = { id: string; handle: string; vault: Address; accrued: number };

const usd = (n: number) =>
  `$${n.toLocaleString("en-US", { maximumFractionDigits: n > 0 && n < 100 ? 4 : 2 })}`;

export function SponsorshipYield() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const live = RIDER_LIST.filter((r) => r.vault && r.split);
      try {
        const out = await Promise.all(
          live.map(async (r) => {
            const shares = await client.readContract({
              address: r.vault as Address, abi, functionName: "balanceOf", args: [r.split as Address],
            });
            const accrued =
              shares === BigInt(0)
                ? 0
                : Number(
                    formatUnits(
                      await client.readContract({
                        address: r.vault as Address, abi, functionName: "convertToAssets", args: [shares],
                      }),
                      6,
                    ),
                  );
            return { id: r.id, handle: r.handle, vault: r.vault as Address, accrued };
          }),
        );
        if (!cancelled) setRows(out);
      } catch {
        if (!cancelled) setRows(null);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Nothing deployed yet — don't show an empty widget on the treasury page.
  if (RIDER_LIST.every((r) => !r.vault)) return null;

  // The split is 50/50, so the treasury's share is half of what accrued to it.
  const totalAccrued = rows?.reduce((s, r) => s + r.accrued, 0) ?? 0;
  const treasuryShare = totalAccrued / 2;

  return (
    <Card className="gap-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <PiggyBank className="h-4 w-4" /> Sponsorship yield
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="font-mono text-2xl font-bold tabular-nums">
            {rows === null ? "—" : usd(treasuryShare)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Treasury&apos;s share of the yield accrued in the rider vaults. Depositors keep their
            principal — only the yield is split.
          </p>
        </div>

        {rows && rows.length > 0 && (
          <div className="space-y-1.5">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-xs">
                <span className="capitalize text-muted-foreground">{r.id}</span>
                <span className="font-mono tabular-nums">{usd(r.accrued / 2)}</span>
              </div>
            ))}
          </div>
        )}

        {treasuryShare > 0 ? (
          <Button asChild size="sm" variant="outline" className="w-full">
            <Link href="/propose?template=sponsorship-yield-claim">
              Start claim proposal <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            Nothing to claim yet — the fee accrues as the vaults earn.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
