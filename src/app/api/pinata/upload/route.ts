import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData();
    const file = data.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // Check file type (only images)
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed" },
        { status: 400 }
      );
    }

    const pinataJWT = process.env.PINATA_JWT;
    if (!pinataJWT) {
      console.error("PINATA_JWT environment variable is not set");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Create FormData for Pinata
    const formData = new FormData();
    formData.append("file", file);
    formData.append("network", "public");

    // Optional: Add metadata
    const name = data.get("name") as string;
    if (name) {
      formData.append("name", name);
    }

    // Upload to Pinata
    const uploadResponse = await fetch("https://uploads.pinata.cloud/v3/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pinataJWT}`,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("Pinata upload error:", errorText);
      return NextResponse.json(
        { error: "Failed to upload to Pinata" },
        { status: uploadResponse.status }
      );
    }

    const result = await uploadResponse.json();

    // Return IPFS URL with skatehive gateway
    return NextResponse.json({
      success: true,
      data: {
        id: result.data.id,
        cid: result.data.cid,
        name: result.data.name,
        size: result.data.size,
        ipfsUrl: `ipfs://${result.data.cid}`,
        gatewayUrl: `https://ipfs.skatehive.app/ipfs/${result.data.cid}`,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
