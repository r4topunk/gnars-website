export function ipfsToHttp(ipfsUri: string): string {
  if (!ipfsUri) return "";
  const uri = ipfsUri.trim();
  if (uri.startsWith("ipfs://")) {
    const path = uri.replace("ipfs://", "");
    return `https://ipfs.io/ipfs/${path}`;
  }
  if (uri.includes("/ipfs/")) {
    const [, path] = uri.split("/ipfs/");
    return `https://ipfs.io/ipfs/${path}`;
  }
  return uri;
}
