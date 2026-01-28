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

// Size threshold for switching to direct upload (4MB - below Vercel's 4.5MB limit)
const DIRECT_UPLOAD_THRESHOLD = 4 * 1024 * 1024;

/**
 * Upload a file to Pinata.
 * For small files (< 4MB): Uses the proxy API route
 * For large files (>= 4MB): Uses direct upload with signed URL to bypass Vercel limits
 */
export async function uploadToPinata(
  file: File,
  name?: string,
  onProgress?: (progress: number) => void
): Promise<PinataUploadResponse> {
  // Use direct upload for large files (videos, etc.) to bypass Vercel payload limits
  if (file.size >= DIRECT_UPLOAD_THRESHOLD) {
    return uploadToPinataDirect(file, name, onProgress);
  }

  // Use proxy for small files (keeps existing behavior)
  return uploadToPinataProxy(file, name);
}

/**
 * Upload via API route proxy (for small files)
 */
async function uploadToPinataProxy(
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
 * Direct upload to Pinata using signed URL (for large files like videos)
 * This bypasses Vercel's serverless function payload limits
 */
async function uploadToPinataDirect(
  file: File,
  name?: string,
  onProgress?: (progress: number) => void
): Promise<PinataUploadResponse> {
  try {
    // Step 1: Get signed upload URL from our API
    const signedUrlResponse = await fetch("/api/pinata/signed-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: name || file.name,
        mimeType: file.type,
      }),
    });

    if (!signedUrlResponse.ok) {
      const error = await signedUrlResponse.json();
      return {
        success: false,
        error: error.error || "Failed to get upload URL",
      };
    }

    const signedUrlResult = await signedUrlResponse.json();
    const signedUrl = signedUrlResult.data?.url;

    if (!signedUrl) {
      return {
        success: false,
        error: "No signed URL returned",
      };
    }

    // Step 2: Upload directly to Pinata using the signed URL
    const formData = new FormData();
    formData.append("file", file);
    formData.append("network", "public");
    if (name) {
      formData.append("name", name);
    }

    // Use XMLHttpRequest for progress tracking on large files
    const uploadResult = await new Promise<PinataUploadResponse>((resolve) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            resolve({
              success: true,
              data: {
                id: result.data?.id || "",
                cid: result.data?.cid || "",
                name: result.data?.name || name || file.name,
                size: result.data?.size || file.size,
                ipfsUrl: `ipfs://${result.data?.cid}`,
                gatewayUrl: `https://ipfs.skatehive.app/ipfs/${result.data?.cid}`,
              },
            });
          } catch {
            resolve({
              success: false,
              error: "Failed to parse upload response",
            });
          }
        } else {
          resolve({
            success: false,
            error: `Upload failed with status ${xhr.status}`,
          });
        }
      });

      xhr.addEventListener("error", () => {
        resolve({
          success: false,
          error: "Network error during upload",
        });
      });

      xhr.addEventListener("abort", () => {
        resolve({
          success: false,
          error: "Upload was cancelled",
        });
      });

      xhr.open("POST", signedUrl);
      xhr.send(formData);
    });

    return uploadResult;
  } catch (error) {
    console.error("Direct upload error:", error);
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
