import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData();
    const file = data.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Check file size (500MB limit for videos, 100MB for others)
    const isVideo = file.type.startsWith("video/");
    const maxSize = isVideo ? 500 * 1024 * 1024 : 100 * 1024 * 1024; // 500MB for videos, 100MB for others
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size exceeds ${isVideo ? '500MB' : '100MB'} limit` },
        { status: 400 }
      );
    }

    // Check file type (images, videos, and audio)
    const allowedTypes = ["image/", "video/", "audio/"];
    const isAllowedType = allowedTypes.some(type => file.type.startsWith(type));
    
    if (!isAllowedType && file.type !== "") {
      return NextResponse.json(
        { error: "Only image, video, and audio files are allowed" },
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
