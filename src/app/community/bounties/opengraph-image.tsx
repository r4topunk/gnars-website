import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Gnars Challenges - Action Sports Bounties';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 120,
            marginBottom: 40,
          }}
        >
          🏆
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 'bold',
            color: 'white',
            marginBottom: 20,
          }}
        >
          Challenges
        </div>
        <div
          style={{
            fontSize: 32,
            color: 'rgba(255,255,255,0.9)',
            textAlign: 'center',
            maxWidth: 800,
          }}
        >
          Gnarly challenges from the action sports community
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
