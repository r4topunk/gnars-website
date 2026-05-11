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

/**
 * Upload a file to Pinata via presigned URL.
 *
 * Flow:
 * 1. Request a presigned upload URL from our API route (small JSON request)
 * 2. Upload the file directly from the browser to Pinata (bypasses Vercel's ~4.5MB limit)
 *
 * This replaces the old proxy approach where the file was sent through
 * our API route, which failed on Vercel due to serverless body size limits.
 */
export async function uploadToPinata(
  file: File,
  name?: string,
  onProgress?: (progress: number) => void,
): Promise<PinataUploadResponse> {
  try {
    // Step 1: Get a presigned upload URL from our server
    const signedUrlResponse = await fetch("/api/pinata/signed-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: name || file.name,
        mimeType: file.type,
      }),
    });

    if (!signedUrlResponse.ok) {
      const err = await signedUrlResponse.json().catch(() => ({}));
      return {
        success: false,
        error: (err as { error?: string }).error || "Failed to get upload URL",
      };
    }

    const signedUrlResult = await signedUrlResponse.json();
    const signedUrl: string | undefined = signedUrlResult.data;

    if (!signedUrl) {
      return {
        success: false,
        error: "No signed URL returned from server",
      };
    }

    // Step 2: Upload file directly to Pinata using the presigned URL
    const formData = new FormData();
    formData.append("file", file);
    formData.append("network", "public");
    if (name) {
      formData.append("name", name);
    }

    // Use XMLHttpRequest when progress tracking is needed, fetch otherwise
    let result: PinataUploadResponse;

    if (onProgress) {
      result = await uploadWithProgress(
        signedUrl,
        formData,
        name || file.name,
        file.size,
        onProgress,
      );
    } else {
      result = await uploadWithFetch(signedUrl, formData, name || file.name, file.size);
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
 * Upload using fetch (simpler, no progress tracking)
 */
async function uploadWithFetch(
  url: string,
  formData: FormData,
  name: string,
  size: number,
): Promise<PinataUploadResponse> {
  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Pinata direct upload error:", errorText);
    return {
      success: false,
      error: `Upload failed with status ${response.status}`,
    };
  }

  const result = await response.json();
  return parsePinataResponse(result, name, size);
}

/**
 * Upload using XMLHttpRequest (supports progress tracking for large files)
 */
function uploadWithProgress(
  url: string,
  formData: FormData,
  name: string,
  size: number,
  onProgress: (progress: number) => void,
): Promise<PinataUploadResponse> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText);
          resolve(parsePinataResponse(result, name, size));
        } catch {
          resolve({
            success: false,
            error: "Failed to parse upload response",
          });
        }
      } else {
        console.error("Pinata direct upload error:", xhr.responseText);
        resolve({
          success: false,
          error: `Upload failed with status ${xhr.status}`,
        });
      }
    });

    xhr.addEventListener("error", () => {
      resolve({ success: false, error: "Network error during upload" });
    });

    xhr.addEventListener("abort", () => {
      resolve({ success: false, error: "Upload was cancelled" });
    });

    xhr.open("POST", url);
    xhr.send(formData);
  });
}

/**
 * Parse the Pinata v3 API response into our standard format.
 */
function parsePinataResponse(
  result: { data?: { id?: string; cid?: string; name?: string; size?: number } },
  fallbackName: string,
  fallbackSize: number,
): PinataUploadResponse {
  const cid = result.data?.cid;

  if (!cid) {
    return {
      success: false,
      error: "No CID returned from Pinata",
    };
  }

  return {
    success: true,
    data: {
      id: result.data?.id || "",
      cid,
      name: result.data?.name || fallbackName,
      size: result.data?.size || fallbackSize,
      ipfsUrl: `ipfs://${cid}`,
      gatewayUrl: `https://ipfs.skatehive.app/ipfs/${cid}`,
    },
  };
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
