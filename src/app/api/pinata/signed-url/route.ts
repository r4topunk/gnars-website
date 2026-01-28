import { NextRequest, NextResponse } from "next/server";

/**
 * Generate a signed upload URL for direct client-to-Pinata uploads.
 * This bypasses Vercel's payload limits by allowing large files to be
 * uploaded directly to Pinata from the browser.
 */
export async function POST(req: NextRequest) {
  try {
    const pinataJWT = process.env.PINATA_JWT;
    if (!pinataJWT) {
      console.error("PINATA_JWT environment variable is not set");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { name, mimeType } = body;

    // Request a signed upload URL from Pinata
    const response = await fetch("https://uploads.pinata.cloud/v3/files/sign", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pinataJWT}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        date: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
        expires: 3600,
        ...(name && { name }),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Pinata signed URL error:", errorText);
      return NextResponse.json(
        { error: "Failed to get signed upload URL" },
        { status: response.status }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("Signed URL error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
