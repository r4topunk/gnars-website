// Morpheus power-factor lock multiplier — a faithful float replica of the
// on-chain LockMultiplierMath.getLockPeriodMultiplier (contracts/libs). The
// curve is tanh-based, capped at 10.7×, and anchored to ABSOLUTE dates (the MOR
// distribution window, ending Jan 2040) — so the same lock *duration* is worth
// slightly less the later you lock.
//
// What locking actually does (verified against DepositPool.sol): it commits you
// to not CLAIMING your accrued MOR until the end date, in exchange for a bigger
// share of emissions. It does NOT lock your deposit — the stETH/USDC principal
// follows the protocol's 7-day withdraw rule regardless. The lock is one-way:
// _stake requires the new claimLockEnd ≥ the current one (extend only).

const POWER_MAX = 16.61327546;
const MAX_MULT = 10.7;
const MIN_MULT = 1;
const PERIOD_START = 1721908800; // Thu, 25 Jul 2024 12:00:00 UTC
const PERIOD_END = 2211192000; // Thu, 26 Jan 2040 12:00:00 UTC
const DISTRIBUTION = PERIOD_END - PERIOD_START;
const YEAR = 365.25 * 86400;

/** Reward multiplier for a claim lock spanning [startSec, endSec] (both unix seconds). */
export function lockMultiplier(startSec: number, endSec: number): number {
  const end = Math.min(endSec, PERIOD_END);
  const start = Math.max(startSec, PERIOD_START);
  if (start >= end) return 1;
  const endP = Math.tanh(2 * ((end - PERIOD_START) / DISTRIBUTION));
  const startP = Math.tanh(2 * ((start - PERIOD_START) / DISTRIBUTION));
  const m = POWER_MAX * (endP - startP);
  return Math.min(Math.max(m, MIN_MULT), MAX_MULT);
}

/** The `claimLockEnd` timestamp (unix seconds) for locking `years` from `nowSec`; 0 = no lock. */
export function claimLockEndFor(years: number, nowSec: number = Math.floor(Date.now() / 1000)): number {
  return years <= 0 ? 0 : Math.round(nowSec + years * YEAR);
}

/** The multiplier you'd get by locking `years` from `nowSec` (1 = no boost). */
export function multiplierForYears(years: number, nowSec: number = Math.floor(Date.now() / 1000)): number {
  if (years <= 0) return 1;
  return lockMultiplier(nowSec, nowSec + years * YEAR);
}

export interface LockOption {
  /** Lock length in years; 0 = no lock. */
  years: number;
}
// Sub-1-year locks barely move the tanh curve (still ~1×), so we skip them: the
// meaningful choices start at 1 year. Kept short so first-timers aren't drowned.
export const LOCK_OPTIONS: LockOption[] = [
  { years: 0 },
  { years: 1 },
  { years: 2 },
  { years: 3 },
  { years: 5 },
];
