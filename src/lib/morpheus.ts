// Morpheus (MOR) Capital — the higher-risk / MOR-reward staking option.
//
// A depositor stakes stETH or USDC into a shared Morpheus DepositPool on
// Ethereum MAINNET; their principal stays theirs (withdrawable after a 7-day
// lock) and they earn MOR emissions, minted natively on ARBITRUM via LayerZero
// to whatever address their claim names.
//
// Unlike the Morpho vaults (Base, a real fee skim), Morpheus has no protocol
// skim: 100% of a staker's MOR goes where their own claim points. So the
// "sponsorship" is (a) the athlete's cut via the `referrer` arg on stake
// (protocol-funded, additive), and (b) an opt-in redirect of the staker's own
// MOR to a Gnars/athlete split via setClaimReceiver.
//
// Every address here was verified on-chain (bytecode + state) before hardcoding.

import { getAddress, type Address } from "viem";

export const MAINNET_CHAIN_ID = 1;
export const ARBITRUM_CHAIN_ID = 42161;

/** The shared public "Capital" reward pool index — both stETH and USDC feed it. */
export const MOR_REWARD_POOL_INDEX = BigInt(0);

/** One DepositPool per asset, all on Ethereum mainnet. */
export const MORPHEUS_POOLS = {
  stEth: {
    pool: getAddress("0x47176B2Af9885dC6C4575d4eFd63895f7Aaa4790"),
    token: getAddress("0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84"), // stETH
    decimals: 18,
    symbol: "stETH",
    /** minimalStake read on-chain (0.01 stETH). */
    minStake: "0.01",
  },
  usdc: {
    pool: getAddress("0x6cCE082851Add4c535352f596662521B4De4750E"),
    token: getAddress("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"), // canonical USDC
    decimals: 6,
    symbol: "USDC",
    minStake: "1",
  },
} as const;

export type MorpheusAsset = keyof typeof MORPHEUS_POOLS;

/** MOR reward token, on Arbitrum One. */
export const MOR_TOKEN = getAddress("0x092baadb7def4c3981454dd9c0a0d7ff07bcfc86");
export const MOR_DECIMALS = 18;

/** 0xSplits SplitV2 PullSplitFactory — same deterministic address on Arbitrum. */
export const ARBITRUM_PULL_SPLIT_FACTORY = getAddress("0x6B9118074aB15142d7524E8c4ea8f62A3Bdb98f1");

/** 7-day locks (read on-chain from rewardPoolsProtocolDetails(0)). */
export const WITHDRAW_LOCK_SECONDS = 604800;

// ---- ABIs (exact signatures from the Morpheus source, verified on-chain) ----
export const depositPoolAbi = [
  { type: "function", name: "stake", stateMutability: "nonpayable", inputs: [
    { name: "rewardPoolIndex", type: "uint256" }, { name: "amount", type: "uint256" },
    { name: "claimLockEnd", type: "uint128" }, { name: "referrer", type: "address" },
  ], outputs: [] },
  { type: "function", name: "withdraw", stateMutability: "nonpayable", inputs: [
    { name: "rewardPoolIndex", type: "uint256" }, { name: "amount", type: "uint256" },
  ], outputs: [] },
  { type: "function", name: "claim", stateMutability: "payable", inputs: [
    { name: "rewardPoolIndex", type: "uint256" }, { name: "receiver", type: "address" },
  ], outputs: [] },
  { type: "function", name: "claimFor", stateMutability: "payable", inputs: [
    { name: "poolId", type: "uint256" }, { name: "user", type: "address" }, { name: "receiver", type: "address" },
  ], outputs: [] },
  { type: "function", name: "setClaimReceiver", stateMutability: "nonpayable", inputs: [
    { name: "rewardPoolIndex", type: "uint256" }, { name: "receiver", type: "address" },
  ], outputs: [] },
  { type: "function", name: "getLatestUserReward", stateMutability: "view", inputs: [
    { name: "rewardPoolIndex", type: "uint256" }, { name: "user", type: "address" },
  ], outputs: [{ type: "uint256" }] },
  { type: "function", name: "usersData", stateMutability: "view", inputs: [
    { name: "user", type: "address" }, { name: "rewardPoolIndex", type: "uint256" },
  ], outputs: [
    { name: "lastStake", type: "uint128" }, { name: "deposited", type: "uint256" },
    { name: "rate", type: "uint256" }, { name: "pendingRewards", type: "uint256" },
    { name: "claimLockStart", type: "uint128" }, { name: "claimLockEnd", type: "uint128" },
    { name: "virtualDeposited", type: "uint256" }, { name: "lastClaim", type: "uint128" },
    { name: "referrer", type: "address" },
  ] },
] as const;

/** MOR reward destination for a rider — a 2-recipient Arbitrum split (Gnars/athlete). */
export type MorpheusSponsor = { morSplit?: Address };
