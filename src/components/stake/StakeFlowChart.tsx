"use client";

// Rewards-flow visualization for the stake dialog. Adapts the droposal
// SplitFlowChart's curved-gradient SVG technique, themed to the rider accent
// and animated with flowing dots. Source (your stake yield) → You / Skater / Treasury.

interface FlowTarget {
  key: "you" | "skater" | "treasury";
  label: string;
  sublabel?: string;
  percent: number;
  image?: string;
}

interface StakeFlowChartProps {
  accent: string; // hex
  sourceLabel: string;
  targets: FlowTarget[];
}

const VB_W = 400;
const VB_H = 300;
const SRC_X = 66;
const TGT_X = 318;

function strokeFor(percent: number) {
  return 4 + (percent / 100) * 18;
}

export function StakeFlowChart({ accent, sourceLabel, targets }: StakeFlowChartProps) {
  const gradId = "stakeFlowGrad";
  const glowId = "stakeFlowGlow";
  const rows = targets.length;
  const top = 52;
  const bottom = VB_H - 52;
  const step = rows > 1 ? (bottom - top) / (rows - 1) : 0;
  const yFor = (i: number) => (rows > 1 ? top + step * i : VB_H / 2);
  const srcY = VB_H / 2;
  const midX = (SRC_X + TGT_X) / 2;

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-muted/40 to-background">
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" className="block">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.15" />
            <stop offset="55%" stopColor={accent} stopOpacity="0.85" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.25" />
          </linearGradient>
          <filter id={glowId}>
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Flows (draw first so nodes sit on top) */}
        {targets.map((tgt, i) => {
          const ty = yFor(i);
          const d = `M ${SRC_X} ${srcY} C ${midX} ${srcY}, ${midX} ${ty}, ${TGT_X} ${ty}`;
          return (
            <g key={`flow-${tgt.key}`}>
              <path
                d={d}
                stroke={`url(#${gradId})`}
                strokeWidth={strokeFor(tgt.percent)}
                fill="none"
                strokeLinecap="round"
                opacity={0.9}
              />
              {/* flowing dots */}
              {[0, 0.66, 1.33].map((delay, di) => (
                <circle key={di} r="2.6" fill={accent}>
                  <animateMotion dur="2s" begin={`${delay}s`} repeatCount="indefinite" path={d} />
                </circle>
              ))}
            </g>
          );
        })}

        {/* Source node */}
        <g>
          <circle cx={SRC_X} cy={srcY} r="11" fill={accent} filter={`url(#${glowId})`} />
          <text
            x={SRC_X}
            y={srcY - 20}
            textAnchor="middle"
            className="fill-foreground text-[11px] font-semibold"
          >
            {sourceLabel}
          </text>
          <text
            x={SRC_X}
            y={srcY + 28}
            textAnchor="middle"
            className="fill-muted-foreground text-[9px]"
          >
            yield
          </text>
        </g>

        {/* Target nodes */}
        {targets.map((tgt, i) => {
          const ty = yFor(i);
          const clip = `stakeNodeClip-${tgt.key}`;
          return (
            <g key={`node-${tgt.key}`}>
              <defs>
                <clipPath id={clip}>
                  <circle cx={TGT_X} cy={ty} r="17" />
                </clipPath>
              </defs>
              <circle cx={TGT_X} cy={ty} r="20" fill={accent} opacity="0.18" />
              {tgt.image ? (
                <image
                  href={tgt.image}
                  x={TGT_X - 20}
                  y={ty - 20}
                  width="40"
                  height="53"
                  preserveAspectRatio="xMidYMin slice"
                  clipPath={`url(#${clip})`}
                />
              ) : (
                <text
                  x={TGT_X}
                  y={ty + 4}
                  textAnchor="middle"
                  className="fill-foreground text-[10px] font-bold"
                >
                  {tgt.label.slice(0, 3).toUpperCase()}
                </text>
              )}
              <circle cx={TGT_X} cy={ty} r="17" fill="none" stroke={accent} strokeWidth="2" />
              <text x={TGT_X + 27} y={ty - 3} className="fill-foreground text-[12px] font-semibold">
                {tgt.label}
              </text>
              <text x={TGT_X + 27} y={ty + 12} className="text-[11px] font-bold" fill={accent}>
                {tgt.percent}%
              </text>
              {tgt.sublabel ? (
                <text x={TGT_X + 27} y={ty + 24} className="fill-muted-foreground text-[9px]">
                  {tgt.sublabel}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
