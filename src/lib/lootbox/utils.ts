import { Address, formatUnits, getAddress, isAddress, parseUnits } from "viem";
import { GNARS_UNIT_18 } from "./constants";

// Gnarly rejection messages for when users chicken out 🐔
const GNARLY_REJECTION_MESSAGES = [
  { title: "Paper hands detected! 📄🙌", description: "The lootbox sensed your fear and retreated..." },
  { title: "Bailed on the gnarliest drop?", description: "Even the skatepark pigeons are judging you rn" },
  { title: "Transaction rejected!", description: "Your wallet said 'nah' but your heart said 'send it' 🛹" },
  { title: "Chickened out? 🐔", description: "The box will remember this betrayal..." },
  { title: "Skill issue detected", description: "Real gnars don't hesitate on the drop-in" },
  { title: "Cold feet? ❄️🦶", description: "Maybe try rollerblading instead?" },
  { title: "Rejected?! In THIS economy?", description: "The lootbox is crying rn (it's not, but still)" },
  { title: "You folded harder than a lawn chair", description: "The gnars community felt that one 💀" },
];

export function getGnarlyRejectionMessage() {
  return GNARLY_REJECTION_MESSAGES[Math.floor(Math.random() * GNARLY_REJECTION_MESSAGES.length)];
}

export function isUserRejection(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes("user denied") || 
           msg.includes("user rejected") || 
           msg.includes("rejected the request") ||
           msg.includes("user cancelled");
  }
  return false;
}

export function formatGnarsAmount(amount: bigint | number, gnarsUnit?: bigint | number) {
  const amountBigInt = typeof amount === 'number' ? BigInt(amount) : amount;
  const unitBigInt = gnarsUnit !== undefined ? (typeof gnarsUnit === 'number' ? BigInt(gnarsUnit) : gnarsUnit) : undefined;
  const unit = unitBigInt && unitBigInt !== 0n ? unitBigInt : GNARS_UNIT_18;

  if (unit === GNARS_UNIT_18) {
    return formatUnits(amountBigInt, 18);
  }

  return (amountBigInt / unit).toString();
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
