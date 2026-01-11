import { Address } from "viem";
import { GNARS_ADDRESSES } from "@/lib/config";

export const DEFAULT_LOOTBOX_ADDRESS = GNARS_ADDRESSES.lootbox as Address;
export const GNARS_TOKEN_ADDRESS = GNARS_ADDRESSES.gnarsErc20 as Address;
export const GNARS_NFT_ADDRESS = GNARS_ADDRESSES.token as Address;
export const TEST_NFT_ADDRESS = GNARS_ADDRESSES.lootboxTestNft as Address;
export const GNARS_UNIT_18 = 10n ** 18n;
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;
export const CUSTOM_PRESET = "custom";

export const NFT_PRESETS = [
  { label: "HackerDAO Test NFT", value: TEST_NFT_ADDRESS },
  { label: "Gnars NFT", value: GNARS_NFT_ADDRESS },
] as const;

export const TOKEN_PRESETS = [
  { label: "GNARS ERC20", value: GNARS_TOKEN_ADDRESS },
] as const;

export const erc20BalanceAbi = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
