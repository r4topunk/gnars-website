"use client";

import { useEffect, useState } from "react";
import { formatEther } from "viem";
import { PastAuctions } from "@/components/auctions/PastAuctions";
import { FAQ } from "@/components/common/FAQ";
import { ContractsList } from "@/components/contracts-list";
import { HeroSection } from "@/components/hero-section";
import { RecentProposals } from "@/components/proposals/recent/RecentProposals";
import { Proposal } from "@/components/proposals/types";
import {
  AuctionTrendChart,
  MemberActivityChart,
  TreasuryAllocationChart,
} from "@/components/treasury/DashboardCharts";
import { useRecentAuctions } from "@/hooks/use-auctions";
import { useIsMobile } from "@/hooks/use-mobile";
import { GNARS_ADDRESSES } from "@/lib/config";
import { ProposalStatus } from "@/lib/schemas/proposals";
import { fetchDaoStats } from "@/services/dao";

interface HomeClientComponentsProps {
  proposals: Proposal[];
}

export function HomeClientComponents({ proposals }: HomeClientComponentsProps) {
  const isMobile = useIsMobile();
  const recentAuctionsLimit = isMobile ? 3 : 8;
  const { data: recentAuctions, isLoading } = useRecentAuctions(recentAuctionsLimit);
  const [totalSupply, setTotalSupply] = useState<number>(0);
  const [members, setMembers] = useState<number>(0);
  const [treasuryEth, setTreasuryEth] = useState<string>("0");

  useEffect(() => {
    let active = true;
    fetchDaoStats()
      .then((s) => {
        if (!active) return;
        setTotalSupply(s.totalSupply);
        setMembers(s.ownerCount);
      })
      .catch(() => {
        if (!active) return;
        setTotalSupply(0);
        setMembers(0);
      });

    // Fetch ETH balance of treasury via our API (Alchemy passthrough)
    fetch("/api/alchemy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "eth_getBalance",
        params: [GNARS_ADDRESSES.treasury, "latest"],
      }),
    })
      .then(async (r) => (r.ok ? r.json() : Promise.reject(new Error("alchemy"))))
      .then((j) => {
        if (!active) return;
        const hex = typeof j?.result === "string" ? j.result : "0x0";
        try {
          const wei = BigInt(hex);
          const ethStr = formatEther(wei);
          const eth = parseFloat(ethStr);
          setTreasuryEth(Number.isFinite(eth) ? eth.toFixed(1) : "0");
        } catch {
          setTreasuryEth("0");
        }
      })
      .catch(() => {
        if (!active) return;
        setTreasuryEth("0");
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      {/* Hero Section */}
      <HeroSection
        stats={{
          totalSupply,
          members,
          treasuryValue: treasuryEth,
        }}
      />

      {/* Dashboard Grid */}
      <div className="flex flex-1 flex-col gap-6 px-4 py-4">
        {/* Recent Proposals Section */}
        <section>
          <RecentProposals
            proposals={proposals}
            limit={6}
            excludeStatuses={[ProposalStatus.CANCELLED]}
          />
        </section>

        {/* Analytics Charts Row */}
        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <AuctionTrendChart />
          <TreasuryAllocationChart />
          <MemberActivityChart />
        </section>

        {/* Recent Auctions */}
        <section>
          <PastAuctions auctions={recentAuctions} loading={isLoading} />
        </section>

        {/* FAQ Section */}
        <section>
          <FAQ />
        </section>

        {/* Smart Contracts */}
        <section>
          <ContractsList />
        </section>
      </div>
    </>
  );
}
