/**
 * Country list for the /store checkout address form. ISO 3166-1 alpha-2 codes, since the
 * KeepKey dropship API validates on the 2-letter code. A `<select>` of these prevents the
 * "browser autofilled 'United States' into a 2-char field" class of 400s.
 *
 * Not exhaustive — a focused set of common destinations. Add more as needed; keep codes ISO-2.
 * `normalizeCountry` also maps a few common full names/aliases to codes as a safety net for
 * anything that still arrives as free text (e.g. autofill on another field).
 */
export const COUNTRIES: ReadonlyArray<{ code: string; name: string }> = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "New Zealand" },
  { code: "IE", name: "Ireland" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "PT", name: "Portugal" },
  { code: "IT", name: "Italy" },
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "CH", name: "Switzerland" },
  { code: "AT", name: "Austria" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "PL", name: "Poland" },
  { code: "CZ", name: "Czechia" },
  { code: "GR", name: "Greece" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "AR", name: "Argentina" },
  { code: "CL", name: "Chile" },
  { code: "CO", name: "Colombia" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "SG", name: "Singapore" },
  { code: "HK", name: "Hong Kong" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "ZA", name: "South Africa" },
];

const CODES = new Set(COUNTRIES.map((c) => c.code));

const ALIASES: Record<string, string> = {
  "united states": "US",
  "united states of america": "US",
  usa: "US",
  america: "US",
  "united kingdom": "GB",
  uk: "GB",
  "great britain": "GB",
  england: "GB",
  brasil: "BR",
  brazil: "BR",
  "south korea": "KR",
  "republic of korea": "KR",
  "czech republic": "CZ",
  "hong kong": "HK",
  uae: "AE",
  "united arab emirates": "AE",
};

/**
 * Best-effort map free-text country input to an ISO-2 code. Returns "" if it can't resolve,
 * so the caller can prompt the user rather than send garbage to the API.
 */
export function normalizeCountry(input: string): string {
  const raw = input.trim();
  if (!raw) return "";
  const upper = raw.toUpperCase();
  if (upper.length === 2 && CODES.has(upper)) return upper;
  return ALIASES[raw.toLowerCase()] ?? (upper.length === 2 ? upper : "");
}

/**
 * ISO-2 codes we currently accept orders for. Dropshipping is **US-only for now** — expand
 * this list to widen shipping (the checkout form and the server both gate on it).
 */
export const SHIPPING_COUNTRIES = ["US"] as const;

const SHIPPING_SET = new Set<string>(SHIPPING_COUNTRIES);

export function isShippingSupported(countryCode: string): boolean {
  return SHIPPING_SET.has(countryCode.trim().toUpperCase());
}

/** Country dropdown options, limited to where we actually ship. */
export const SHIPPING_COUNTRY_OPTIONS = COUNTRIES.filter((c) => SHIPPING_SET.has(c.code));
