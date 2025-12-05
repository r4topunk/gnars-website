"use client";

import { useMemo } from "react";
import { useAccount } from "wagmi";
import { useEnsNameAndAvatar } from "@/hooks/use-ens";
import { GNARS_ADDRESSES } from "@/lib/config";
import type { SplitRecipient } from "@/lib/splits-utils";

interface SplitFlowChartProps {
  recipients: SplitRecipient[];
}

function shortenAddress(address: string): string {
  if (!address) return "Empty";
  if (address.length < 10) return address;
  // Check if it's an ENS name
  if (address.endsWith(".eth")) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function RecipientNode({
  address,
  percentage,
  x,
  y,
  index,
}: {
  address: string;
  percentage: number;
  x: number;
  y: number;
  index: number;
}) {
  const { address: connectedAddress } = useAccount();
  const { ensName, ensAvatar } = useEnsNameAndAvatar(address);

  const isGnarsTreasury = address.toLowerCase() === GNARS_ADDRESSES.treasury.toLowerCase();
  const isConnectedUser = address.toLowerCase() === connectedAddress?.toLowerCase();

  const displayName = ensName || shortenAddress(address);
  const avatarUrl = isGnarsTreasury
    ? "/gnars.webp"
    : ensAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`;

  const clipId = `clip-recipient-${index}`;

  return (
    <g>
      {/* Avatar circle with unique clip path */}
      <defs>
        <clipPath id={clipId}>
          <circle cx={x} cy={y} r="16" />
        </clipPath>
      </defs>

      <circle cx={x} cy={y} r="18" fill="#10b981" opacity="0.2" />

      <image
        href={avatarUrl}
        x={x - 16}
        y={y - 16}
        width="32"
        height="32"
        clipPath={`url(#${clipId})`}
      />

      <circle cx={x} cy={y} r="16" fill="none" stroke="#10b981" strokeWidth="2" />

      {/* Label */}
      <text x={x + 25} y={y - 5} className="text-xs font-medium fill-foreground">
        {isGnarsTreasury ? "Gnars DAO" : displayName}
      </text>
      <text
        x={x + 25}
        y={y + 10}
        className="text-[11px] font-semibold fill-green-600 dark:fill-green-400"
      >
        {percentage.toFixed(2)}%
      </text>

      {isConnectedUser && !isGnarsTreasury && (
        <text x={x + 25} y={y + 22} className="text-[9px] fill-blue-600 dark:fill-blue-400">
          (You)
        </text>
      )}

      {isGnarsTreasury && (
        <text x={x + 25} y={y + 22} className="text-[9px] fill-muted-foreground">
          Treasury
        </text>
      )}
    </g>
  );
}

export function SplitFlowChart({ recipients }: SplitFlowChartProps) {
  const totalPercent = useMemo(
    () => recipients.reduce((sum, r) => sum + (r.percentAllocation || 0), 0),
    [recipients],
  );

  // Filter out recipients with 0% allocation and group by address
  const validRecipients = useMemo(() => {
    const filtered = recipients.filter((r) => r.percentAllocation > 0 && r.address);

    // Group by address and sum percentages for duplicates
    const grouped = new Map<string, { address: string; percentAllocation: number }>();

    filtered.forEach((recipient) => {
      const key = recipient.address.toLowerCase();
      if (grouped.has(key)) {
        const existing = grouped.get(key)!;
        existing.percentAllocation += recipient.percentAllocation;
      } else {
        grouped.set(key, {
          address: recipient.address,
          percentAllocation: recipient.percentAllocation,
        });
      }
    });

    return Array.from(grouped.values());
  }, [recipients]);

  if (validRecipients.length === 0 || totalPercent === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground text-sm">
        Add recipients with allocations to see the split visualization
      </div>
    );
  }

  // Calculate total height for flows (400px container, leave some padding)
  const chartHeight = 400;
  const padding = 40;
  const availableHeight = chartHeight - padding * 2;
  const sourceX = 80;
  const targetX = 380;

  return (
    <div className="relative w-full h-[400px] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg overflow-hidden">
      <svg width="100%" height="100%" className="overflow-visible">
        <defs>
          {/* Green gradient for flows */}
          <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#10b981" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.2" />
          </linearGradient>

          {/* Bright green gradient for Gnars DAO */}
          <linearGradient id="gnarsFlowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#10b981" stopOpacity="1" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.4" />
          </linearGradient>

          {/* Filter for glow effect */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Source node */}
        <g>
          <circle cx={sourceX} cy={chartHeight / 2} r="10" fill="#10b981" filter="url(#glow)" />
          <text
            x={sourceX}
            y={chartHeight / 2 - 18}
            textAnchor="middle"
            className="text-xs font-semibold fill-foreground"
          >
            Split
          </text>
          <text
            x={sourceX}
            y={chartHeight / 2 + 25}
            textAnchor="middle"
            className="text-[10px] fill-muted-foreground"
          >
            Contract
          </text>
        </g>

        {/* Flows - render from outside to inside so middle appears on top */}
        {validRecipients
          .map((recipient, originalIndex) => ({
            recipient,
            originalIndex,
            distanceFromCenter: Math.abs(originalIndex - (validRecipients.length - 1) / 2),
          }))
          .sort((a, b) => b.distanceFromCenter - a.distanceFromCenter)
          .map(({ recipient, originalIndex }) => {
            // Calculate vertical position using ORIGINAL index
            const spacing = availableHeight / validRecipients.length;
            const targetY = padding + spacing * originalIndex + spacing / 2;
            const sourceY = chartHeight / 2;

            // Calculate flow height - use smaller multiplier to prevent overlap
            const baseHeight = (recipient.percentAllocation / 100) * availableHeight * 0.4;
            const flowHeight = Math.max(baseHeight, 10);

            // Create curved path with better control for horizontal flow
            const midX = (sourceX + targetX) / 2;
            const verticalDiff = targetY - sourceY;

            // For nearly horizontal flows (middle recipient), add slight curve
            const curveOffset = Math.abs(verticalDiff) < 10 ? 30 : 0;

            const path = `
              M ${sourceX} ${sourceY}
              C ${midX} ${sourceY + curveOffset}, ${midX} ${targetY - curveOffset}, ${targetX} ${targetY}
            `;

            // Check if this is Gnars treasury
            const isGnarsTreasury =
              recipient.address.toLowerCase() === GNARS_ADDRESSES.treasury.toLowerCase();

            return (
              <path
                key={`flow-${recipient.address.toLowerCase()}`}
                d={path}
                stroke={isGnarsTreasury ? "url(#gnarsFlowGradient)" : "url(#flowGradient)"}
                strokeWidth={flowHeight}
                fill="none"
                strokeLinecap="round"
                opacity={isGnarsTreasury ? "1" : "0.9"}
              />
            );
          })}

        {/* Render recipient nodes on top */}
        {validRecipients.map((recipient, index) => {
          const spacing = availableHeight / validRecipients.length;
          const targetY = padding + spacing * index + spacing / 2;

          return (
            <RecipientNode
              key={`node-${recipient.address.toLowerCase()}`}
              address={recipient.address}
              percentage={recipient.percentAllocation}
              x={targetX}
              y={targetY}
              index={index}
            />
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-2 right-2 text-[10px] text-muted-foreground">
        Flow width = allocation %
      </div>
    </div>
  );
}
