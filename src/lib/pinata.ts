export interface PinataUploadResponse {
  success: boolean;
  data?: {
    id: string;
    cid: string;
    name: string;
    size: number;
    ipfsUrl: string;
    gatewayUrl: string;
  };
  error?: string;
}

export async function uploadToPinata(
  file: File,
  name?: string
): Promise<PinataUploadResponse> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    if (name) {
      formData.append("name", name);
    }

    const response = await fetch("/api/pinata/upload", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || "Failed to upload file",
      };
    }

    return result;
  } catch (error) {
    console.error("Upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload file",
    };
  }
}

/**
 * Convert IPFS URL to gateway URL using skatehive.app gateway
 * @param ipfsUrl - IPFS URL in format ipfs://CID or ipfs://CID/path
 * @returns Gateway URL
 */
export function ipfsToGatewayUrl(ipfsUrl: string): string {
  if (!ipfsUrl) return "";
  
  // Remove ipfs:// prefix
  const cidPath = ipfsUrl.replace("ipfs://", "");
  
  return `https://ipfs.skatehive.app/ipfs/${cidPath}`;
}
