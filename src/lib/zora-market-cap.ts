export const MIN_ZORA_COIN_MARKET_CAP_USD = 5_000;

export function parseZoraMarketCap(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function isBelowMinimumZoraMarketCap(value: unknown): boolean {
  const marketCap = parseZoraMarketCap(value);
  return marketCap !== null && marketCap < MIN_ZORA_COIN_MARKET_CAP_USD;
}
