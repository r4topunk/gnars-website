import { OG_COLORS } from "@/lib/og-utils";

type NogglesIconProps = {
  color?: string;
  width?: number;
};

// Inline SVG (no unicode glyphs) to avoid next/og dynamic font downloads.
export function NogglesIcon({ color = OG_COLORS.accent, width = 220 }: NogglesIconProps) {
  const height = Math.round((width * 60) / 180);

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 180 60"
      style={{ display: "flex" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Lenses */}
      <rect x="0" y="10" width="70" height="40" rx="10" fill={color} />
      <rect x="110" y="10" width="70" height="40" rx="10" fill={color} />

      {/* Bridge */}
      <rect x="78" y="26" width="24" height="8" rx="4" fill={color} />

      {/* Highlights */}
      <rect x="18" y="22" width="20" height="16" rx="4" fill="#ffffff" opacity="0.9" />
      <rect x="128" y="22" width="20" height="16" rx="4" fill="#ffffff" opacity="0.9" />
    </svg>
  );
}
