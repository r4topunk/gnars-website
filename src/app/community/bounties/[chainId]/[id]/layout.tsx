import { Metadata } from 'next';
import { CHAIN_NAMES } from '@/lib/poidh/config';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chainId: string; id: string }>;
}): Promise<Metadata> {
  const { chainId, id } = await params;
  const chainName = CHAIN_NAMES[parseInt(chainId) as keyof typeof CHAIN_NAMES] || 'Unknown';

  // Fetch bounty data for metadata
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://gnars.com';
  let bountyTitle = 'Challenge';
  let bountyDescription = 'Gnarly challenge from the action sports community';
  let bountyAmount = '0 ETH';

  try {
    const res = await fetch(`${baseUrl}/api/poidh/bounty/${chainId}/${id}`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const data = await res.json();
      bountyTitle = data.bounty?.title || data.bounty?.name || 'Challenge';
      bountyDescription = data.bounty?.description?.substring(0, 200) || bountyDescription;
      const amount = data.bounty?.amount;
      if (amount) {
        const ethAmount = (parseFloat(amount) / 1e18).toFixed(4);
        bountyAmount = `${ethAmount} ETH`;
      }
    }
  } catch {
    // Fallback to defaults
  }

  const pageUrl = `https://gnars.com/community/bounties/${chainId}/${id}`;
  const ogImageUrl = `https://gnars.com/community/bounties/${chainId}/${id}/opengraph-image`;

  return {
    title: `${bountyTitle} - Gnars Challenges`,
    description: `${bountyAmount} bounty on ${chainName}: ${bountyDescription}`,
    openGraph: {
      title: bountyTitle,
      description: `${bountyAmount} bounty on ${chainName}`,
      type: 'website',
      url: pageUrl,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: bountyTitle,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: bountyTitle,
      description: `${bountyAmount} bounty on ${chainName}`,
      images: [ogImageUrl],
    },
    other: {
      'fc:frame': JSON.stringify({
        version: 'next',
        imageUrl: ogImageUrl,
        button: {
          title: 'View Challenge',
          action: {
            type: 'launch_frame',
            name: bountyTitle,
            url: pageUrl,
            splashImageUrl: ogImageUrl,
          },
        },
      }),
    },
  };
}

export default function BountyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
