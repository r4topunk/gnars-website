# Morpheus claim → swap → restake proposer (spec for the SOPA portal)

Spec for a treasury-page proposer that claims the SkateHive Safe's MOR rewards from the Morpheus Capital pools, swaps part, and restakes the rest into the Gnars Builder subnet. Written for an implementer with no access to the contract sources: **every address, signature, and constant below was read from verified on-chain source (2026-08-24)** — nothing here is inferred from docs.

The Safe: `0xC1afA4c0A70B622d7b71d42241Bb4d52B6F3E218` (SkateHive), deployed at the **same address on mainnet, Arbitrum, and Base** (bytecode confirmed on all three).

## The flow at a glance

MOR is claimed on **Ethereum mainnet** but minted on **Arbitrum**; the Gnars subnet lives on **Base**. Three chains, four legs:

| #   | Leg               | Chain    | Contract                                                                                                         | Call                                                |
| --- | ----------------- | -------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| 1   | Claim (per pool)  | Mainnet  | stETH pool `0x47176B2Af9885dC6C4575d4eFd63895f7Aaa4790` · USDC pool `0x6cCE082851Add4c535352f596662521B4De4750E` | `claim(0, receiver)` **payable**                    |
| 2   | Bridge Arb→Base   | Arbitrum | MOR (LZ v2 OFT) `0x092bAaDB7DEf4C3981454dD9c0A0D7FF07bCFc86`                                                     | `send(SendParam, MessagingFee, refund)` **payable** |
| 3   | Swap (the "part") | Base     | venue is an open product decision — see Open decisions                                                           | —                                                   |
| 4   | Restake           | Base     | BuildersV4 `0x42BB446eAE6dca7723a9eBdb81EA88aFe77eF4B9`                                                          | `approve` then `deposit(subnetId, amount)`          |

Each leg is a separate Safe transaction on its own chain; the proposer builds them per-chain and tracks state across chains (leg 2 only after the MOR arrives on Arbitrum, legs 3–4 only after it arrives on Base).

## Leg 1 — claim on mainnet

`claim(uint256 rewardPoolIndex, address receiver) external payable` on **each** pool, `rewardPoolIndex = 0` on both. Two pools ⇒ **two claim transactions**. `receiver` is an **Arbitrum** address — use the Safe itself (`0xC1af…E218`); the mint lands there.

`setClaimReceiver` is **not** part of this flow. The receiver is an argument of `claim` itself, chosen at claim time. (Third parties cannot redirect: with `claimReceiver` unset, `claimFor` reverts `"DS: invalid caller"` unless the Safe itself allowlisted the caller via `setClaimSender` — it never has.)

### msg.value — the LayerZero fee (value 0 reverts)

The claim ends in a LayerZero **v1** message (`L1SenderV2.sendMintMessage{value: msg.value}`), so the ETH fee rides on the claim call and **the Safe must hold ETH on mainnet**. Excess is refunded to the Safe (`refundTo = msg.sender`).

Quote it on-chain before proposing:

1. `L1SenderV2 = 0x2Efd4430489e1a05A89c2f51811aC661B7E5FF84`, read `layerZeroConfig()` → `(gateway, receiver, receiverChainId, zroPaymentAddress, adapterParams)`. Today: gateway (LZ v1 endpoint) `0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675`, receiverChainId `110` (Arbitrum), adapterParams `0x0001…03d090`.
2. On the endpoint: `estimateFees(receiverChainId, 0x2Efd…FF84, abi.encode(receiverAddress, amountMor), false, adapterParams)` → `nativeFee`. Payload byte-length is fixed, so the amount value barely moves the fee.
3. Set `msg.value = nativeFee * 1.5` (refund makes over-provisioning free; under-provisioning reverts). Live quote on 2026-08-24: ~0.000043 ETH.

Read the config fresh each time — it is owner-settable, don't hardcode step 1's values.

### Time gates — compute availability, never let the user discover a revert

`_claim` enforces three requires. Read per pool via `usersData(address user, uint256 rewardPoolIndex)` (11-field struct; the fields needed here):

```
usersData(safe, 0) → { lastStake (uint128), …, claimLockStart, claimLockEnd, …, lastClaim (uint128), referrer }
rewardPoolsProtocolDetails(0) → { withdrawLockPeriodAfterStake, claimLockPeriodAfterStake, claimLockPeriodAfterClaim, minimalStake, … }
```

```
nextClaimAt = max(
  lastStake + claimLockPeriodAfterStake,   // 7 days after the last stake  ("DS: pool claim is locked (S)")
  lastClaim + claimLockPeriodAfterClaim,   // 7 days after the last claim  ("DS: pool claim is locked (C)")
  claimLockEnd                             // voluntary lockClaim, 0 unless used ("DS: user claim is locked")
)
```

Both lock periods read **604800s (7 days)** on both pools today — read them, don't hardcode. UI: show **"next claim available in X"** from `nextClaimAt` and disable the propose button until then; also show the claimable amount via `getLatestUserReward(0, safe)`. Note the coupling: **any new stake into a pool pushes that pool's claim out 7 days**, and **claiming at most once per 7 days per pool**. The two pools have independent clocks (locks unlock 2026-08-30 ~02:23 and ~04:22 UTC for the current stakes).

## Leg 2 — bridge Arbitrum → Base (the MOR token IS the bridge)

MOR on Arbitrum (`0x092b…Fc86`) and MOR on Base (`0x7431aDa8a591C955a994a21710752EF9b882b8e3`) are **LayerZero v2 OFT peers of each other** (verified: `peers(30184)` on Arb = the Base address, `peers(30110)` on Base = the Arb address; both on endpoint `0x1a44…728c`). Burn-and-mint through the token itself — **no third-party bridge, no approve needed for this leg**.

On Arbitrum, from the Safe:

1. `quoteSend(SendParam, false)` → `MessagingFee { nativeFee, lzTokenFee }`.
2. `send(SendParam, MessagingFee, refundAddress)` with `msg.value = nativeFee` (Safe needs a little ETH on Arbitrum).

`SendParam = { dstEid: 30184 (Base), to: bytes32(safe), amountLD, minAmountLD, extraOptions: 0x, composeMsg: 0x, oftCmd: 0x }`. Set `minAmountLD` from `quoteOFT` or accept the OFT's dust-removal (amounts are trimmed to shared decimals).

## Legs 3–4 — swap and restake on Base

**Restake** (the verified part):

1. `MOR_base.approve(0x42BB446eAE6dca7723a9eBdb81EA88aFe77eF4B9, amount)`
2. `BuildersV4.deposit(bytes32 subnetId, uint256 amount)` with `subnetId = 0xf129111951997d1c386be9b7de27d4c74490c42ad0ffbcb65e380d17f8a8ea3d` (Gnars).

Constraints read from BuildersV4: resulting deposit must be **≥ 0.001 MOR** (`minimalDeposit`, 18 decimals: `1e15`); `amount > 0`.

### ⚠️ REQUIRED UI WARNING — the lock reset

`deposit()` sets `usersData.lastDeposit = block.timestamp`, and `withdraw()` requires `now > lastDeposit + 604800`. **Every deposit re-locks the Safe's ENTIRE subnet position for 7 more days — not just the new amount.** A weekly claim-and-restake cadence means the principal never unlocks.

This is a liquidity decision the treasury must make with open eyes, so the proposer **must display it on screen before the propose action**, not bury it in a doc. Suggested copy:

> Restaking re-locks the Safe's **entire** subnet position (currently X MOR) for 7 days from this deposit. On a weekly restake cadence the position never becomes withdrawable. Skip the restake leg if the treasury needs the principal liquid.

Show current position and unlock state next to it: `usersData(safe, subnetId)` on BuildersV4 → `{ lastDeposit, …, deposited, … }`; unlockAt = `lastDeposit + 604800`.

## Open decisions (product, not contract)

- **Swap venue and pair** for leg 3 (MOR→? on Base) — MOR liquidity on Base was **not** assessed here; whoever builds must check depth before routing size through it, or swap on Arbitrum before bridging instead.
- **Split percentages** (swap vs restake) — parameterize; don't hardcode.
- Claims land as one MOR sum per pool on Arbitrum; whether to bridge both together is free choice (leg 2 is amount-agnostic).

## Provenance

Verified sources read: DepositPool impl `0xdb10…d670` (both pools share it), DistributorV2 impl `0x52f7…e03`, L1SenderV2 impl `0x50e8…d1f` (mainnet, Blockscout-verified); BuildersV4 impl `0x18fa…3b0` (Base). Live values (fees, lock periods, LZ config, OFT peers) read 2026-08-24 — re-read at build time, several are owner-settable.
