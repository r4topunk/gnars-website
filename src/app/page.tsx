"use client";

import { useEffect, useState } from "react";
import { formatEther } from "viem";
import { ContractsList } from "@/components/contracts-list";
import {
  AuctionTrendChart,
  MemberActivityChart,
  TreasuryAllocationChart,
} from "@/components/dashboard-charts";
import { HeroSection } from "@/components/hero-section";
import { PastAuctions } from "@/components/past-auctions";
import { ProposalStatus, RecentProposals } from "@/components/recent-proposals";
import { SidebarInset } from "@/components/ui/sidebar";
import { useRecentAuctions } from "@/hooks/use-auctions";
import { GNARS_ADDRESSES } from "@/lib/config";
import { fetchDaoStats } from "@/services/dao";

// Remove mocks in favor of real data from the subgraph

export default function Home() {
  const { data: recentAuctions, isLoading } = useRecentAuctions(8);
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
      body: JSON.stringify({ method: "eth_getBalance", params: [GNARS_ADDRESSES.treasury, "latest"] }),
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
    <SidebarInset>
      <main className="flex flex-1 flex-col">
        {/* Hero Section */}
        <HeroSection
          stats={{
            totalSupply,
            members,
            treasuryValue: treasuryEth,
          }}
        />

        {/* Dashboard Grid */}
        <div className="flex flex-1 flex-col gap-6 px-6 py-4">
          {/* Recent Proposals Section */}
          <section>
            <RecentProposals limit={6} excludeStatuses={[ProposalStatus.CANCELLED]} />
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

          {/* Smart Contracts */}
          <section>
            <ContractsList />
          </section>
        </div>
      </main>
    </SidebarInset>
  );
}
