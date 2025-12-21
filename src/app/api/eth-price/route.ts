import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.ALCHEMY_API_KEY;

  if (!apiKey) {
    console.error("[eth-price] ALCHEMY_API_KEY not set");
    return NextResponse.json({ usd: 0, error: "missing_api_key" });
  }

  try {
    const res = await fetch(
      "https://api.g.alchemy.com/prices/v1/tokens/by-symbol?symbols=ETH",
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      console.error("[eth-price] Alchemy API error:", res.status);
      return NextResponse.json({ usd: 0, error: `api_error_${res.status}` });
    }

    const data = await res.json();
    const ethData = data?.data?.find((d: { symbol: string }) => d.symbol === "ETH");
    const usdPrice = ethData?.prices?.find(
      (p: { currency: string }) => p.currency.toLowerCase() === "usd"
    );
    const usd = Number(usdPrice?.value ?? 0) || 0;

    console.log("[eth-price] ETH price:", usd);
    return NextResponse.json({ usd });
  } catch (error) {
    console.error("[eth-price] Error:", error);
    return NextResponse.json({ usd: 0, error: "fetch_error" });
  }
}
