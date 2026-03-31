import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Gnars Challenge';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image({
  params,
}: {
  params: Promise<{ chainId: string; id: string }>;
}) {
  const { chainId, id } = await params;

  // Fetch bounty data
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://gnars.com';
  let bountyTitle = 'Challenge';
  let bountyAmount = '0 ETH';

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
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          padding: 60,
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 100,
            marginBottom: 30,
          }}
        >
          🏆
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 'bold',
            color: 'white',
            marginBottom: 20,
            textAlign: 'center',
            maxWidth: 1000,
            lineHeight: 1.2,
          }}
        >
          {bountyTitle}
        </div>
        <div
          style={{
            fontSize: 48,
            color: 'rgba(255,255,255,0.95)',
            fontWeight: 'bold',
          }}
        >
          {bountyAmount}
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
