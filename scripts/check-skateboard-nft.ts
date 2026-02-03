import { config } from "dotenv";
import { resolve } from "path";
import { createPublicClient, http, parseAbi } from "viem";
import { base } from "viem/chains";

config({ path: resolve(process.cwd(), ".env.local") });

const GNARS_NFT_ADDRESS = "0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17";
const erc721Abi = parseAbi(["function balanceOf(address owner) view returns (uint256)"]);

const alchemyKey = process.env.ALCHEMY_API_KEY || process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const rpcUrl = alchemyKey
  ? `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`
  : "https://mainnet.base.org";

const client = createPublicClient({
  chain: base,
  transport: http(rpcUrl),
});

async function checkSkateboardNFTs() {
  const wallets = [
    "0x41cb654d1f47913acab158a8199191d160dabe4a",
    "0x4a0a41f0278c732562e2a09008dfb0e4b9189eb3",
    "0x1ff060c8e5e87026604ea4004fb86c39a72abe39",
    "0xb3414711afa2f2c48de2ae119f6304a96f41b9f0",
    "0x2d1882304c9a6fa7f987c1b41c9fd5e8cf0516e2",
    "0x793b7ec1e64336391eb0b40ad2c197cc33e5dd28",
    "0x8bf5941d27176242745b716251943ae4892a3c26",
    "0x9f62cb7ee7565f6ebd73168958aae3061ed6d2c6",
  ];

  console.log("🔍 Checking Gnars NFT balance for @skateboard's wallets\n");

  let totalNFTs = 0;

  for (const wallet of wallets) {
    try {
      const balance = await client.readContract({
        address: GNARS_NFT_ADDRESS as `0x${string}`,
        abi: erc721Abi,
        functionName: "balanceOf",
        args: [wallet as `0x${string}`],
      });

      const nftCount = Number(balance);
      if (nftCount > 0) {
        console.log(`✅ ${wallet}: ${nftCount} Gnars NFT(s)`);
        totalNFTs += nftCount;
      }
    } catch (error: any) {
      console.log(`❌ ${wallet}: Error - ${error.message}`);
    }
  }

  console.log(`\n📊 Total Gnars NFTs: ${totalNFTs}`);
  console.log(`\n${totalNFTs >= 1 ? "✅" : "❌"} Qualified Creator: ${totalNFTs >= 1 ? "YES" : "NO"} (needs 1+ NFT)`);
}

checkSkateboardNFTs();
