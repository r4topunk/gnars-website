/**
 * Deploy Gnars Content Coin Script
 * 
 * This script deploys a Content Coin on Base (chainId 8453) backed by Gnars Creator Coin
 * using direct calls to ZoraFactory.deploy() instead of the Zora SDK.
 * 
 * SETUP:
 * 1. Set environment variable: PRIVATE_KEY=0x...
 * 2. Update constants below with your addresses
 * 3. Run: tsx scripts/deploy-gnars-content-coin.ts
 * 
 * CONFIGURATION:
 * - GNARS_CREATOR_COIN: The Gnars Creator Coin address on Base (backing currency)
 * - PAYOUT_RECIPIENT: Address to receive coin payouts
 * - OWNERS: Array of owner addresses (1+ required)
 * - PLATFORM_REFERRER: Optional referrer address (use 0x0 if none)
 * - METADATA_URI: IPFS URI for coin metadata
 * - COIN_NAME: Name of your content coin
 * - COIN_SYMBOL: Symbol for your content coin
 * 
 * ⚠️  PRODUCTION WARNING:
 * This script uses placeholder curveParams (zero-length bytes). In production,
 * fetch validated curve parameters from Zora's configuration API for optimal
 * liquidity curves and token economics.
 * 
 * @see https://docs.zora.co/coins/contracts/factory
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  toBytes,
  decodeEventLog,
  Address,
  Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import {
  zoraFactoryAbi,
  ZORA_FACTORY_ADDRESS,
  GNARS_CREATOR_COIN,
} from "../src/lib/zora/factoryAbi";
import { encodeContentPoolConfigForCreator } from "../src/lib/zora/poolConfig";
import { GNARS_ADDRESSES, PLATFORM_REFERRER } from "../src/lib/config";

// ==================== CONFIGURATION ====================

const PAYOUT_RECIPIENT = GNARS_ADDRESSES.treasury; // Gnars DAO Treasury
const OWNERS = [GNARS_ADDRESSES.treasury]; // Gnars DAO Treasury
const PLATFORM_REFERRER_ADDRESS = PLATFORM_REFERRER; // Gnars DAO (referral rewards)
const METADATA_URI = "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"; // Example
const COIN_NAME = "GNARS Content Coin";
const COIN_SYMBOL = "GNARS-POST";

// Generate salt for deterministic address
const SALT = keccak256(toBytes("gnars-content-coin-v1"));

// ==================== MAIN SCRIPT ====================

async function main() {
  if (!process.env.PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY environment variable is required");
  }

  const account = privateKeyToAccount(process.env.PRIVATE_KEY as Hex);
  const publicClient = createPublicClient({
    chain: base,
    transport: http(),
  });
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(),
  });

  // Encode pool config for Gnars Creator Coin backing
  const poolConfig = encodeContentPoolConfigForCreator(GNARS_CREATOR_COIN);
  
  // Predict deployment address
  const predictedAddress = await publicClient.readContract({
    address: ZORA_FACTORY_ADDRESS,
    abi: zoraFactoryAbi,
    functionName: "coinAddress",
    args: [
      account.address,
      COIN_NAME,
      COIN_SYMBOL,
      poolConfig,
      PLATFORM_REFERRER_ADDRESS,
      SALT,
    ],
  });

  // Deploy coin contract
  const hash = await walletClient.writeContract({
    address: ZORA_FACTORY_ADDRESS,
    abi: zoraFactoryAbi,
    functionName: "deploy",
    args: [
      PAYOUT_RECIPIENT,
      OWNERS,
      METADATA_URI,
      COIN_NAME,
      COIN_SYMBOL,
      poolConfig,
      PLATFORM_REFERRER_ADDRESS,
      "0x0000000000000000000000000000000000000000",
      "0x",
      SALT,
    ],
    value: 0n,
  });

  // Wait for confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  
  if (receipt.status !== "success") {
    throw new Error("Transaction failed");
  }

  // Decode CoinCreatedV4 event
  let coinCreatedEvent: any = null;
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: zoraFactoryAbi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "CoinCreatedV4") {
        coinCreatedEvent = decoded.args;
        break;
      }
    } catch {
      continue;
    }
  }

  if (!coinCreatedEvent) {
    throw new Error("CoinCreatedV4 event not found in transaction logs");
  }

  // Return deployment info
  return {
    predictedAddress,
    deployedAddress: coinCreatedEvent.coin,
    transactionHash: hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    event: coinCreatedEvent,
  };
}

// Run script
main()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error.message);
    process.exit(1);
  });
