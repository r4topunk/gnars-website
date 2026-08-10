import { getAddress, type Address } from "viem";

// Rider roster + their sponsorship vaults. Wallets were resolved from the
// SkateHive/SOPA team registry (Hive profile eth_address / TeamMemberContact),
// matching the /stake CharacterSelector ids.
//
// `vault`/`adapter`/`split` fill in as each rider's vault is deployed from the
// admin panel — paste the addresses the panel prints here to light up the
// rider's on-chain sponsorship on /stake.

/**
 * Reward split when you stake behind a rider, in percent. Mirrors the vault:
 * the depositor keeps half the yield, the rest is shared.
 *
 * Lives here rather than beside the roster UI because server components read it
 * too — a plain value exported from a `"use client"` module reaches the server
 * as a client-reference proxy, and reading a property off that proxy yields
 * `undefined` instead of the number.
 */
export const REWARD_SPLIT = { you: 50, skater: 25, treasury: 25 } as const;

export type RiderId = "vlad" | "yan" | "r4to" | "pamtech" | "v2" | "zima" | "will";

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
  r4to: {
    id: "r4to",
    handle: "r4topunk",
    wallet: getAddress("0x39a7B6fa1597BB6657Fe84e64E3B836c37d6F75d"),
    vault: getAddress("0x8DEd28839dA4574Fa45bc0C967C3423fC2666A75"),
    adapter: getAddress("0x8e76D3707fBCA5a00f17A3B7040659559D7F77ee"),
    split: getAddress("0x6b92E460250C0E579095fee4FEc1f446E5355c81"),
  },
  pamtech: {
    id: "pamtech",
    handle: "pamtech",
    wallet: getAddress("0x057CFcd04198E6D17F1Bf502135d9508b6Fa2FDe"),
    vault: getAddress("0xC38B368B68e70AAa4780a6fe54c707d4b768F98f"),
    adapter: getAddress("0x55068670b99A3C6827D44f63Bfaa4ab13204f53E"),
    split: getAddress("0xD5F74869e38CAfB593fA81f148f433C273a8D921"),
  },
  v2: {
    id: "v2",
    handle: "louzoshi",
    wallet: getAddress("0x1BfA69ed9481fc8365d2f3476F548a5C39c5A51f"),
    vault: getAddress("0x75a946B96006Dd2AaAd6C286C969B4b668BE2203"),
    adapter: getAddress("0xA0B8493483bD345024568D14c749601705858173"),
    split: getAddress("0xcfF0dee37425AB57Ccec0f227a03c391A5573164"),
  },
  zima: {
    id: "zima",
    handle: "zima",
    wallet: getAddress("0x2feb329b9289b60064904fa61fc347157a5aed6a"),
    vault: getAddress("0x4E7f8523d3f81EFc547d43387eBe5d6251bb32cF"),
    adapter: getAddress("0xC9d6d942E727e82673454e0cC4A5335d35f652EF"),
    split: getAddress("0x81C570DCd0055749d732c1EcCfDd8C56CBBbbEf3"),
  },
  will: {
    id: "will",
    handle: "will",
    wallet: getAddress("0xddb4938755c243a4f60a2f2f8f95df4f894c58cc"),
    // Live and configured: routes to Moonwell, 50% performance fee to the split
    // (Gnars 25% / will 25% of the yield). Deployed + config batch executed;
    // addresses read on-chain from the factory (owner = SOPA Safe).
    vault: getAddress("0x438f7d1ef1ae4ce74d9994edfcaf4ecb92a3f855"),
    adapter: getAddress("0xa2343979662fe97F586cB001E1f3c5fe7462075b"),
    split: getAddress("0x6D966c9dcCAd3cb02B4c109f070181C2c8077bAB"),
  },
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
