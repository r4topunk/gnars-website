import { ImageResponse } from 'next/og';
import { OG_SIZE, OG_COLORS, OG_FONTS } from '@/lib/og-utils';

export const runtime = 'edge';
export const alt = 'Gnars Challenge';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({
  params,
}: {
  params: Promise<{ chainId: string; id: string }>;
}) {
  const { chainId, id } = await params;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://gnars.com';
  let bountyTitle = 'Challenge';
  let bountyAmount = '';

  try {
    const res = await fetch(`${baseUrl}/api/poidh/bounty/${chainId}/${id}`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const data = await res.json();
      bountyTitle = data.bounty?.title || data.bounty?.name || 'Challenge';
      const amount = data.bounty?.amount;
      if (amount) {
        const ethAmount = (parseFloat(amount) / 1e18).toFixed(4);
        bountyAmount = `${ethAmount} ETH`;
      }
    }
  } catch {
    // Fallback to defaults
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: OG_COLORS.background,
          fontFamily: OG_FONTS.family,
          padding: '60px',
        }}
      >
        <div
          style={{
            fontSize: 24,
            color: OG_COLORS.muted,
            marginBottom: '24px',
            letterSpacing: '0.1em',
          }}
        >
          GNARS CHALLENGE
        </div>
        <div
          style={{
            fontSize: bountyTitle.length > 60 ? 44 : 60,
            fontWeight: 800,
            color: OG_COLORS.foreground,
            textAlign: 'center',
            maxWidth: 1000,
            lineHeight: 1.2,
            marginBottom: '32px',
          }}
        >
          {bountyTitle}
        </div>
        {bountyAmount ? (
          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: OG_COLORS.accent,
            }}
          >
            {bountyAmount}
          </div>
        ) : null}
        <div
          style={{
            fontSize: 20,
            color: OG_COLORS.muted,
            marginTop: '48px',
          }}
        >
          gnars.com/community/bounties
        </div>
      </div>
    ),
    { ...size }
  );
}
