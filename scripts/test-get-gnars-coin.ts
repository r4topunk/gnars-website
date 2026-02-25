import { getCoin } from "@zoralabs/coins-sdk";

const GNARS_ADDRESS = "0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b" as const;

async function testGetGnarsCoin() {
  console.log("Testing getCoin for GNARS token\n");

  try {
    const response = await getCoin({
      address: GNARS_ADDRESS,
      chain: 8453,
    });

    const coin = response?.data?.zora20Token;

    if (coin) {
      console.log("SUCCESS - getCoin returned data");
      console.log("Name:", coin.name);
      console.log("Symbol:", coin.symbol);
      console.log("Market Cap:", coin.marketCap);
      console.log("Holders:", coin.uniqueHolders);
    } else {
      console.log("FAIL - getCoin returned no data");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("FAIL - getCoin error:", message);
  }
}

testGetGnarsCoin();
