import { NextRequest, NextResponse } from 'next/server';
import { matchesGnarsKeywords } from '@/lib/poidh/keywords';
import { SUPPORTED_CHAINS } from '@/lib/poidh/config';
import type { PoidhBounty } from '@/types/poidh';

const POIDH_API = 'https://poidh.xyz/api/trpc/bounties.fetchAll';
const CACHE_TTL = 60 * 15; // 15 minutes

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'open';
  const limit = parseInt(searchParams.get('limit') || '100', 10);
  const filterGnarly = searchParams.get('filterGnarly') !== 'false'; // default true

  try {
    const input = JSON.stringify({
      json: { status, sortType: 'date', limit }
    });
    
    const url = `${POIDH_API}?input=${encodeURIComponent(input)}`;
    const res = await fetch(url, { 
      next: { revalidate: CACHE_TTL },
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!res.ok) {
      throw new Error(`POIDH API error: ${res.status}`);
    }

    const data = await res.json();
    const bounties: PoidhBounty[] = data.result?.data?.json?.bounties || [];

    // Filter: supported chains + optionally gnars keywords
    const supportedChainIds: number[] = Object.values(SUPPORTED_CHAINS);
    const filtered = bounties.filter((bounty) => {
      const chainMatch = supportedChainIds.includes(bounty.chainId);
      if (!chainMatch) return false;

      if (filterGnarly) {
        const keywordMatch = matchesGnarsKeywords(
          `${bounty.name} ${bounty.description}`
        );
        return keywordMatch;
      }

      return true;
    });

    return NextResponse.json({ 
      bounties: filtered,
      total: filtered.length,
      cached: true,
    });
  } catch (error) {
    console.error('POIDH API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bounties', details: (error as Error).message },
      { status: 500 }
    );
  }
}
