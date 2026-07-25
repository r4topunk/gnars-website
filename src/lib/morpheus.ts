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

/**
 * The shared Morpheus Distributor. `DepositPool.stake()` delegates the token
 * `transferFrom` to THIS contract, so the deposit-token approval must be granted
 * to the distributor — NOT the per-asset DepositPool we call `stake` on.
 *
 * Verified by a state-override `eth_call`: with an allowance to the pool, stake
 * reverts "ERC20: transfer amount exceeds allowance"; with an allowance to the
 * distributor, the same stake succeeds. Both pools report the same distributor.
 */
export const MORPHEUS_DISTRIBUTOR = getAddress("0xDf1AC1AC255d91F5f4B1E3B4Aef57c5350F64C7A");

/** MOR reward token, on Arbitrum One. */
export const MOR_TOKEN = getAddress("0x092baadb7def4c3981454dd9c0a0d7ff07bcfc86");
export const MOR_DECIMALS = 18;

/** 0xSplits SplitV2 PullSplitFactory — same deterministic address on Arbitrum. */
export const ARBITRUM_PULL_SPLIT_FACTORY = getAddress("0x6B9118074aB15142d7524E8c4ea8f62A3Bdb98f1");

/**
 * The Gnars reward recipient on Arbitrum — a dedicated 3-of-3 multisig. NOT the
 * Base treasury (0x72ad…6f88, a Nouns timelock with no code on Arbitrum, where
 * MOR would be permanently stuck). Recipient of the Gnars half of every athlete
 * split, and their owner.
 */
export const MOR_GNARS_RECIPIENT = getAddress("0xBe6C3D651d2F6e9eFA562b5a7CDf411304cad076");

/** Per-athlete MOR reward splits on Arbitrum (Gnars 50 / athlete 50). */
export const MOR_SPLITS: Record<string, Address> = {
  vlad: getAddress("0x65E849Ac55E5283270383fE0619b61768248152B"),
  yan: getAddress("0x50f470b0bCFAEC93A81447e762A419BdC1D77207"),
  r4to: getAddress("0x363C2ea82C3274113e3d712Bb7dB3B551733A76c"),
  pamtech: getAddress("0xfb3a1b62db94cbB212438537c4E194dE30BC4175"),
  v2: getAddress("0xeA5BF9B03EDE018d1285d3748183c7c808756909"),
  zima: getAddress("0x6ed4922635f610381AAF9B3EF8cb192AfB6D94Dc"),
};

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

// ---- Claim / LayerZero fee (all read on-chain from L1SenderV2's config) ----
// `claim`/`claimFor` are payable: the ETH pays the LayerZero message that mints
// MOR on Arbitrum. The message payload is a fixed 64 bytes (abi.encode(address,
// uint256)), so the native fee is essentially constant (~0.000475 ETH); excess
// is refunded to the refundTo the contracts pass. We still quote it live so a
// protocol config change can't silently under-fund the claim.
export const L1_SENDER = getAddress("0x2Efd4430489e1a05A89c2f51811aC661B7E5FF84");
export const LZ_GATEWAY = getAddress("0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675");
export const LZ_DST_CHAIN_ID = 110; // LayerZero v1 chain id for Arbitrum One
export const LZ_ADAPTER_PARAMS = "0x" as const;

export const lzEndpointAbi = [{
  type: "function", name: "estimateFees", stateMutability: "view",
  inputs: [
    { name: "dstChainId", type: "uint16" }, { name: "userApplication", type: "address" },
    { name: "payload", type: "bytes" }, { name: "payInZRO", type: "bool" }, { name: "adapterParam", type: "bytes" },
  ],
  outputs: [{ name: "nativeFee", type: "uint256" }, { name: "zroFee", type: "uint256" }],
}] as const;

/** MOR reward destination for a rider — a 2-recipient Arbitrum split (Gnars/athlete). */
export type MorpheusSponsor = { morSplit?: Address };
