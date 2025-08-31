import { NextRequest, NextResponse } from "next/server";

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const ALCHEMY_BASE_URL = `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

export async function POST(request: NextRequest) {
  try {
    const { method, params } = await request.json();

    if (!ALCHEMY_API_KEY) {
      return NextResponse.json({ error: "Alchemy API key not configured" }, { status: 500 });
    }

    // Define interface for JSON-RPC request body
    interface JsonRpcRequestBody {
      jsonrpc: string;
      id: number;
      method: string;
      params: unknown[];
    }

    // Handle different Alchemy API methods
    let requestBody: JsonRpcRequestBody = {
      jsonrpc: "2.0",
      id: 1,
      method,
      params: params || [],
    };

    // Special handling for Alchemy-specific methods that use different endpoints
    const url = ALCHEMY_BASE_URL;

    if (method === "alchemy_getTokenBalances") {
      requestBody = {
        jsonrpc: "2.0",
        id: 1,
        method: "alchemy_getTokenBalances",
        params: [params[0]], // address
      };
    } else if (method === "alchemy_getTokenMetadata") {
      requestBody = {
        jsonrpc: "2.0",
        id: 1,
        method: "alchemy_getTokenMetadata",
        params: [params[0]], // contract address
      };
    } else if (method === "alchemy_getNfts") {
      requestBody = {
        jsonrpc: "2.0",
        id: 1,
        method: "alchemy_getNFTs",
        params: [params[0], params[1] || { withMetadata: true }],
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Alchemy API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Alchemy API error:", error);
    return NextResponse.json({ error: "Failed to fetch data from Alchemy API" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed. Use POST." }, { status: 405 });
}
