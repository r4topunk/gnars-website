import { ipfsToHttp } from "@/lib/ipfs";

type OgImageOptions = {
  width?: number;
  height?: number;
  fit?: "cover" | "contain";
};

export function toOgImageUrl(rawUrl?: string | null, options: OgImageOptions = {}): string | null {
  if (!rawUrl) return null;

  const width = options.width ?? 600;
  const height = options.height ?? 600;
  const fit = options.fit ?? "cover";

  const httpUrl = ipfsToHttp(rawUrl);
  if (!httpUrl) return null;

  const encoded = encodeURIComponent(httpUrl);
  return `https://wsrv.nl/?url=${encoded}&w=${width}&h=${height}&fit=${fit}&output=png`;
}
