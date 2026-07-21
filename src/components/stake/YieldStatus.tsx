"use client";

import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import type { StakeYields } from "@/services/yields";

async function fetchYields(): Promise<StakeYields> {
  const res = await fetch("/api/yields");
  if (!res.ok) throw new Error("failed to load yields");
  return res.json();
}

function StatusRow({
  dot,
  asset,
  source,
  apy,
  suffix,
  loading,
}: {
  dot: string;
  asset: string;
  source: string | undefined;
  apy: number | null | undefined;
  suffix: string;
  loading: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={cn("size-2 shrink-0 rounded-full", dot)} />
      <span className="font-semibold">{asset}</span>
      {source ? <span className="text-xs text-muted-foreground">{source}</span> : null}
      <span className="ml-auto tabular-nums">
        {loading || apy == null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <>
            <span className="font-bold">{apy.toFixed(2)}%</span>{" "}
            <span className="text-xs font-normal text-muted-foreground">{suffix}</span>
          </>
        )}
      </span>
    </div>
  );
}

/** Live on-chain yields shown as the rider's "status" (ETH via Lido, USDC via Morpho). */
export function YieldStatus() {
  const t = useTranslations("stake");
  const { data, isLoading } = useQuery({
    queryKey: ["stake-yields"],
    queryFn: fetchYields,
    refetchInterval: 60_000,
    staleTime: 60_000,
  });

  return (
    <div className="mt-5 border-t border-border/60 pt-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
        </span>
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t("statusTitle")}
        </span>
      </div>
      <div className="space-y-2">
        <StatusRow
          dot="bg-sky-400"
          asset="ETH"
          source={data?.eth?.source}
          apy={data?.eth?.apy}
          suffix="APR"
          loading={isLoading}
        />
        <StatusRow
          dot="bg-emerald-400"
          asset="USDC"
          source={data?.usdc?.source}
          apy={data?.usdc?.apy}
          suffix="APY"
          loading={isLoading}
        />
      </div>
    </div>
  );
}
