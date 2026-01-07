"use client";

import { useMemo } from "react";
import { FaEthereum } from "react-icons/fa";
import { GNARS_CREATOR_COIN } from "@/lib/config";
import type { TVItem } from "./types";

interface PurchaseFlowChartProps {
  items: TVItem[];
  ethPerCoin: number;
  totalEth: string;
}

function shortenText(text: string, maxLength = 18): string {
  if (!text) return "Unknown";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

function CoinNode({
  item,
  ethAmount,
  x,
  y,
  index,
}: {
  item: TVItem;
  ethAmount: number;
  x: number;
  y: number;
  index: number;
}) {
  const isGnarsPaired =
    item.poolCurrencyTokenAddress != null &&
    item.poolCurrencyTokenAddress.toLowerCase() === GNARS_CREATOR_COIN.toLowerCase();

  const imageUrl = item.imageUrl || "/gnars.webp";
  const displayName = shortenText(item.title);
  const creatorName = shortenText(item.creatorName || item.creator || "Unknown");

  const clipId = `clip-coin-${index}`;

  return (
    <g>
      {/* Avatar circle with unique clip path */}
      <defs>
        <clipPath id={clipId}>
          <circle cx={x} cy={y} r="16" />
        </clipPath>
      </defs>

      <circle cx={x} cy={y} r="18" fill="#FBBF23" opacity="0.2" />

      <image
        href={imageUrl}
        x={x - 16}
        y={y - 16}
        width="32"
        height="32"
        clipPath={`url(#${clipId})`}
      />

      <circle
        cx={x}
        cy={y}
        r="16"
        fill="none"
        stroke={isGnarsPaired ? "#10b981" : "#FBBF23"}
        strokeWidth="2"
      />

      {/* Gnars badge if paired */}
      {isGnarsPaired && (
        <circle cx={x + 12} cy={y - 12} r="6" fill="#10b981">
          <title>Gnars Paired</title>
        </circle>
      )}

      {/* Label - simplified to reduce clutter */}
      <text x={x + 25} y={y - 2} className="text-[10px] sm:text-[13px] font-medium fill-foreground">
        {displayName}
      </text>
      <text x={x + 25} y={y + 11} className="text-[8px] sm:text-[11px] fill-muted-foreground">
        {creatorName}
      </text>
    </g>
  );
}

export function PurchaseFlowChart({ items, ethPerCoin, totalEth }: PurchaseFlowChartProps) {
  const validItems = useMemo(() => items.filter((item) => item.coinAddress), [items]);

  if (validItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground text-sm">
        No coins selected for purchase
      </div>
    );
  }

  // Calculate layout - use dynamic height based on item count
  const minHeight = 400;
  const itemHeight = 45; // Minimum vertical space per item
  const chartHeight = Math.max(minHeight, validItems.length * itemHeight);
  const padding = 40;
  const availableHeight = chartHeight - padding * 2;

  // Desktop uses more horizontal space, mobile is compact
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const sourceX = isMobile ? 70 : 100;
  const targetX = isMobile ? 280 : 520; // Balanced for desktop without overflow
  const svgWidth = isMobile ? 450 : 800; // Fixed SVG width for proper scaling

  return (
    <div
      className="relative w-full bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border border-border overflow-auto max-h-[500px] sm:max-h-none sm:overflow-hidden"
      style={{ height: `${isMobile ? Math.min(chartHeight, 500) : chartHeight}px` }}
    >
      <svg
        width={svgWidth}
        height="100%"
        viewBox={`0 0 ${svgWidth} ${chartHeight}`}
        className="w-full h-full"
      >
        <defs>
          {/* Amber gradient for flows */}
          <linearGradient id="purchaseFlowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FBBF23" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#FBBF23" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FBBF23" stopOpacity="0.2" />
          </linearGradient>

          {/* Green gradient for Gnars paired coins */}
          <linearGradient id="gnarsPurchaseFlowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#10b981" stopOpacity="1" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.4" />
          </linearGradient>

          {/* Filter for glow effect */}
          <filter id="purchaseGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Source node (ETH Amount) */}
        <g>
          <circle cx={sourceX} cy={chartHeight / 2} r="20" fill="#FBBF23" opacity="0.3" />
          <circle
            cx={sourceX}
            cy={chartHeight / 2}
            r="16"
            fill="#FBBF23"
            opacity="0.9"
            filter="url(#purchaseGlow)"
          />
          {/* Ethereum diamond symbol - larger and more visible */}
          <g transform={`translate(${sourceX}, ${chartHeight / 2})`}>
            {/* Main diamond shape */}
            <path d="M0,-8 L6,0 L0,6 L-6,0 Z" fill="#1a1a1a" className="dark:fill-white" />
            {/* Top facet - light */}
            <path
              d="M0,-8 L6,0 L0,3 Z"
              fill="#ffffff"
              className="dark:fill-gray-200"
              opacity="0.95"
            />
            {/* Bottom facet - medium */}
            <path
              d="M0,-8 L-6,0 L0,3 Z"
              fill="#e5e5e5"
              className="dark:fill-gray-300"
              opacity="0.85"
            />
            {/* Bottom triangle */}
            <path
              d="M-6,0 L0,6 L6,0 Z"
              fill="#666666"
              className="dark:fill-gray-400"
              opacity="0.7"
            />
          </g>
          <text
            x={sourceX}
            y={chartHeight / 2 - 28}
            textAnchor="middle"
            className="text-xs font-bold fill-[#FBBF23] dark:fill-[#FBBF23]"
          >
            {totalEth} ETH
          </text>
          <text
            x={sourceX}
            y={chartHeight / 2 + 34}
            textAnchor="middle"
            className="text-[9px] fill-muted-foreground"
          >
            Your Wallet
          </text>
        </g>

        {/* Flows - render from outside to inside so middle appears on top */}
        {validItems
          .map((item, originalIndex) => ({
            item,
            originalIndex,
            distanceFromCenter: Math.abs(originalIndex - (validItems.length - 1) / 2),
          }))
          .sort((a, b) => b.distanceFromCenter - a.distanceFromCenter)
          .map(({ item, originalIndex }) => {
            // Calculate vertical position using ORIGINAL index
            const spacing = availableHeight / validItems.length;
            const targetY = padding + spacing * originalIndex + spacing / 2;
            const sourceY = chartHeight / 2;

            // All flows have same width since equal ETH distribution
            const flowHeight = Math.max(6, Math.min(16, itemHeight * 0.4));

            // Create curved path
            const midX = (sourceX + targetX) / 2;
            const verticalDiff = targetY - sourceY;
            const curveOffset = Math.abs(verticalDiff) < 10 ? 30 : 0;

            const path = `
              M ${sourceX} ${sourceY}
              C ${midX} ${sourceY + curveOffset}, ${midX} ${targetY - curveOffset}, ${targetX} ${targetY}
            `;

            // Check if this is Gnars paired
            const isGnarsPaired =
              item.poolCurrencyTokenAddress != null &&
              item.poolCurrencyTokenAddress.toLowerCase() === GNARS_CREATOR_COIN.toLowerCase();

            return (
              <path
                key={`flow-${item.id}`}
                d={path}
                stroke={
                  isGnarsPaired ? "url(#gnarsPurchaseFlowGradient)" : "url(#purchaseFlowGradient)"
                }
                strokeWidth={flowHeight}
                fill="none"
                strokeLinecap="round"
                opacity={isGnarsPaired ? "1" : "0.9"}
              />
            );
          })}

        {/* Render coin nodes on top */}
        {validItems.map((item, index) => {
          const spacing = availableHeight / validItems.length;
          const targetY = padding + spacing * index + spacing / 2;

          return (
            <CoinNode
              key={`node-${item.id}`}
              item={item}
              ethAmount={ethPerCoin}
              x={targetX}
              y={targetY}
              index={index}
            />
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-2 right-2 flex items-center gap-3 text-[10px]">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-[#FBBF23]" />
          <span className="text-muted-foreground">Content Coin</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-muted-foreground">Gnars Paired</span>
        </div>
      </div>

      {/* Total at bottom left */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1 text-xs font-semibold text-[#FBBF23]">
        <FaEthereum className="w-3 h-3" />
        {(ethPerCoin * validItems.length).toFixed(6)} ETH total
      </div>
    </div>
  );
}
