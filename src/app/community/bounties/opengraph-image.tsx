import { ImageResponse } from 'next/og';
import { OG_SIZE, OG_COLORS, OG_FONTS } from '@/lib/og-utils';

export const runtime = 'edge';
export const alt = 'Gnars Challenges - Action Sports Bounties';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
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
            fontSize: 28,
            color: OG_COLORS.muted,
            marginBottom: '16px',
            letterSpacing: '0.1em',
          }}
        >
          GNARS DAO
        </div>
        <div
          style={{
            fontSize: 96,
            fontWeight: 800,
            color: OG_COLORS.accent,
            marginBottom: '24px',
            lineHeight: 1,
          }}
        >
          Challenges
        </div>
        <div
          style={{
            fontSize: 36,
            color: OG_COLORS.foreground,
            textAlign: 'center',
            maxWidth: 800,
          }}
        >
          Prove it. Earn ETH. Gnarly challenges from the action sports community.
        </div>
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
