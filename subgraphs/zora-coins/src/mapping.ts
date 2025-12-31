import { Address, BigInt } from "@graphprotocol/graph-ts";
import { Initialize } from "../generated/UniswapV4PoolManager/UniswapV4PoolManager";
import { GnarsPairedCoin } from "../generated/schema";

// GNARS Creator Coin address (lowercase for comparison)
const GNARS_CREATOR_COIN = Address.fromString(
  "0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b"
);

export function handleInitialize(event: Initialize): void {
  // Check if either currency0 or currency1 is the GNARS Creator Coin
  let isGnarsPaired = false;
  let coinAddress: Address;
  let backingCurrency: Address;

  if (event.params.currency0.equals(GNARS_CREATOR_COIN)) {
    // GNARS is currency0, new coin is currency1
    isGnarsPaired = true;
    coinAddress = event.params.currency1;
    backingCurrency = event.params.currency0;
  } else if (event.params.currency1.equals(GNARS_CREATOR_COIN)) {
    // GNARS is currency1, new coin is currency0
    isGnarsPaired = true;
    coinAddress = event.params.currency0;
    backingCurrency = event.params.currency1;
  }

  if (!isGnarsPaired) {
    return;
  }

  // Use pool ID as the entity ID
  let id = event.params.id.toHexString();

  let coin = new GnarsPairedCoin(id);

  coin.coin = coinAddress;
  coin.backingCurrency = backingCurrency;
  coin.poolId = event.params.id;
  coin.fee = BigInt.fromI32(event.params.fee);
  coin.tickSpacing = event.params.tickSpacing;
  coin.hooks = event.params.hooks;
  coin.blockNumber = event.block.number;
  coin.blockTimestamp = event.block.timestamp;
  coin.transactionHash = event.transaction.hash;

  coin.save();
}
