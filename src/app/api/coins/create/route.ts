import { NextRequest } from "next/server";
import { getCreateCoinCallData, CreateCoinParams, DEFAULT_CONTENT_COIN,DEFAULT_PLATFORM_REFERRER } from "@/lib/zora-helpers";
import { Address } from "viem";

interface RequestBody {
  name: string;
  symbol: string;
  metadataUri: string;
  currency?: Address;
  creator?: Address;
  startingMarketCap?: string;
  platformReferrer?: Address;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as RequestBody;

    const { name, symbol, metadataUri, currency, creator, startingMarketCap, platformReferrer } = body;

    if (!name || !symbol || !metadataUri) {
      return new Response(JSON.stringify({ error: "Missing required fields: name, symbol, metadataUri" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const params: CreateCoinParams = {
      creator: creator || "0x0000000000000000000000000000000000000000" as Address,
      name,
      symbol,
      metadata: { type: "RAW_URI", uri: metadataUri },
      currency: currency || DEFAULT_CONTENT_COIN,
      startingMarketCap: startingMarketCap ? BigInt(startingMarketCap) : undefined,
      platformReferrer: platformReferrer || DEFAULT_PLATFORM_REFERRER,
    };

    const result = await getCreateCoinCallData(params);

    return new Response(JSON.stringify({ result }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
