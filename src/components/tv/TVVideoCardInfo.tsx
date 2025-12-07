"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown, Eye, EyeOff, Info } from "lucide-react";
import { FaEthereum } from "react-icons/fa";
import type { TVItem } from "./types";
import { isDroposal, isGnarly, isGnarsPaired, isSkatehive } from "./utils";

interface TVVideoCardProps {
  item: TVItem;
  isBuying: boolean;
  isConnected: boolean;
  supportAmount: string;
  showAmountMenu: boolean;
  mintQuantity: number;
  onBuy: (coinAddress: string, title: string) => void;
  onMint: (item: TVItem, quantity: number) => void;
  onAmountMenuToggle: (show: boolean) => void;
  onAmountSelect: (amount: string) => void;
  onQuantitySelect: (quantity: number) => void;
}

const AMOUNT_OPTIONS = [
  { label: "0.00042 ETH", value: "0.00042" },
  { label: "0.00069 ETH", value: "0.00069" },
  { label: "0.001 ETH", value: "0.001" },
  { label: "0.005 ETH", value: "0.005" },
  { label: "0.01 ETH", value: "0.01" },
  { label: "0.05 ETH", value: "0.05" },
];

const QUANTITY_OPTIONS = [1, 2, 3, 4, 5];

const ZORA_PROTOCOL_FEE = 0.000777;

/**
 * Info overlay for a TV video card showing title, creator, and market data
 */
export function TVVideoCardInfo({
  item,
  isBuying,
  isConnected,
  supportAmount,
  showAmountMenu,
  mintQuantity,
  onBuy,
  onMint,
  onAmountMenuToggle,
  onAmountSelect,
  onQuantitySelect,
}: TVVideoCardProps) {
  const [isHidden, setIsHidden] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const isPaired = isGnarsPaired(item);
  const isGnarlyItem = isGnarly(item);
  const isSkatehiveItem = isSkatehive(item);
  const isDroposalItem = isDroposal(item);

  // Calculate droposal pricing
  const droposalPrice = item.priceEth ? parseFloat(item.priceEth) : 0;
  const isFreeDroposal = droposalPrice === 0;
  const totalDroposalPrice = (droposalPrice + ZORA_PROTOCOL_FEE) * mintQuantity;

  // Hidden state - show only a small toggle button
  if (isHidden) {
    return (
      <button
        onClick={() => setIsHidden(false)}
        className="pointer-events-auto absolute left-3 md:left-5 bottom-3 md:bottom-5 p-2.5 md:p-3 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white/60 hover:text-white hover:bg-black/70 transition-all shadow-lg"
        aria-label="Show info"
      >
        <Eye className="w-5 h-5 md:w-6 md:h-6" />
      </button>
    );
  }

  return (
    <div className="pointer-events-none absolute left-3 right-3 md:left-6 md:right-6 bottom-3 md:bottom-6 bg-black/50 md:bg-black/60 p-3 md:p-5 rounded-2xl backdrop-blur-lg border border-white/10 shadow-2xl">
      {/* Buy/Mint button - positioned at top-right inside card */}
      <div className="pointer-events-auto absolute top-2 right-2 md:top-3 md:right-3">
        {/* Droposal Mint Button */}
        {isDroposalItem && (
          <div className="relative">
            {showAmountMenu && (
              <div className="absolute right-0 top-full mt-2 w-32 md:w-36 rounded-xl md:rounded-2xl bg-black/95 backdrop-blur-xl shadow-2xl border border-white/20 overflow-hidden z-50">
                {QUANTITY_OPTIONS.map((qty) => (
                  <button
                    key={qty}
                    onClick={() => {
                      onQuantitySelect(qty);
                      onAmountMenuToggle(false);
                    }}
                    className={`w-full px-3 md:px-4 py-2 md:py-2.5 text-left text-xs md:text-sm font-semibold text-white hover:bg-white/15 active:bg-white/25 transition-all border-b border-white/10 last:border-b-0 ${mintQuantity === qty ? "bg-white/10" : ""}`}
                  >
                    {qty} {qty === 1 ? "NFT" : "NFTs"}
                  </button>
                ))}
              </div>
            )}
            <div className="flex rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 text-white overflow-hidden shadow-lg md:shadow-xl hover:shadow-xl md:hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all">
              <button
                onClick={() => onMint(item, mintQuantity)}
                disabled={isBuying || !isConnected}
                className="px-3 md:px-5 py-1.5 md:py-2.5 text-xs md:text-sm font-extrabold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 md:gap-2"
              >
                {isBuying ? (
                  <div className="flex items-center gap-1.5 md:gap-2">
                    <div className="h-3.5 w-3.5 md:h-4 md:w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Minting...</span>
                  </div>
                ) : isFreeDroposal ? (
                  <span className="whitespace-nowrap">Free Mint ×{mintQuantity}</span>
                ) : (
                  <>
                    <span className="whitespace-nowrap">Mint ×{mintQuantity}</span>
                    <FaEthereum className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </>
                )}
              </button>
              <button
                onClick={() => onAmountMenuToggle(!showAmountMenu)}
                disabled={isBuying || !isConnected}
                className="px-2 md:px-2.5 border-l border-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronDown className="h-3 w-3 md:h-3.5 md:w-3.5" />
              </button>
            </div>
          </div>
        )}
        {/* Coin Buy Button */}
        {!isDroposalItem && item.coinAddress && (
          <div className="relative">
            {showAmountMenu && (
              <div className="absolute right-0 top-full mt-2 w-40 md:w-44 rounded-xl md:rounded-2xl bg-black/95 backdrop-blur-xl shadow-2xl border border-white/20 overflow-hidden z-50">
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
      </div>

      {/* Title */}
      <p className="text-base md:text-xl font-bold leading-tight pr-24 md:pr-32 truncate">
        {item.title}
      </p>

      {/* Creator row */}
      <div className="flex items-center gap-2 mt-1.5 mb-2">
        {item.creatorAvatar ? (
          <Image
            src={item.creatorAvatar}
            alt={item.creatorName || "Creator"}
            width={20}
            height={20}
            className="rounded-full w-5 h-5 object-cover ring-1 ring-white/20 flex-shrink-0"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-white/15 flex-shrink-0 ring-1 ring-white/20" />
        )}
        <p className="text-xs md:text-sm text-white/70 truncate">
          {item.creatorName || `${item.creator.slice(0, 6)}…${item.creator.slice(-4)}`}
        </p>
      </div>

      {/* Market Cap Progress Bar - shown in main view for coins */}
      {!isDroposalItem && item.marketCap !== undefined && item.allTimeHigh !== undefined && (
        <div className="mb-3">
          <MarketCapProgress
            marketCap={item.marketCap}
            allTimeHigh={item.allTimeHigh}
            isPaired={isPaired}
          />
        </div>
      )}

      {/* Droposal price row */}
      {isDroposalItem && (
        <div className="mb-3">
          <span className="text-indigo-300 text-xs md:text-sm font-bold">
            {isFreeDroposal ? "Free Mint" : `${droposalPrice.toFixed(4)} ETH per NFT`}
          </span>
        </div>
      )}

      {/* Control buttons row - at bottom right */}
      <div className="flex items-center justify-end gap-2">
        {/* Special badges - show GNARLY/PAIRED/SKATEHIVE inline */}
        {(isGnarlyItem || isPaired || isSkatehiveItem) && !isDroposalItem && (
          <div className="flex gap-1 mr-auto">
            {isSkatehiveItem && (
              <div className="inline-flex items-center px-1.5 md:px-2 py-0.5 md:py-1 rounded-full bg-green-500/20 border border-green-400/40">
                <span className="text-green-300 text-[9px] md:text-[10px] font-extrabold tracking-tight">
                  🛹 SKATEHIVE
                </span>
              </div>
            )}
            {isGnarlyItem && (
              <div className="inline-flex items-center px-1.5 md:px-2 py-0.5 md:py-1 rounded-full bg-amber-500/20 border border-amber-400/40">
                <span className="text-amber-300 text-[9px] md:text-[10px] font-extrabold tracking-tight">
                  ⚡ GNARLY
                </span>
              </div>
            )}
            {isPaired && (
              <div className="inline-flex items-center px-1.5 md:px-2 py-0.5 md:py-1 rounded-full bg-amber-500/20 border border-amber-400/40">
                <span className="text-amber-300 text-[9px] md:text-[10px] font-extrabold tracking-tight">
                  🤘 PAIRED
                </span>
              </div>
            )}
          </div>
        )}
        {/* Details/Hide controls */}
        <div className="pointer-events-auto flex gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 md:p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
            aria-label={isExpanded ? "Collapse details" : "Show details"}
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 md:w-4 md:h-4" />
            ) : (
              <Info className="w-3.5 h-3.5 md:w-4 md:h-4" />
            )}
          </button>
          <button
            onClick={() => setIsHidden(true)}
            className="p-1.5 md:p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
            aria-label="Hide info"
          >
            <EyeOff className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Details Section */}
      {isExpanded && (
        <>
          {/* Droposal Pricing Info */}
          {isDroposalItem && (
            <DroposalPriceInfo
              priceEth={droposalPrice}
              quantity={mintQuantity}
              totalPrice={totalDroposalPrice}
              isFree={isFreeDroposal}
            />
          )}

          {/* Droposal Description */}
          {isDroposalItem && item.description && (
            <div className="mt-2 pt-2 border-t border-white/10">
              <p className="text-xs md:text-sm text-white/70 leading-relaxed line-clamp-3">
                {item.description}
              </p>
            </div>
          )}

          {/* Additional Details */}
          <div className="mt-2 pt-2 border-t border-white/10 space-y-1.5">
            {/* Token Standard */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/50">Type</span>
              {isDroposalItem ? (
                <span className="text-indigo-300 font-medium">🎨 NFT (ERC-721)</span>
              ) : item.coinAddress ? (
                <span className="text-emerald-300 font-medium">🪙 Coin (ERC-20)</span>
              ) : (
                <span className="text-white/50">Unknown</span>
              )}
            </div>
            {/* Symbol */}
            {item.symbol && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/50">Symbol</span>
                <span className="text-white font-medium">${item.symbol}</span>
              </div>
            )}
            {/* Token Holders (coins only) */}
            {!isDroposalItem && item.uniqueHolders !== undefined && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/50">Holders</span>
                <span className="text-white font-medium">
                  {item.uniqueHolders.toLocaleString()}
                </span>
              </div>
            )}
            {/* ATH (coins only) */}
            {!isDroposalItem && item.allTimeHigh !== undefined && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/50">All-Time High</span>
                <span className="text-white font-medium">
                  ${Math.round(item.allTimeHigh).toLocaleString()}
                </span>
              </div>
            )}
            {/* Contract Address */}
            {(item.coinAddress || item.tokenAddress) && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/50">Contract</span>
                <a
                  href={`https://basescan.org/address/${item.coinAddress || item.tokenAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pointer-events-auto text-blue-400 hover:text-blue-300 font-mono transition-colors"
                >
                  {(item.coinAddress || item.tokenAddress)?.slice(0, 6)}…
                  {(item.coinAddress || item.tokenAddress)?.slice(-4)}
                </a>
              </div>
            )}
            {/* Proposal Number (droposals) */}
            {isDroposalItem && item.proposalNumber && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/50">Proposal</span>
                <a
                  href={`/droposals/${item.proposalNumber}`}
                  className="pointer-events-auto text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  #{item.proposalNumber}
                </a>
              </div>
            )}
          </div>
        </>
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

interface DroposalPriceInfoProps {
  priceEth: number;
  quantity: number;
  totalPrice: number;
  isFree: boolean;
}

function DroposalPriceInfo({ priceEth, quantity, totalPrice, isFree }: DroposalPriceInfoProps) {
  return (
    <div className="space-y-1 md:space-y-1.5">
      <div className="flex items-center gap-1.5 md:gap-2">
        {isFree ? (
          <span className="text-indigo-300 text-xs md:text-sm font-bold">Free Mint</span>
        ) : (
          <>
            <span className="text-indigo-300 text-xs md:text-sm font-bold">
              {priceEth.toFixed(4)} ETH
            </span>
            <span className="text-white/50 text-[10px] md:text-xs">per NFT</span>
          </>
        )}
      </div>
      <div className="flex items-center justify-between text-[10px] md:text-xs">
        <span className="text-white/50">
          Total ({quantity} NFT{quantity > 1 ? "s" : ""})
        </span>
        <span className="text-white font-semibold flex items-center gap-1">
          {totalPrice.toFixed(5)} ETH
          <span className="text-white/40 text-[9px]">(incl. fee)</span>
        </span>
      </div>
    </div>
  );
}
