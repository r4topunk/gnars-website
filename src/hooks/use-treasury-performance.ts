import { useQuery } from "@tanstack/react-query";
import { GNARS_ADDRESSES } from "@/lib/config";

export type TreasuryPoint = {
  month: string;
  eth: number;
  usdc: number;
};

const DEFAULT_TREASURY_TREND: TreasuryPoint[] = [
  { month: "M1", eth: 0, usdc: 0 },
  { month: "M2", eth: 0, usdc: 0 },
  { month: "M3", eth: 0, usdc: 0 },
  { month: "M4", eth: 0, usdc: 0 },
  { month: "M5", eth: 0, usdc: 0 },
  { month: "M6", eth: 0, usdc: 0 },
];

type TreasuryPerformanceResponse = {
  points?: Array<{
    month?: string;
    eth?: number;
    usdc?: number;
  }>;
};

async function fetchTreasuryPerformance(months: number): Promise<TreasuryPoint[]> {
  const url = `/api/treasury/performance?months=${months}&address=${GNARS_ADDRESSES.treasury}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error("Failed to fetch treasury performance");
  }
  
  const data: TreasuryPerformanceResponse = await response.json();
  const rows = Array.isArray(data?.points) ? data.points : [];
  
  if (!rows.length) {
    return DEFAULT_TREASURY_TREND;
  }
  
  return rows.map((r) => {
    const raw = String(r.month ?? "");
    let label = raw;
    
    try {
      const [yy, mm] = raw.split("-").map((n) => parseInt(n, 10));
      if (Number.isFinite(yy) && Number.isFinite(mm)) {
        const d = new Date(Date.UTC(yy, (mm || 1) - 1, 1));
        label = d.toLocaleString("en-US", { month: "short" });
      }
    } catch {
      // Keep original label
    }
    
    const ethVal = Number(r.eth ?? 0) || 0;
    const usdcThousands = (Number(r.usdc ?? 0) || 0) / 1000; // normalize to K for visibility
    
    return {
      month: label,
      eth: ethVal,
      usdc: usdcThousands,
    };
  });
}

export function useTreasuryPerformance(months: number = 6) {
  return useQuery({
    queryKey: ["treasury-performance", months, GNARS_ADDRESSES.treasury],
    queryFn: () => fetchTreasuryPerformance(months),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
