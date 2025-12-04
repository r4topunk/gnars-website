import { Metadata } from "next";
import { getCoin, setApiKey } from "@zoralabs/coins-sdk";
import { GnarsTVFeed } from "@/components/tv/GnarsTVFeed";
import { TV_MINIAPP_EMBED_CONFIG } from "@/lib/miniapp-config";

export const dynamic = "force-dynamic";

type Props = {
  params: { coinAddress: string };
};

// Helper to fetch coin metadata for OG tags
async function getCoinMetadata(coinAddress: string) {
  try {
    if (process.env.NEXT_PUBLIC_ZORA_API_KEY) {
      setApiKey(process.env.NEXT_PUBLIC_ZORA_API_KEY);
    }

    // Fetch the specific coin directly by address
    const response = await getCoin({
      address: coinAddress,
      chain: 8453, // Base mainnet
    });

    const coin = response?.data?.zora20Token;

    if (coin) {
      const media = coin?.mediaContent;
      const previewImage = media?.previewImage;
      const imageUrl =
        typeof previewImage === "object"
          ? previewImage?.medium || previewImage?.small
          : previewImage;

      return {
        name: coin?.name || "Gnars Coin",
        symbol: coin?.symbol || "",
        imageUrl: imageUrl || "",
        description: `Watch ${coin?.name || "this coin"} on Gnars TV`,
      };
    }

    return null;
  } catch (error) {
    console.error("💥 [TV Slug] Error fetching coin metadata:", error);
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { coinAddress } = await params;

  const metadata = await getCoinMetadata(coinAddress);

  if (!metadata) {
    return {
      title: "Gnars TV",
      description: "Watch Gnars content on Gnars TV",
    };
  }

  // Convert IPFS to HTTP
  const imageUrl = metadata.imageUrl?.startsWith("ipfs://")
    ? metadata.imageUrl.replace("ipfs://", "https://ipfs.io/ipfs/")
    : metadata.imageUrl;

  const miniappEmbed = {
    ...TV_MINIAPP_EMBED_CONFIG,
    imageUrl: imageUrl || TV_MINIAPP_EMBED_CONFIG.imageUrl,
    button: {
      ...TV_MINIAPP_EMBED_CONFIG.button,
      action: {
        ...TV_MINIAPP_EMBED_CONFIG.button.action,
        url: `https://gnars.com/tv/${coinAddress}`,
      },
    },
  };

  return {
    title: `${metadata.name} | Gnars TV`,
    description: metadata.description,
    openGraph: {
      title: `${metadata.name} | Gnars TV`,
      description: metadata.description,
      images: imageUrl ? [{ url: imageUrl }] : [],
      type: "video.other",
    },
    twitter: {
      card: "summary_large_image",
      title: `${metadata.name} | Gnars TV`,
      description: metadata.description,
      images: imageUrl ? [imageUrl] : [],
    },
    // Farcaster Frame metadata + mini app embed with coin thumbnail
    other: {
      "fc:frame": "vNext",
      "fc:frame:image": imageUrl || "",
      "fc:frame:button:1": "Watch on Gnars TV",
      "fc:frame:button:1:action": "link",
      "fc:frame:button:1:target": `https://gnars.com/tv/${coinAddress}`,
      "fc:miniapp": JSON.stringify(miniappEmbed),
    },
  };
}

export default async function TVCoinPage({ params }: Props) {
  const { coinAddress } = await params;
  return <GnarsTVFeed priorityCoinAddress={coinAddress} />;
}
