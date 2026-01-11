import { Address, formatUnits, getAddress, isAddress, parseUnits } from "viem";
import { GNARS_UNIT_18 } from "./constants";
import type { NftPreset, TokenPreset } from "./types";

export function formatGnarsAmount(amount: bigint, gnarsUnit?: bigint) {
  const unit = gnarsUnit && gnarsUnit !== 0n ? gnarsUnit : GNARS_UNIT_18;

  if (unit === GNARS_UNIT_18) {
    return formatUnits(amount, 18);
  }

  return (amount / unit).toString();
}

export function parseGnarsInput(value: string, gnarsUnit?: bigint) {
  if (!value) return 0n;
  if (!gnarsUnit || gnarsUnit === 0n || gnarsUnit === GNARS_UNIT_18) return parseUnits(value, 18);
  return BigInt(value) * gnarsUnit;
}

export function matchPreset(value: string, presets: readonly { value: Address }[]) {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  const preset = presets.find((item) => item.value.toLowerCase() === normalized);
  return preset?.value;
}

export function formatPresetLabel(label: string, value: Address) {
  return `${label} (${value.slice(0, 6)}...${value.slice(-4)})`;
}

export function normalizeAddress(value: string) {
  if (!value) return null;
  try {
    return getAddress(value.trim());
  } catch {
    return null;
  }
}

export function formatOptional(value: string | number | bigint | null | undefined) {
  if (value === null || value === undefined) return "-";
  return value.toString();
}

export function formatAllowlistStatus(address: string, status: boolean | undefined) {
  if (!isAddress(address)) return "-";
  if (status === undefined) return "Loading...";
  return status ? "Allowed" : "Blocked";
}
