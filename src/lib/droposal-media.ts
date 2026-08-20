import { ipfsToHttp } from "@/lib/ipfs";

const SKATEHIVE_IPFS_GATEWAY = "https://ipfs.skatehive.app/ipfs";

export const OPTIMIZED_DROPOSAL_VIDEO_CID_BY_ORIGINAL_CID = {
  Qmak7m8x3ckbkM8YrghZRWm7zBqSUiYoCySdJ6bEwKuDRX:
    "bafybeid4f7v6yez2ibuay4kbmiuky44tph3gn32rnczkcmvno6nbjd7ykm",
  QmVF2BjJvA2MnjWuuNbUEAbMuzQD8JFks83TR6MdSgNY2e:
    "bafybeiazfjbov4ag7t6h7d77s2mokjsvz2dxyixogm7l5ptbrrg6qjxn7e",
  QmbHbVzFTNSFpFUXHyKBrtGfJ3era6SpkQBjEEpzapeNex:
    "bafybeibohdmwemv2gdgegiqi3jhajo3z2ejz5o7q7rynkvi7wiihvl245u",
  Qmcj9mcaXkiNU8s3KCY9JMVAhacFJZvUXngYbPVx44R8uG:
    "bafybeidkmzaygivag7xekzmvtohkkbqwt7zud6lxqwtkt35hdvbaptpn3u",
  QmfQydzfV5i3JgQ4SDQ3XXkBy4mDBufAJjD596NxPvwMfs:
    "bafybeifdwbkhaugqjjlhkiiqza2h7i2k5srhkfakyvbsio3ppf2s7mqleu",
  QmTu1QGDSQzrJAULeiKNGVxpEbiTw5Z6FDonNyrQ3H7bZ7:
    "bafybeicfqryhrlawk4uhgopnstld77sm2ddqykrqs3tz4fwfwaju3llt2e",
} as const satisfies Readonly<Record<string, string>>;

type OptimizedDroposalSourceCid = keyof typeof OPTIMIZED_DROPOSAL_VIDEO_CID_BY_ORIGINAL_CID;

function extractIpfsCid(uri: string): string | undefined {
  const trimmedUri = uri.trim();
  const ipfsPath = trimmedUri.startsWith("ipfs://")
    ? trimmedUri.slice("ipfs://".length)
    : trimmedUri.includes("/ipfs/")
      ? trimmedUri.split("/ipfs/")[1]
      : undefined;

  return ipfsPath?.split(/[/?#]/, 1)[0] || undefined;
}

function hasOptimizedDroposalVideo(cid: string): cid is OptimizedDroposalSourceCid {
  return cid in OPTIMIZED_DROPOSAL_VIDEO_CID_BY_ORIGINAL_CID;
}

export function resolveDroposalPlaybackUrl(animationUri: string): string {
  const originalCid = extractIpfsCid(animationUri);
  if (!originalCid || !hasOptimizedDroposalVideo(originalCid)) {
    return ipfsToHttp(animationUri);
  }

  const optimizedCid = OPTIMIZED_DROPOSAL_VIDEO_CID_BY_ORIGINAL_CID[originalCid];
  return `${SKATEHIVE_IPFS_GATEWAY}/${optimizedCid}`;
}
