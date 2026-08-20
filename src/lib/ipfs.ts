// IPFS gateway resolution — single source of truth.
//
// Gateways are ordered by how reliably they serve the media Gnars actually
// shows. Droposals are Zora drops, so their media is pinned on Zora's own
// content gateway → it leads. Pinata's public gateway is a strong, CORS-enabled
// second. The SkateHive gateway only resolves CIDs pinned there, so it's the
// last resort (harmless when it 403s — the chain moves on).
//
// ipfs.io and dweb.link were intentionally removed: as of 2026 both return
// 403/301 for Zora-hosted CIDs, which is exactly what broke droposal video on
// the homepage TV (raw `ipfs://` URIs were being pointed at those dead gateways).
// Both leading gateways send `Access-Control-Allow-Origin` and `Accept-Ranges`,
// which the WebGL <video> texture (crossOrigin="anonymous") and seeking need.
export const IPFS_GATEWAYS = [
  "https://magic.decentralized-content.com/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://ipfs.skatehive.app/ipfs/",
] as const;

/** Extract the `<cid>/<path>` portion from an `ipfs://` URI or an existing `/ipfs/` gateway URL. */
function ipfsPath(uri: string): string | null {
  if (!uri) return null;
  const u = uri.trim();
  if (u.startsWith("ipfs://")) return u.slice("ipfs://".length);
  const i = u.indexOf("/ipfs/");
  if (i !== -1) return u.slice(i + "/ipfs/".length);
  return null;
}

/**
 * Convert an IPFS URI (or re-point an existing gateway URL) to the primary
 * gateway. Non-IPFS inputs pass through unchanged.
 */
export function ipfsToHttp(uri: string): string {
  const path = ipfsPath(uri);
  return path ? IPFS_GATEWAYS[0] + path : uri ?? "";
}

/**
 * Ordered list of gateway URLs to try for the same content, for
 * fallback-on-error playback/loading. Non-IPFS inputs return `[uri]`.
 */
export function ipfsCandidates(uri: string): string[] {
  const path = ipfsPath(uri);
  if (!path) return uri ? [uri] : [];
  return IPFS_GATEWAYS.map((g) => g + path);
}

/**
 * Given a gateway URL that just failed, return the next gateway to try for the
 * same content, or `null` when the chain is exhausted.
 */
export function nextIpfsGateway(currentUrl: string): string | null {
  const path = ipfsPath(currentUrl);
  if (!path) return null;
  const i = currentUrl.indexOf("/ipfs/");
  const base = i !== -1 ? currentUrl.slice(0, i + "/ipfs/".length) : "";
  const cur = IPFS_GATEWAYS.findIndex((g) => g === base);
  const nextIdx = cur === -1 ? 0 : cur + 1;
  return nextIdx < IPFS_GATEWAYS.length ? IPFS_GATEWAYS[nextIdx] + path : null;
}
