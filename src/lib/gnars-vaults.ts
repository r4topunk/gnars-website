import { getAddress, type Address } from "viem";

// Rider roster + their sponsorship vaults. Wallets were resolved from the
// SkateHive/SOPA team registry (Hive profile eth_address / TeamMemberContact),
// matching the /stake CharacterSelector ids.
//
// `vault`/`adapter`/`split` fill in as each rider's vault is deployed from the
// admin panel — paste the addresses the panel prints here to light up the
// rider's on-chain sponsorship on /stake.

export type RiderId = "vlad" | "yan" | "r4to" | "pamtech" | "v2" | "zima";

export type Rider = {
  id: RiderId;
  /** Display / SkateHive handle. */
  handle: string;
  /**
   * The athlete's wallet — receives the athlete half of the fee split.
   * Undefined until the rider registers one (Hive eth_address / team DB); the
   * admin panel shows them as pending and can't deploy their vault yet.
   */
  wallet?: Address;
  /** On-chain addresses, once deployed. */
  vault?: Address;
  adapter?: Address;
  split?: Address;
};

export const RIDERS: Record<RiderId, Rider> = {
  vlad: {
    id: "vlad",
    handle: "vlad",
    wallet: getAddress("0x8Bf5941d27176242745B716251943Ae4892a3C26"),
    // Live and fully configured: routes to Moonwell, 50% performance fee to the
    // split (Gnars 25% / vlad 25% of the yield), caps max/100%.
    vault: getAddress("0xF3f8F84E6891A7881956a2495DaBFF480EE2d4D2"),
    adapter: getAddress("0x4aA117b2B40C629E20164B5091f0A540db442865"),
    split: getAddress("0xCf0fD6F7D9C382EcDf85e549cBc081afa1E2D179"),
  },
  yan: {
    id: "yan",
    handle: "nogenta",
    wallet: getAddress("0xD1195629d9Ba1168591B8EcdEc9abb1721fCC7D8"),
    vault: getAddress("0xF35864DD098774D96F418efc32F246cCdD168b5c"),
    adapter: getAddress("0x268fd3994a99942A2D8C715eA36D69a276330a53"),
    split: getAddress("0x9e63BdcEa2E297C32DB4DEa4d795055457Cb1653"),
  },
  r4to: { id: "r4to", handle: "r4topunk", wallet: getAddress("0x39a7B6fa1597BB6657Fe84e64E3B836c37d6F75d") },
  pamtech: { id: "pamtech", handle: "pamtech", wallet: getAddress("0x057CFcd04198E6D17F1Bf502135d9508b6Fa2FDe") },
  v2: { id: "v2", handle: "louzoshi", wallet: getAddress("0x1BfA69ed9481fc8365d2f3476F548a5C39c5A51f") },
  zima: { id: "zima", handle: "zima", wallet: getAddress("0x2feb329b9289b60064904fa61fc347157a5aed6a") },
};

export const RIDER_LIST: Rider[] = Object.values(RIDERS);

export const getRider = (id: string): Rider | undefined => RIDERS[id as RiderId];
export const riderVault = (id: string): Address | undefined => getRider(id)?.vault;

// Who can operate the deploy panel. These EOAs are SOPA Safe owners, so their
// signature also lands the first of the Safe's 2 required confirmations.
export const VAULT_ADMINS: Address[] = [
  getAddress("0x8Bf5941d27176242745B716251943Ae4892a3C26"), // vlad
];

export const isVaultAdmin = (address?: string | null): boolean =>
  !!address && VAULT_ADMINS.some((a) => a.toLowerCase() === address.toLowerCase());
