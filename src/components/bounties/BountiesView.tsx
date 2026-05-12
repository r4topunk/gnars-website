"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { PlusCircle, Search, X } from "lucide-react";
import { formatEther } from "viem";
import { BountyGrid } from "@/components/bounties/BountyGrid";
import { CreateBountyModal } from "@/components/bounties/CreateBountyModal";
import { PendingWithdrawalBanner } from "@/components/bounties/PendingWithdrawalBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatEthToUsd, useEthPrice } from "@/hooks/use-eth-price";
import { usePoidhBounties } from "@/hooks/usePoidhBounties";
import { toIntlLocale } from "@/lib/i18n/format";
import type { PoidhBounty } from "@/types/poidh";

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  skate: ["skate", "skateboard", "kickflip", "grind", "ollie", "flip", "trick"],
  surf: ["surf", "wave", "barrel", "tube", "ocean", "beach"],
  parkour: ["parkour", "freerun", "vault", "flip", "jump"],
  weed: ["weed", "cannabis", "joint", "blunt", "420", "smoke", "kush"],
};

const BANNER_IMAGES = [
  {
    src: "https://images.hive.blog/DQmZtLJgBNArPUScjdJzf4bn56wdn6BZ3Nwwd8rPoUFKc1f/Captura%20de%20Tela%202026-04-24%20a%CC%80s%2013.06.11.png",
    fit: "contain",
  },
  {
    src: "https://img.paragraph.com/cdn-cgi/image/format=auto,width=1080,quality=85/https://storage.googleapis.com/papyrus_images/44c796ba01b6ab07b5ad419da0dc4195.jpg",
    fit: "cover",
  },
  {
    src: "https://images.hive.blog/DQmRam7hFrAUvstnn4aodL58w7oqgEWLsZGK3Qh5DHrgqp1/Captura%20de%20Tela%202026-04-24%20a%CC%80s%2013.15.40.png",
    fit: "cover",
  },
] as const;

interface BountiesViewProps {
  initialBounties: PoidhBounty[];
}

export function BountiesView({ initialBounties }: BountiesViewProps) {
  const t = useTranslations("bounties");
  const locale = useLocale();
  const [status, setStatus] = useState<"open" | "closed" | "voting" | "all">("open");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGnarly] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("skate");

  const CATEGORIES = [
    { key: "all", label: t("filters.all") },
    { key: "skate", label: t("filters.skate") },
    { key: "surf", label: t("filters.surf") },
    { key: "parkour", label: t("filters.parkour") },
    { key: "weed", label: t("filters.weed") },
  ] as const;

  const { data, isLoading, error } = usePoidhBounties({
    status,
    filterGnarly,
    // Only use initialData for the default "open" status
    initialData:
      status === "open" ? { bounties: initialBounties, total: initialBounties.length } : undefined,
  });

  const { ethPrice } = useEthPrice();

  const filteredBounties = useMemo(() => {
    return (
      data?.bounties.filter((bounty) => {
        const text = `${bounty.title} ${bounty.description}`.toLowerCase();

        if (searchQuery.trim()) {
          const query = searchQuery.trim().toLowerCase();
          if (!text.includes(query)) return false;
        }

        if (categoryFilter === "all") return true;
        return CATEGORY_KEYWORDS[categoryFilter]?.some((keyword) => text.includes(keyword));
      }) || []
    );
  }, [data?.bounties, searchQuery, categoryFilter]);

  const totalValue = useMemo(() => {
    const totalWei = filteredBounties.reduce((sum, bounty) => {
      return sum + BigInt(bounty.amount ?? 0);
    }, 0n);
    const totalEth = parseFloat(formatEther(totalWei));
    const totalUsd = formatEthToUsd(totalEth, ethPrice, toIntlLocale(locale));
    return { eth: totalEth.toFixed(4), usd: totalUsd, count: filteredBounties.length };
  }, [filteredBounties, ethPrice, locale]);

  const poolLabel = (() => {
    if (status === "open") return t("stats.openPool");
    if (status === "closed") return t("stats.closedPool");
    if (status === "voting") return t("stats.votingPool");
    return t("stats.totalPool");
  })();

  const bountiesLabel = (() => {
    if (status === "open") return t("stats.openBounties");
    if (status === "closed") return t("stats.closedBounties");
    if (status === "voting") return t("stats.votingBounties");
    return t("stats.bounties");
  })();

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="space-y-6">
        <PendingWithdrawalBanner />
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("description")}</p>
          </div>
          <CreateBountyModal>
            <Button className="shrink-0">
              <PlusCircle className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{t("cta.createBounty")}</span>
              <span className="sm:hidden">{t("cta.create")}</span>
            </Button>
          </CreateBountyModal>
        </div>

        <div className="overflow-hidden rounded-3xl border border-border bg-muted/30">
          <div className="grid grid-cols-1 gap-px bg-border md:grid-cols-3">
            {BANNER_IMAGES.map(({ src, fit }, index) => (
              <div
                key={src}
                className="flex h-[180px] items-center justify-center bg-background/40 md:h-[210px]"
              >
                <img
                  src={src}
                  alt={`Gnars bounty banner image ${index + 1}`}
                  className={`h-full w-full ${fit === "cover" ? "object-cover" : "object-contain"}`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Pool stats */}
        {data && !isLoading && (
          <div className="grid grid-cols-3 gap-4 rounded-lg border border-border bg-muted/30 px-5 py-4">
            <div>
              <div className="text-2xl font-bold tabular-nums tracking-tight">
                {totalValue.eth}
                <span className="text-base font-semibold text-muted-foreground ml-1.5">ETH</span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{poolLabel}</div>
            </div>
            {ethPrice > 0 && (
              <div>
                <div className="text-2xl font-bold tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
                  {totalValue.usd}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{t("stats.usdValue")}</div>
              </div>
            )}
            <div>
              <div className="text-2xl font-bold tabular-nums tracking-tight">
                {totalValue.count}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{bountiesLabel}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("filters.search")}
              className="pl-9"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Tabs value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <TabsList>
                <TabsTrigger value="open">{t("filters.open")}</TabsTrigger>
                <TabsTrigger value="voting">{t("filters.voting")}</TabsTrigger>
                <TabsTrigger value="closed">{t("filters.closed")}</TabsTrigger>
                <TabsTrigger value="all">{t("filters.all")}</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="h-5 w-px bg-border hidden sm:block" />
            <Tabs value={categoryFilter} onValueChange={(v) => setCategoryFilter(v)}>
              <TabsList>
                {CATEGORIES.map(({ key, label }) => (
                  <TabsTrigger key={key} value={key}>
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Grid */}
        <BountyGrid bounties={filteredBounties} isLoading={isLoading} error={error} />

        <div className="rounded-3xl border border-border bg-muted/30 p-6 md:p-8">
          <div className="max-w-4xl space-y-5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t("manifesto.sectionLabel")}
              </div>
            </div>
            <div className="space-y-4 text-sm leading-7 text-muted-foreground md:text-base">
              <p>{t("manifesto.p1")}</p>
              <div className="space-y-2">
                <p className="text-foreground">{t("manifesto.howItWorksLabel")}</p>
                <p>{t("manifesto.howItWorksBody")}</p>
              </div>
              <p className="pt-2 text-xs text-muted-foreground/80">
                Powered by{" "}
                <a
                  href="https://poidh.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-4 decoration-muted-foreground/40 hover:decoration-foreground transition-colors"
                >
                  POIDH
                </a>{" "}
                — Pics or it didn&apos;t happen. Bounties are escrowed onchain by the POIDH V3
                contract.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
