import { Address } from "viem";
import { ReactNode } from "react";

export interface FlexStats {
  nftBps: number;
  nothingBps: number;
  gnarsAmount: string;
}

export interface FlexNftCounts {
  gnars: number;
  hacker: number;
  total: number;
}

export interface PendingOpen {
  user: Address;
  paid: bigint;
  flexGnarsPayout: bigint;
  flexNothingBps: number;
  flexNftBps: number;
  fulfilled: boolean;
  flexNftReserved: boolean;
}

export interface VrfConfigForm {
  callbackGasLimit: string;
  requestConfirmations: string;
  numWords: string;
  keyHash: string;
}

export interface FlexConfigForm {
  minFlexEth: string;
  flexNothingBps: string;
  flexNftBpsMin: string;
  flexNftBpsMax: string;
  flexNftBpsPerEth: string;
  flexGnarsBase: string;
  flexGnarsPerEth: string;
}

export interface ReadItemProps {
  label: string;
  value: ReactNode;
}

export interface NftPreset {
  label: string;
  value: Address;
}

export interface TokenPreset {
  label: string;
  value: Address;
}
