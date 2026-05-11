import { NextRequest, NextResponse } from "next/server";

/**
 * Generate a presigned upload URL for direct client-to-Pinata uploads.
 * This bypasses Vercel's ~4.5MB serverless function payload limit by
 * allowing files to be uploaded directly from the browser to Pinata.
 */
export async function POST(req: NextRequest) {
  try {
    const pinataJWT = process.env.PINATA_JWT;
    if (!pinataJWT) {
      console.error("PINATA_JWT environment variable is not set");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const body = await req.json();
    const { filename, mimeType } = body;

    // Build the signed URL request
    const signBody: Record<string, unknown> = {
      network: "public",
      date: Math.floor(Date.now() / 1000),
      expires: 300, // 5 minutes
    };

    if (filename) {
      signBody.filename = filename;
    }

    // Restrict MIME types based on what was requested
    if (mimeType) {
      if (mimeType.startsWith("image/")) {
        signBody.allow_mime_types = ["image/*"];
      } else if (mimeType.startsWith("video/")) {
        signBody.allow_mime_types = ["video/*"];
      } else if (mimeType.startsWith("audio/")) {
        signBody.allow_mime_types = ["audio/*"];
      }
    }

    const response = await fetch("https://uploads.pinata.cloud/v3/files/sign", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pinataJWT}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(signBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Pinata signed URL error:", errorText);
      return NextResponse.json(
        { error: "Failed to get signed upload URL" },
        { status: response.status },
      );
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("Signed URL error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
