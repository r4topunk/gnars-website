// The venue-plus-asset mark used by the rates strip.
//
// The asset marks are inline SVG rather than a logo URL (the swap page's
// ETH/USDC constants point at relay.link and raw.githubusercontent): these sit
// in the page's first data row, and a logo that arrives late — or never, behind
// a proxy that blocks the host — reads as a broken row rather than a slow one.
// They also need no light/dark variant, since each mark carries its own brand
// circle. The venue logos are local files, so they have neither problem.
//
// Geometry is the standard rendition of each brand's mark: Ethereum's faceted
// diamond on #627EEA, USDC's dollar glyph and ring on #2775CA.
import Image from "next/image";
import { cn } from "@/lib/utils";

/** Asset the rate is quoted in. stETH shows the Ethereum mark — it is the asset
 *  the pool is denominated in, and Lido's own mark is not the point here. */
export type TokenSymbol = "USDC" | "stETH";

/** Venue logos, keyed by the `source` string /api/yields returns. */
const VENUE_LOGO: Record<string, string> = {
  Morpho: "/logos/morpho.webp",
  Morpheus: "/logos/morpheus.webp",
};

function UsdcMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <circle cx="16" cy="16" r="16" fill="#2775CA" />
      <path
        fill="#fff"
        d="M20.022 18.124c0-2.124-1.28-2.852-3.84-3.156-1.828-.243-2.193-.728-2.193-1.578 0-.85.61-1.396 1.828-1.396 1.097 0 1.707.364 2.011 1.275a.458.458 0 0 0 .427.303h.975a.416.416 0 0 0 .427-.425v-.06a3.04 3.04 0 0 0-2.743-2.489V9.142c0-.243-.183-.425-.487-.486h-.915c-.243 0-.426.182-.487.486v1.396c-1.829.243-2.986 1.456-2.986 2.974 0 2.002 1.218 2.791 3.778 3.095 1.707.303 2.255.667 2.255 1.639 0 .97-.853 1.638-2.011 1.638-1.585 0-2.133-.667-2.316-1.578-.06-.243-.243-.364-.426-.364h-1.036a.416.416 0 0 0-.426.425v.06c.243 1.518 1.219 2.61 3.23 2.914v1.457c0 .242.183.424.487.485h.914c.244 0 .427-.182.488-.485V21.34c1.828-.303 3.047-1.578 3.047-3.216Z"
      />
      <path
        fill="#fff"
        d="M12.892 25.207c-4.754-1.7-7.192-6.98-5.424-11.653.914-2.55 2.925-4.491 5.424-5.4.244-.121.365-.303.365-.607v-.85c0-.243-.121-.425-.365-.486-.06 0-.182 0-.243.06a10.876 10.876 0 0 0-7.13 13.717c1.096 3.4 3.717 6.01 7.13 7.102.244.121.488 0 .548-.243.061-.06.061-.122.061-.243v-.85c0-.182-.182-.424-.365-.546Zm6.46-19.42c-.244-.121-.488 0-.549.243-.06.06-.06.122-.06.243v.85c0 .243.182.485.365.607 4.754 1.7 7.192 6.98 5.424 11.653-.914 2.55-2.925 4.491-5.424 5.4-.244.121-.365.303-.365.607v.85c0 .243.121.425.365.486.06 0 .183 0 .244-.061a10.876 10.876 0 0 0 7.13-13.717c-1.097-3.46-3.778-6.07-7.13-7.161Z"
      />
    </svg>
  );
}

function EthMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <circle cx="16" cy="16" r="16" fill="#627EEA" />
      <g fill="#fff">
        <path fillOpacity=".602" d="M16.498 4v8.87l7.497 3.35z" />
        <path d="M16.498 4 9 16.22l7.498-3.35z" />
        <path fillOpacity=".602" d="M16.498 21.968v6.027L24 17.616z" />
        <path d="M16.498 27.995v-6.028L9 17.616z" />
        <path fillOpacity=".2" d="m16.498 20.573 7.497-4.353-7.497-3.348z" />
        <path fillOpacity=".602" d="M9 16.22l7.498 4.353v-7.701z" />
      </g>
    </svg>
  );
}

/**
 * The asset's mark with the venue's mark badged onto its corner: what you are
 * staking, and where.
 *
 * Both are decorative: the row prints "USDC" and the venue name right beside
 * this, so a screen reader that also announced two logos would say each one
 * twice.
 *
 * The badge's ring is `ring-card`, the surface underneath, so it cuts itself out
 * of the asset mark instead of sitting on it as a sticker.
 */
export function TokenMark({
  token,
  venue,
  className,
}: {
  token: TokenSymbol;
  venue?: string;
  className?: string;
}) {
  const venueLogo = venue ? VENUE_LOGO[venue] : undefined;
  const Mark = token === "USDC" ? UsdcMark : EthMark;

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <Mark className="size-[22px]" />
      {venueLogo ? (
        <Image
          src={venueLogo}
          alt=""
          width={12}
          height={12}
          className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-card"
        />
      ) : null}
    </span>
  );
}
