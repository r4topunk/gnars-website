"use client";

import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { FaEthereum } from "react-icons/fa";
import type { TVItem } from "./types";
import { isGnarly, isGnarsPaired } from "./utils";

interface TVVideoCardProps {
  item: TVItem;
  isBuying: boolean;
  isConnected: boolean;
  supportAmount: string;
  showAmountMenu: boolean;
  onBuy: (coinAddress: string, title: string) => void;
  onAmountMenuToggle: (show: boolean) => void;
  onAmountSelect: (amount: string) => void;
}

const AMOUNT_OPTIONS = [
  { label: "0.00042 ETH", value: "0.00042" },
  { label: "0.00069 ETH", value: "0.00069" },
  { label: "0.001 ETH", value: "0.001" },
  { label: "0.005 ETH", value: "0.005" },
  { label: "0.01 ETH", value: "0.01" },
  { label: "0.05 ETH", value: "0.05" },
];

/**
 * Info overlay for a TV video card showing title, creator, and market data
 */
export function TVVideoCardInfo({
  item,
  isBuying,
  isConnected,
  supportAmount,
  showAmountMenu,
  onBuy,
  onAmountMenuToggle,
  onAmountSelect,
}: TVVideoCardProps) {
  const isPaired = isGnarsPaired(item);
  const isGnarlyItem = isGnarly(item);

  return (
    <div className="pointer-events-none absolute left-3 right-3 md:left-5 md:right-5 bottom-3 md:bottom-5 bg-black/40 md:bg-black/60 p-2.5 md:p-4 rounded-xl md:rounded-2xl backdrop-blur-md md:backdrop-blur-lg border border-white/5 md:border-white/10">
      {/* Title and Support Button */}
      <div className="flex items-start justify-between gap-2 md:gap-4 mb-2 md:mb-3">
        <p className="text-base md:text-lg font-bold flex-1 leading-tight md:leading-snug">
          {item.title}
        </p>
        <div className="flex flex-col items-end gap-1 md:gap-1.5">
          {item.coinAddress && (
            <div className="pointer-events-auto relative">
              {showAmountMenu && (
                <div className="absolute right-0 bottom-full mb-2 md:mb-3 w-40 md:w-44 rounded-xl md:rounded-2xl bg-black/95 backdrop-blur-xl shadow-2xl border border-white/20 overflow-hidden z-50">
                  {AMOUNT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        onAmountSelect(option.value);
                        onAmountMenuToggle(false);
                      }}
                      className="w-full px-3 md:px-4 py-2 md:py-2.5 text-left text-xs md:text-sm font-semibold text-white hover:bg-white/15 active:bg-white/25 transition-all border-b border-white/10 last:border-b-0"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex rounded-full bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-black overflow-hidden shadow-lg md:shadow-xl hover:shadow-xl md:hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all">
                <button
                  onClick={() => onBuy(item.coinAddress!, item.title)}
                  disabled={isBuying || !isConnected}
                  className="px-3 md:px-5 py-1.5 md:py-2.5 text-xs md:text-sm font-extrabold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 md:gap-2"
                >
                  {isBuying ? (
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <div className="h-3.5 w-3.5 md:h-4 md:w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                      <span>Buying...</span>
                    </div>
                  ) : (
                    <>
                      <span className="whitespace-nowrap">Buy {supportAmount}</span>
                      <FaEthereum className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </>
                  )}
                </button>
                <button
                  onClick={() => onAmountMenuToggle(!showAmountMenu)}
                  disabled={isBuying || !isConnected}
                  className="px-2 md:px-2.5 border-l border-black/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronDown className="h-3 w-3 md:h-3.5 md:w-3.5" />
                </button>
              </div>
            </div>
          )}
          {/* Special Badges below button */}
          {(isGnarlyItem || isPaired) && (
            <div className="flex gap-1 md:gap-1.5">
              {isGnarlyItem && (
                <div className="inline-flex items-center gap-0.5 md:gap-1 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full bg-amber-500/20 border border-amber-400/40">
                  <span className="text-amber-300 text-[9px] md:text-[10px] font-extrabold tracking-tight">
                    ⚡ GNARLY
                  </span>
                </div>
              )}
              {isPaired && (
                <div className="inline-flex items-center gap-0.5 md:gap-1 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full bg-amber-500/20 border border-amber-400/40">
                  <span className="text-amber-300 text-[9px] md:text-[10px] font-extrabold tracking-tight">
                    🤘 PAIRED
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Creator Info */}
      <div className="flex items-center gap-2 md:gap-2.5 mb-2 md:mb-3">
        {item.creatorAvatar ? (
          <Image
            src={item.creatorAvatar}
            alt={item.creatorName || "Creator"}
            width={20}
            height={20}
            className="rounded-full w-5 h-5 md:w-6 md:h-6 object-cover ring-1 ring-white/20"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.nextElementSibling?.classList.remove("hidden");
            }}
          />
        ) : null}
        <div
          className={`w-5 h-5 md:w-6 md:h-6 rounded-full bg-white/15 flex-shrink-0 ring-1 ring-white/20 ${item.creatorAvatar ? "hidden" : ""}`}
        />
        <p className="text-xs md:text-sm font-medium text-white/80 truncate">
          {item.creatorName || `${item.creator.slice(0, 6)}…${item.creator.slice(-4)}`}
        </p>
      </div>

      {/* Market Cap with ATH Progress Bar */}
      {item.marketCap !== undefined && item.allTimeHigh !== undefined && (
        <MarketCapProgress
          marketCap={item.marketCap}
          allTimeHigh={item.allTimeHigh}
          isPaired={isPaired}
        />
      )}
    </div>
  );
}

interface MarketCapProgressProps {
  marketCap: number;
  allTimeHigh: number;
  isPaired: boolean;
}

function MarketCapProgress({ marketCap, allTimeHigh, isPaired }: MarketCapProgressProps) {
  const percentage = Math.min((marketCap / allTimeHigh) * 100, 100);
  const isNearATH = percentage >= 95;

  const barColor = isPaired ? "bg-[#fbbf24]" : "bg-[#22c55e]";
  const glowColor = isPaired ? "rgba(251, 191, 36, 1)" : "rgba(34, 197, 94, 1)";

  return (
    <div className="space-y-1 md:space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 md:gap-1.5">
          <span className="text-[#22c55e] text-xs md:text-sm font-bold">▲</span>
          <span className="text-white text-xs md:text-sm font-bold">
            ${Math.round(marketCap).toLocaleString()}
          </span>
        </div>
        <span className="text-white/60 text-[10px] md:text-xs font-medium">
          ATH ${Math.round(allTimeHigh).toLocaleString()}
        </span>
      </div>
      <div className="relative h-1.5 md:h-2 bg-white/10 overflow-hidden rounded-sm">
        <div
          className={`absolute inset-y-0 left-0 transition-all duration-500 ${barColor} ${isNearATH ? "animate-pulse" : ""}`}
          style={{
            width: `${percentage}%`,
            filter: isNearATH
              ? `drop-shadow(0 0 12px ${glowColor}) drop-shadow(0 0 24px ${glowColor})`
              : `drop-shadow(0 0 4px ${glowColor.replace("1)", "0.6)")})`,
            boxShadow: isNearATH
              ? `0 0 40px ${glowColor}, 0 0 80px ${glowColor}`
              : `0 0 12px ${glowColor.replace("1)", "0.5)")}`,
          }}
        />
      </div>
    </div>
  );
}
