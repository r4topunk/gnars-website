import { NextRequest } from "next/server";
import { getCreateCoinCallData, CreateCoinParams, DEFAULT_CONTENT_COIN, DEFAULT_PLATFORM_REFERRER } from "@/lib/zora-helpers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { name, symbol, metadataUri, currency, creator, startingMarketCap, platformReferrer } = body;

    if (!name || !symbol || !metadataUri) {
      return new Response(JSON.stringify({ error: "Missing required fields: name, symbol, metadataUri" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const params: CreateCoinParams = {
      creator: (creator as any) || ("0x0000000000000000000000000000000000000000" as any),
      name,
      symbol,
      metadata: { type: "RAW_URI", uri: metadataUri },
      currency: currency || DEFAULT_CONTENT_COIN,
      startingMarketCap,
      platformReferrer: platformReferrer || DEFAULT_PLATFORM_REFERRER,
    } as any;

    const result = await getCreateCoinCallData(params);

    return new Response(JSON.stringify({ result }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
